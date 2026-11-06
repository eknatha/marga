---
title: Debugging messaging incidents
minutes: 14
summary: Work through a fixed checklist for backlogs, duplicates, lost messages, ordering bugs and stuck consumers across queues and logs.
---

When a message system misbehaves, the symptom is rarely where the cause is. A queue that grows is a consumer problem; missing data may be a routing or retention problem; duplicates are normal until they are not handled. A checklist per symptom keeps you from changing the wrong thing.

## What you will learn

- A checklist for backlog and lag
- A checklist for lost, duplicated and out-of-order messages
- Tracing one message end to end
- What to put in dashboards and alerts

## Backlog or lag is growing

1. Are consumers running and connected? (consumer count, group state)
2. Is each consumer making progress? (processing time, errors, rebalance loop)
3. Did the producer rate jump? (publish rate, a retry storm)
4. Is the work stuck on a dependency? (database, API, lock)
5. Is it one partition or queue? (key skew, one broker)

## Messages are missing

1. Was the message accepted? (publisher confirm, `acks`, producer errors)
2. Was it routed? (binding, topic and subscription filters, exchange alternate)
3. Is it still retained? (retention time, queue TTL, compaction)
4. Was it acknowledged too early? (auto-ack, commit before processing)
5. Did a failover lose it? (acks=1, non-durable queue, unclean election)

## Duplicates and ordering

Duplicates come from redelivery after a crash or timeout, producer retries and rebalances. The cure is an idempotent consumer, not trying to eliminate them. Out-of-order arrival comes from several partitions or queues, concurrent consumers and retries. Cure by key, one consumer per partition, or sequence numbers checked by the consumer.

## Trace one message

Every message needs a stable **id** that appears in producer logs, broker headers, consumer logs and the database write. With it, one search shows where the message stopped. Add the id to your trace and log format from the start.

```diagram
title: Following a message
node: prod | Producer log | 0 | 0 | Logs the message id and confirmation. | Missing confirmations mean it may never have been stored.
node: broker | Broker metrics | 1 | 0 | Shows accepted, routed, unroutable and retained counts. | An exchange with no binding drops messages silently. | queue
node: cons | Consumer log | 2 | 0 | Logs receipt, success, failure and ack of the id. | No log line for the id means it never arrived.
node: db | Database effect | 3 | 0 | The row or call that proves the work happened. | A row without a log line means the logs are incomplete. | store
node: dlq | Dead letters | 2 | 1 | Collects messages that failed repeatedly. | Unwatched dead letters hide the problem. | observe
edge: prod | broker
edge: broker | cons
edge: cons | db
edge: cons | dlq
```

## Incident: The orders that vanished

> **Incident:** Some orders never appeared in reports, and nobody could say where they stopped.

```console
producer.log: published order=7731 key=order.created.us
consumer.log: (no entries for order=7731)
broker: exchange events unroutable_dropped 212
```

Orders for one region used a key no binding matched. Following one id showed it stopped at the exchange. The team added a binding, an alternate exchange for unroutable messages and an alert on dropped count.

## Common mistakes

- Searching consumer code before checking whether the broker accepted the message
- Logging without a message id
- Treating duplicates as a bug in the broker
- Ignoring the dead-letter queue until a customer complains

```quiz
Q: A queue grows steadily. What do you check first?
+ Whether consumers are running and progressing
- The TLS certificate :: No.
- Disk labels :: No.
- DNS records :: No.
> Backlog is almost always a consumer problem.

Q: Why add a message id to every log line?
+ To follow one message through every step
- To encrypt logs :: No.
- To speed up the broker :: No.
- To limit retries :: No.
> A stable id makes tracing easy.

Q: Messages sent but never received, no errors. What might be wrong?
+ Routing: no binding or subscription matched
- A long password :: No.
- A large disk :: No.
- A slow DNS :: No.
> Unroutable messages may be dropped.

Q: How do you handle duplicates?
+ Make consumers idempotent
- Disable the network :: No.
- Delete the broker :: No.
- Use shorter ids :: No.
> Duplicates are normal; handle them.
```

```cards
Message id :: A stable identifier carried by a message through every hop
Unroutable :: A message that matched no binding or subscription
Dead-letter queue :: A place for messages that keep failing
Backlog :: Messages waiting because consumers are slower than producers
Traceability :: Being able to follow one item through a system
```
