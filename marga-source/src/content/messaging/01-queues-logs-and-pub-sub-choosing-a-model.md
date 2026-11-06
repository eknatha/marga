---
title: Queues, logs and pub/sub: choosing a model
minutes: 12
summary: Compare work queues, publish-subscribe topics and append-only logs, and choose the right messaging model for a job.
---

Messaging is how services talk without waiting for each other. The three common shapes behave very differently under load, failure and change, so the first decision is the model, not the product.

## What you will learn

- Work queues, publish-subscribe and logs
- What each model keeps and for how long
- Questions that decide the model
- Where messaging helps and where it hurts

## Three shapes

A **work queue** holds jobs. Each message goes to exactly one worker and is removed when handled. Use it to spread work (send an email, resize an image). **Publish-subscribe** copies each message to every subscriber, so one event reaches billing, search and analytics. A **log** appends messages in order and keeps them for a set time or size. Consumers remember their own position (offset), so they can read at different speeds, join later and replay.

| | Queue | Pub/sub topic | Log |
|---|---|---|---|
| Delivery | One consumer per message | Every subscriber | Every consumer group, by position |
| After reading | Message removed | Usually removed | Kept until retention ends |
| Replay | No | No | Yes |
| Typical tools | RabbitMQ, SQS | SNS, Cloud Pub/Sub | Kafka, Kinesis, Event Hubs |

## Why use messaging

It decouples senders from receivers in time (the receiver can be down), in speed (a buffer absorbs bursts) and in knowledge (the sender need not know who reads). The price is delay, more moving parts and new failure modes: duplicates, reordering, and a backlog that hides a failing consumer.

```diagram
title: Three messaging shapes
node: prod | Producer | 0 | 1 | Sends messages without waiting for the reader. | If it cannot reach the broker it needs a retry or buffer.
node: queue | Work queue | 1 | 0 | One message goes to one worker, then is removed. | A growing queue means workers are too slow or failing. | queue
node: topic | Pub/sub topic | 1 | 1 | Copies each message to every subscriber. | A slow subscriber can lose messages if there is no buffer. | queue
node: log | Log with offsets | 1 | 2 | Keeps ordered messages; readers track their position. | Retention too short means a late reader misses data. | queue
node: cons | Consumers | 2 | 1 | Process messages at their own pace. | A consumer that fails silently lets the backlog grow.
edge: prod | queue
edge: prod | topic
edge: prod | log
edge: queue | cons
edge: topic | cons
edge: log | cons
```

## Choosing

Ask: Does each message need handling once by one worker (queue)? Must several systems each see every message (topic or log)? Will anyone need to replay history, rebuild a view or fix a bug by reprocessing (log)? How many messages per second, and how long must they live? Small teams with modest volume are often well served by a managed queue; high-volume event streams and replay point to a log.

## Incident: The data that could not be replayed

> **Incident:** A bug in a consumer corrupted a week of derived data, and the source messages were already deleted from the queue.

```console
$ rabbitmqctl list_queues name messages
orders   0
$ psql -c "select count(*) from order_totals where total < 0"
18422
```

The consumer had acked every message, so the broker kept nothing. The team moved the stream to a log with seven days of retention, fixed the consumer, and reprocessed from the offset before the bug started.

## Common mistakes

- Choosing a product before choosing the model
- Using a queue when many systems need the same events
- Treating a message broker as a database
- Ignoring what happens when the consumer is down for hours

```quiz
Q: Which model lets a new consumer replay old messages?
+ A log with retention
- A work queue :: No.
- A fire-and-forget call :: No.
- A cache :: No.
> Logs keep messages and offsets.

Q: In a work queue, how many consumers get each message?
+ One
- All :: No.
- None :: No.
- Two :: No.
> Each message goes to one worker.

Q: What does pub/sub deliver?
+ A copy to every subscriber
- Each message once overall :: No.
- Only the oldest message :: No.
- Nothing without polling :: No.
> Fan-out is its purpose.

Q: Why does messaging add failure modes?
+ Duplicates, reordering and hidden backlogs
- It removes all errors :: No.
- It needs no network :: No.
- It replaces tests :: No.
> Decoupling brings new problems.
```

```cards
Queue :: A buffer that gives each message to one consumer
Topic :: A named channel that copies messages to subscribers
Log :: An ordered, append-only store of messages with retention
Offset :: A consumer's position in a log
Backlog :: Messages waiting because consumers are slower than producers
```
