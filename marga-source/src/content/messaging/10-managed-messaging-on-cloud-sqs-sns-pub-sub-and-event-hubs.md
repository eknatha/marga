---
title: Managed messaging on the cloud
minutes: 13
summary: Compare SQS and SNS, Google Pub/Sub, Azure Service Bus and Event Hubs, and managed Kafka, and choose between running a broker and renting one.
---

Every major cloud offers messaging as a service. They look similar from far away and differ in ordering, retention, replay and price. Picking from the map of equivalents, then checking the limits that matter to you, keeps both cost and operating work low.

## What you will learn

- Queue, topic and stream services on each cloud
- Ordering, retention, replay and delivery per service
- Dead-letter queues and visibility timeouts
- Managed Kafka and when to run your own

## The map

| Need | AWS | Google Cloud | Azure |
|---|---|---|---|
| Work queue | SQS | Pub/Sub (pull subscription) | Service Bus queue |
| Fan-out topic | SNS | Pub/Sub topic | Service Bus topic |
| Partitioned log, replay | Kinesis | Pub/Sub with seek, or Managed Kafka | Event Hubs |
| Managed Kafka | MSK | Managed Service for Apache Kafka | Event Hubs Kafka endpoint |

## Things that differ

- **Ordering:** SQS standard is best-effort ordered; FIFO queues order by message group id with lower throughput. Pub/Sub offers ordering keys. Service Bus uses sessions. Event Hubs and Kinesis order within a partition or shard.
- **Delivery:** SQS standard, SNS and Pub/Sub are at-least-once, so consumers must be idempotent. FIFO queues can deduplicate within a window.
- **Retention and replay:** queues delete after handling; logs and Pub/Sub (with retained messages and seek) allow replay for a set time.
- **Failure handling:** use **dead-letter queues** with a maximum receive count, and set the **visibility timeout** (SQS) or acknowledgement deadline longer than processing time, otherwise a message is delivered to a second consumer while the first is still working.
- **Cost:** most services charge per request or per throughput unit; many small messages can cost more than one large batch.

## Fan-out pattern

A common design: publish once to a topic (SNS or Pub/Sub), and attach a queue per consumer so each system reads at its own speed with its own dead-letter queue.

```diagram
title: Fan-out with managed services
node: svc | Producer service | 0 | 1 | Publishes an event once to a topic. | Large messages hit size limits; send a pointer to data instead.
node: topic | Topic | 1 | 1 | SNS or Pub/Sub topic that copies the event to subscriptions. | A missing subscription means that consumer misses events. | queue
node: qa | Billing queue | 2 | 0 | Its own queue and dead-letter queue. | Visibility timeout shorter than the work causes duplicates. | queue
node: qb | Search queue | 2 | 1 | Independent speed and retry policy. | An unwatched dead-letter queue hides failures. | queue
node: dlq | Dead-letter queue | 3 | 0 | Collects messages that exceed the receive count. | Without an alert it silently fills. | observe
edge: svc | topic
edge: topic | qa
edge: topic | qb
edge: qa | dlq
```

## Run it yourself or rent it

Run Kafka yourself when you need its ecosystem, very high throughput, long replay or low cost at large scale, and you have people to operate it. Otherwise choose the managed service closest to your cloud. Wrap the client in a small interface so a later move is possible.

## Incident: Duplicates after a slow job

> **Incident:** A queue message was delivered twice because processing took longer than the visibility timeout.

```console
$ aws sqs get-queue-attributes --queue-url $Q --attribute-names VisibilityTimeout
VisibilityTimeout: 30
worker log: job 8812 took 95s
worker log: message received 3 times
```

The message became visible again after 30 seconds and another worker picked it up. The team raised the timeout above the longest job, extended it during long jobs, added a dead-letter queue and made the job idempotent.

## Common mistakes

- A visibility timeout shorter than the longest job
- No dead-letter queue or no alert on it
- Treating standard queues as ordered
- Choosing self-managed Kafka for a small workload

```quiz
Q: What does the SQS visibility timeout control?
+ How long a received message is hidden from other consumers
- Message size :: No.
- Retention :: No.
- Encryption :: No.
> If work outlasts it, the message is delivered again.

Q: Which pattern fans an event out to several queues?
+ A topic with a queue per consumer
- One shared queue :: No.
- Direct calls :: No.
- A cache :: No.
> Each consumer gets its own queue.

Q: Which Azure service is a partitioned event log?
+ Event Hubs
- Service Bus queue :: No.
- Blob storage :: No.
- Key Vault :: No.
> Event Hubs resembles Kafka and Kinesis.

Q: Why use a dead-letter queue?
+ To collect messages that keep failing
- To speed delivery :: No.
- To encrypt messages :: No.
- To order messages :: No.
> It isolates poison messages.
```

```cards
SQS :: AWS managed queue service
SNS :: AWS managed publish-subscribe topics
Pub/Sub :: Google Cloud's messaging service
Event Hubs :: Azure's partitioned event streaming service
Visibility timeout :: Time a received message is hidden from other consumers
```
