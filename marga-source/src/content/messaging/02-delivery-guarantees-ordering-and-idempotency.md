---
title: Delivery guarantees, ordering and idempotency
minutes: 13
summary: Understand at-most-once, at-least-once and effectively-once delivery, when ordering holds, and how idempotent consumers make duplicates harmless.
---

The hardest promises in messaging are about what happens on failure. A sender cannot know whether a message arrived if the acknowledgement was lost, so it must choose between sending again and risking a duplicate, or not sending and risking a loss.

## What you will learn

- At-most-once, at-least-once and exactly-once
- Where ordering is guaranteed and where it is not
- Idempotent consumers and idempotency keys
- The outbox pattern for sending messages reliably

## The three promises

- **At-most-once:** send and forget. No duplicates, but a lost message is gone.
- **At-least-once:** retry until acknowledged. No loss, but duplicates happen after a lost acknowledgement or a consumer crash.
- **Exactly-once:** each message has one effect. Brokers can offer it within their own system (Kafka transactions), but across a database and a broker it is achieved by making the **effect** idempotent.

Most production systems run at-least-once and make handlers safe to repeat.

## Ordering

Messages are ordered only within a single queue or **partition**. Two consumers on one queue may finish out of order, and retries reorder messages. To keep related messages in order, send them with the same **key** (an order id) so they land in the same partition, and process each partition sequentially.

## Idempotent consumers

```sql
-- processed_messages(message_id primary key)
begin;
insert into processed_messages(message_id) values ('evt-7f3a')
  on conflict do nothing;
-- if 0 rows were inserted, the message was already handled: skip
update accounts set balance = balance - 20 where id = 42;
commit;
```

Store the message id and the effect in one transaction. Or use naturally idempotent operations: `set status = 'shipped'` is safe to repeat, `balance = balance - 20` is not without a guard.

## The outbox pattern

Writing to the database and publishing to a broker are two actions that can half-fail. Write the event to an **outbox table** in the same transaction as the data change; a separate relay reads the table and publishes, retrying until the broker confirms.

```diagram
title: Safe sending and receiving
node: svc | Service | 0 | 0 | Changes data and writes an outbox row in one transaction. | Publishing directly can lose the event if the process dies between steps.
node: out | Outbox table | 1 | 0 | Holds events until they are published. | Without cleanup it grows forever. | store
node: relay | Relay | 2 | 0 | Publishes outbox rows to the broker and retries. | Retries cause duplicates, which the consumer must handle.
node: broker | Broker | 3 | 0 | Delivers at least once to consumers. | An acknowledgement lost on the way causes redelivery. | queue
node: cons | Idempotent consumer | 3 | 1 | Checks the message id before applying the effect. | Without the check a redelivery repeats the effect. | security
edge: svc | out
edge: out | relay
edge: relay | broker
edge: broker | cons
```

## Incident: Charged twice

> **Incident:** A payment consumer crashed after charging but before it acknowledged the message, so the broker redelivered it.

```console
payments.log: charge ok order=4411 amount=49.00
payments.log: consumer restarted
payments.log: charge ok order=4411 amount=49.00
support: 1 customer charged twice
```

The consumer had no record of what it had handled. The team added an idempotency key (the order id) to the payment call and a processed table, then refunded the duplicates found by a one-off query.

## Common mistakes

- Assuming exactly-once because the broker advertises it
- Acknowledging a message before the work is saved
- Relying on global ordering across partitions
- Publishing straight after a database commit with no outbox

```quiz
Q: What can happen with at-least-once delivery?
+ Duplicates
- Silent loss :: No.
- Time travel :: No.
- Encryption failure :: No.
> Retries cause repeats.

Q: How is ordering usually guaranteed?
+ Within a partition or queue, using a key
- Across the whole cluster :: No.
- Never :: No.
- By the network :: No.
> Related messages share a partition.

Q: What makes a consumer idempotent?
+ Handling a repeat without repeating the effect
- Running faster :: No.
- Deleting messages :: No.
- Using TLS :: No.
> It remembers or naturally ignores repeats.

Q: What problem does the outbox pattern solve?
+ Doing a database change and a publish reliably together
- Slow queries :: No.
- Broker upgrades :: No.
- TLS expiry :: No.
> Both actions share one transaction.
```

```cards
At-least-once :: Delivery that may repeat but does not lose messages
Idempotent :: Safe to apply more than once with the same result
Idempotency key :: An id that lets a repeated request be recognised
Partition key :: A value that decides which partition a message uses
Outbox :: A table of events written with the data and published later
```
