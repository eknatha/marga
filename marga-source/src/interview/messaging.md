## When would you choose a queue over a log such as Kafka?
level: junior
Choose a queue when each message is a job for one worker, you want simple routing, and you do not need replay. Choose a log when several systems read the same events at their own pace, order per key matters, or you need to replay history after a bug or for a new consumer.

## What does at-least-once delivery mean for your code?
level: junior
Messages are never silently lost but may arrive more than once, so handlers must be idempotent. Use an idempotency key or a processed-ids table, or make operations naturally repeatable, such as setting a status instead of adding to a balance.

## How does Kafka keep messages in order?
level: mid
Order is guaranteed only within a partition. Records with the same key hash to the same partition, so sending all events for one entity with the same key keeps them in order. Consumers in a group read one partition at a time.

## Explain acks, min.insync.replicas and replication factor together.
level: mid
Replication factor sets how many copies exist. With acks=all the leader waits until the in-sync replicas have the record, and min.insync.replicas sets how many must be in sync for a write to be accepted. For example, factor 3 with min 2 survives one broker loss without data loss or downtime and refuses writes if two are lost.

## A consumer group keeps rebalancing. What do you check?
level: senior
Look for consumers exceeding max.poll.interval.ms because batches take too long, unstable networks or pods that restart, and session timeouts that are too short. Reduce max.poll.records, raise the interval to match real processing time, use static membership and cooperative rebalancing, and fix slow downstream calls.

## How do you evolve a message format safely?
level: senior
Treat it as a public API. Use a schema with defaults and a registry that enforces compatibility. Add optional fields, never rename or retype in place, and use expand then contract for breaking changes. Run the compatibility check in CI and keep old readers working until all are migrated.
