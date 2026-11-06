---
title: Pub/Sub, Eventarc and Cloud Tasks
minutes: 12
summary: Use Pub/Sub topics and subscriptions, Eventarc triggers and Cloud Tasks queues to connect Google Cloud services asynchronously and handle failures.
---

Asynchronous messaging links the parts of a Google Cloud system without making them wait for each other. Three services cover the common cases and share the same rules about retries and duplicates.

## What you will learn

- Topics, subscriptions and acknowledgements
- Dead letters and retries
- Eventarc and Cloud Scheduler
- Cloud Tasks for targeted work

## Pub/Sub

```console
$ gcloud pubsub topics create orders
$ gcloud pubsub subscriptions create billing --topic=orders --ack-deadline=60 \
    --dead-letter-topic=orders-dead --max-delivery-attempts=5 \
    --message-retention-duration=7d
$ gcloud pubsub topics publish orders --message='{"id":4411}' --attribute=region=eu
```

A **topic** receives messages; each **subscription** gets its own copy. **Pull** subscribers fetch; **push** subscriptions call an HTTPS endpoint such as Cloud Run. Delivery is **at-least-once**. If the subscriber does not acknowledge within the **ack deadline**, the message is redelivered. After the maximum attempts it goes to the **dead-letter topic**. Retained messages and **seek** allow replay, and **ordering keys** keep messages with one key in order.

## Eventarc and Scheduler

**Eventarc** routes events (a file uploaded to Cloud Storage, an audit log entry, a Pub/Sub message) to Cloud Run or functions. **Cloud Scheduler** triggers a topic or URL on a cron schedule.

## Cloud Tasks

**Cloud Tasks** queues individual HTTP tasks for a specific handler, with rate limits (`maxDispatchesPerSecond`), concurrency limits and retry settings. Choose Tasks when you want to control how fast one service is called; choose Pub/Sub when many subscribers need an event.

```diagram
title: Asynchronous paths on Google Cloud
node: pub | Publisher | 0 | 1 | Sends events to a topic. | A message without an id is hard to trace.
node: top | Pub/Sub topic | 1 | 1 | Copies each message to every subscription. | A missing subscription loses the event for that consumer. | queue
node: sub | Subscription | 2 | 0 | Pull or push delivery with an ack deadline. | Short deadlines cause duplicates. | queue
node: dlt | Dead-letter topic | 3 | 0 | Collects messages that failed N times. | Unwatched, it hides failures. | observe
node: evt | Eventarc | 2 | 1 | Turns Google events into calls to Cloud Run. | Wrong filters send nothing. | process
edge: pub | top
edge: top | sub
edge: sub | dlt
edge: top | evt
```

## Incident: Redelivered again and again

> **Incident:** Messages were delivered repeatedly because handling took longer than the acknowledgement deadline.

```console
$ gcloud pubsub subscriptions describe billing --format='value(ackDeadlineSeconds)'
10
billing log: handler took 45s for message 8812; delivery attempt 4
```

The handler outlasted the deadline, so Pub/Sub assumed failure. The team raised the deadline, made the handler idempotent and added a dead-letter topic with an alert.

## Common mistakes

- Ack deadline shorter than the handler
- No dead-letter topic
- Handlers that cannot safely run twice
- Using Pub/Sub for rate-controlled calls to one service

```quiz
Q: What delivery guarantee does Pub/Sub give?
+ At-least-once
- Exactly once always :: No.
- At-most-once :: No.
- None :: No.
> Duplicates are possible.

Q: What happens when the ack deadline passes?
+ The message is redelivered
- It is deleted :: No.
- It moves regions :: No.
- It is encrypted :: No.
> Pub/Sub assumes failure.

Q: When use Cloud Tasks?
+ To control how fast one handler is called
- To broadcast to many :: No.
- To store files :: No.
- To run DNS :: No.
> Rate and retry control.

Q: What is Eventarc for?
+ Routing Google service events to handlers
- Creating VPCs :: No.
- Billing :: No.
- Storing secrets :: No.
> Event-driven triggers.
```

```cards
Topic :: A named channel in Pub/Sub
Subscription :: A consumer's view of a topic
Ack deadline :: Time allowed to acknowledge a message
Dead-letter topic :: Where repeatedly failing messages go
Eventarc :: Service that routes events to targets
```
