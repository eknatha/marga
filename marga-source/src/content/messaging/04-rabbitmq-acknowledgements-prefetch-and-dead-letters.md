---
title: RabbitMQ: acknowledgements, prefetch and dead letters
minutes: 13
summary: Handle failures in RabbitMQ with acknowledgements, prefetch limits, retries, dead-letter exchanges and monitoring of queue depth.
---

Most RabbitMQ incidents are about consumers: not acknowledging, taking too much, or retrying a bad message forever. Three settings and one pattern, acknowledgements, prefetch, TTL and dead-lettering, prevent most of them.

## What you will learn

- Manual acknowledgements and publisher confirms
- Prefetch and fair dispatch
- Dead-letter exchanges and retry delays
- Reading ready, unacked and consumer numbers

## Acknowledgements

With **manual acks** the broker keeps a message as **unacked** until the consumer confirms it. If the connection drops, the message returns to the queue and is delivered again (at-least-once). Acknowledge only after the work is saved. On the producer side, **publisher confirms** tell the producer the broker has safely taken the message.

## Prefetch

```python
channel.basic_qos(prefetch_count=20)     # at most 20 unacked per consumer
channel.basic_consume(queue='billing', on_message_callback=handle, auto_ack=False)
```

Without a limit one consumer can receive thousands of messages and sit on them while others are idle. A sensible prefetch (10 to 100 for quick tasks, 1 for slow ones) spreads work fairly and bounds memory.

## Dead letters and retries

```console
$ rabbitmqadmin declare queue name=billing durable=true \
    arguments='{"x-dead-letter-exchange":"dlx","x-message-ttl":600000}'
```

When a message is rejected without requeue, expires, or the queue overflows, the broker republishes it to the **dead-letter exchange**. A common design: a `retry` queue with a TTL (say 30 s) whose dead-letter target is the original queue, giving a delayed retry; after N attempts (counted in a header) the message goes to a `parked` queue for humans.

## What to watch

| Metric | Meaning | Worry when |
|---|---|---|
| Ready | Waiting for a consumer | Growing steadily |
| Unacked | Delivered, not yet acknowledged | Large and stuck |
| Consumers | Connected consumers | Zero |
| Publish vs ack rate | In versus out | Publish far above ack |

```diagram
title: Failure handling in RabbitMQ
node: q | Main queue | 0 | 0 | Delivers up to prefetch messages to each consumer. | Without prefetch one consumer can hoard messages. | queue
node: c | Consumer | 1 | 0 | Processes then acknowledges, or rejects without requeue. | Acking too early loses work if it crashes next.
node: retry | Retry queue | 2 | 0 | Holds a failed message for a TTL, then returns it. | Unlimited retries loop forever on a poison message. | queue
node: dead | Parked queue | 3 | 0 | Keeps messages that failed N times for a human. | Nobody watching it means silent data loss.
node: mon | Alerts | 1 | 1 | Watch ready, unacked and parked counts. | An alert on only queue length misses a stuck consumer. | observe
edge: q | c
edge: c | retry
edge: retry | q
edge: retry | dead
edge: dead | mon
```

## Incident: The poison message

> **Incident:** One malformed message crashed its consumer, was requeued at once and blocked the queue.

```console
$ rabbitmqctl list_queues name messages_ready messages_unacknowledged consumers
orders  52113  1  1
consumer log: JSONDecodeError at offset 0 (restart 480)
```

The bad message was rejected with requeue true, so it came back first every time. The fix was reject without requeue to a dead-letter queue, plus a parked queue alert, so the 52,000 good messages could be processed.

## Common mistakes

- Using auto-ack for work that must not be lost
- Rejecting with requeue true for messages that can never succeed
- No prefetch limit
- A dead-letter queue with no owner or alert

```quiz
Q: What does prefetch limit?
+ Unacknowledged messages per consumer
- Message size :: No.
- Routing keys :: No.
- Queue count :: No.
> It bounds in-flight work.

Q: What happens if a consumer dies before acking?
+ The message is redelivered
- It is deleted :: No.
- It is encrypted :: No.
- It moves to another vhost :: No.
> Unacked messages return to the queue.

Q: Where do rejected messages go when a DLX is set?
+ To the dead-letter exchange
- Back to the producer :: No.
- Nowhere :: No.
- To the log :: No.
> The DLX re-routes them.

Q: Which sign suggests a stuck consumer?
+ Large unacked count and no progress
- Zero publishers :: No.
- Low CPU :: No.
- A short routing key :: No.
> Messages are delivered but never acked.
```

```cards
Ack :: Confirmation from a consumer that a message was handled
Prefetch :: Maximum unacknowledged messages allowed per consumer
Dead-letter exchange :: Where rejected or expired messages are sent
Poison message :: A message that always fails processing
TTL :: Time a message or queue may live before expiring
```
