---
title: Messaging and streaming
summary: RabbitMQ and Kafka commands for queues, topics, consumer groups and lag, with the delivery rules to remember.
module: messaging
---

## Delivery rules

| Term | Rule to remember |
|------|------------------|
| At-least-once | Duplicates are possible, so handlers must be idempotent |
| Ordering | Guaranteed only within one queue or partition |
| Acknowledge | After the work is saved, not before |
| Dead letters | Every queue needs a failed-message path and an alert on it |

## RabbitMQ

```bash
rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
rabbitmqctl list_bindings
rabbitmqctl list_connections name state
rabbitmqadmin declare queue name=billing durable=true
rabbitmqadmin publish exchange=events routing_key=order.paid.eu payload='{"id":4411}'
```

## Kafka topics

```bash
kafka-topics.sh --bootstrap-server b1:9092 --list
kafka-topics.sh --bootstrap-server b1:9092 --describe --topic orders
kafka-topics.sh --bootstrap-server b1:9092 --describe --under-replicated-partitions
kafka-configs.sh --bootstrap-server b1:9092 --entity-type topics --entity-name orders --describe
```

## Kafka consumers and lag

```bash
kafka-consumer-groups.sh --bootstrap-server b1:9092 --list
kafka-consumer-groups.sh --bootstrap-server b1:9092 --describe --group invoicer
kafka-console-consumer.sh --bootstrap-server b1:9092 --topic orders --from-beginning --max-messages 5
```

## Producer and consumer settings that matter

| Setting | Safe starting value |
|---------|---------------------|
| acks | all |
| enable.idempotence | true |
| min.insync.replicas | 2 with replication factor 3 |
| enable.auto.commit | false |
| max.poll.interval.ms | longer than your slowest batch |

## Debugging order

1. Are consumers running and connected?
2. Is lag on one partition or all of them?
3. Is a dependency slow, or is a message failing in a loop?
4. Is the broker healthy: disk, under-replicated partitions, controller?
5. Trace one message id from producer to database.

## Daily checks

```bash
kafka-consumer-groups.sh --bootstrap-server $B --describe --group orders
```

```bash
kafka-topics.sh --bootstrap-server $B --describe --topic orders
```

```bash
rabbitmqctl list_queues name messages consumers
```

```bash
kafka-console-consumer.sh --bootstrap-server $B --topic orders --from-beginning --max-messages 5
```

> **Warning:** Resetting consumer group offsets skips or replays messages. Stop the group first and use `--dry-run` before `--execute`.

> **Danger:** Deleting a topic or purging a queue cannot be undone. Check the name twice and confirm the environment.

> **Warning:** Auto-acknowledge loses messages when a consumer crashes mid-work. Acknowledge after the work is stored.

> **Warning:** Lowering retention deletes old data on the next cleanup. Check what slow consumers still need first.
