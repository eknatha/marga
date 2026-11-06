---
title: Kafka: producers, consumers and consumer groups
minutes: 14
summary: Configure producers for durability and throughput, consumers for safe offset commits, and understand how consumer groups share partitions.
---

Kafka clients carry much of the responsibility. A producer decides how durable a write must be; a consumer decides when its progress is saved. Wrong defaults in either quietly lose or repeat data.

## What you will learn

- Producer acknowledgements, idempotence and batching
- The consumer poll loop and offset commits
- Consumer groups, assignment and rebalances
- Settings that reduce rebalance trouble

## Producer settings

```properties
acks=all                    # wait for all in-sync replicas
enable.idempotence=true     # no duplicates from producer retries
retries=2147483647
delivery.timeout.ms=120000
linger.ms=10                # wait a little to build bigger batches
batch.size=65536
compression.type=lz4
```

`acks=all` with `min.insync.replicas=2` means a record is acknowledged only after at least two replicas have it. `enable.idempotence` lets the broker discard duplicates caused by retries. Batching and compression raise throughput at the cost of a few milliseconds.

## The consumer loop

```python
consumer = KafkaConsumer('orders', group_id='invoicer', enable_auto_commit=False)
for batch in consumer:
    handle(batch)            # do the work first
    consumer.commit()        # then record progress
```

Auto-commit can commit offsets for records you have not finished. Commit after processing for **at-least-once**; make `handle` idempotent so a replay after a crash is safe.

## Consumer groups and rebalances

All consumers with the same `group.id` share a topic: a **group coordinator** broker assigns each partition to one member. When a member joins, leaves or stops sending heartbeats, the group **rebalances** and partitions move. During a classic rebalance, consumption pauses. Reduce the pain with `session.timeout.ms` and `max.poll.interval.ms` set to match real processing time, cooperative rebalancing, and **static membership** (`group.instance.id`) so a quick restart does not trigger a rebalance.

```diagram
title: A consumer group sharing partitions
node: topic | Topic with 6 partitions | 0 | 1 | The data to be read. | A hot partition makes one consumer slower than the rest. | queue
node: coord | Group coordinator | 1 | 0 | Assigns partitions and tracks heartbeats. | If it is slow, rebalances take longer.
node: c1 | Consumer 1 | 2 | 0 | Reads partitions 0 to 2. | If it stalls, the group sees lag on its partitions.
node: c2 | Consumer 2 | 2 | 1 | Reads partitions 3 to 5. | A crash triggers a rebalance for the whole group.
node: off | Committed offsets | 1 | 1 | The saved position for each partition. | Committing early loses records; late repeats them. | store
edge: coord | c1
edge: coord | c2
edge: topic | c1
edge: topic | c2
edge: c1 | off
```

## Incident: Committed before it was done

> **Incident:** Offsets were auto-committed while a batch was still processing, and a crash lost 800 records.

```console
$ kafka-consumer-groups.sh --describe --group invoicer
orders 0  CURRENT-OFFSET 5000  LOG-END-OFFSET 5000  LAG 0
$ psql -c "select count(*) from invoices"
4200
```

Lag showed zero, which looked healthy, but 800 records had been marked as read and never processed. The team moved to manual commits after the write and added a count check between topic and table.

## Common mistakes

- Leaving enable.auto.commit on with slow processing
- acks=1 for data that must not be lost
- A poll interval shorter than the processing time, causing endless rebalances
- Running more consumers than partitions

```quiz
Q: When should a consumer commit offsets for at-least-once?
+ After processing
- Before reading :: No.
- Never :: No.
- At startup only :: No.
> Processing first means a crash causes a replay, not loss.

Q: What does acks=all mean?
+ Wait for all in-sync replicas
- Do not wait :: No.
- Wait for the consumer :: No.
- Compress records :: No.
> Safest write acknowledgement.

Q: What triggers a rebalance?
+ A member joining, leaving or timing out
- A new key :: No.
- A larger record :: No.
- A DNS change :: No.
> Group membership change.

Q: What is static membership for?
+ Avoiding rebalances on quick restarts
- Faster disks :: No.
- Encryption :: No.
- Larger batches :: No.
> A stable instance id keeps partitions.
```

```cards
Consumer group :: Consumers sharing the partitions of a topic
Rebalance :: Reassigning partitions among group members
Commit :: Saving a consumer's position
Idempotent producer :: A producer whose retries cannot create duplicates
Lag :: How far a consumer is behind the end of a partition
```
