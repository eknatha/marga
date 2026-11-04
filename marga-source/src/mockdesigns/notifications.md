# Model answer: a notification system for 50 million users
prompt: notifications
summary: A queue-based fan-out with per-channel workers, preferences, retries and deduplication.

## The answer in one minute

Accept events through an API, check user preferences, put one message per channel on a queue, and let workers call the push, email and SMS providers with retries and idempotency keys. Rate limit per user and per provider, and keep delivery status.

## The design

```diagram
title: Notification system design
node: src | Producers | 0 | 1 | Services that raise events. | A bug can send millions of messages.
node: api | Notification API | 1 | 1 | Validates and records the request. | Without idempotency retries send twice.
node: pref | Preferences store | 2 | 0 | Channels, quiet hours and opt-outs. | Ignoring it breaks trust and law.
node: q | Channel queues | 2 | 2 | Separate queues for push, email and SMS. | A slow provider blocks a shared queue.
node: wrk | Channel workers | 3 | 1 | Render the template and call the provider. | Provider errors need careful retry.
node: prov | Providers | 4 | 1 | APNs, FCM, email and SMS gateways. | Limits and outages.
node: stat | Delivery status store | 4 | 2 | Sent, delivered, failed, opened. | Used to avoid duplicates and debug.
edge: src | api
edge: api | pref
edge: api | q
edge: q | wrk
edge: wrk | prov
edge: wrk | stat
```

## Every component, explained

### Idempotent API

Each request carries a key. If the same key arrives again, the API returns the first result and sends nothing new.

Example: A retry after a network timeout does not send a second password reset email.

### Preferences

Before queuing, the service checks the opt-in, channel choice and quiet hours for the user.

Example: A user who turned off SMS at night gets a push in the morning instead.

### Separate queues

Each channel has its own queue and workers, so a slow SMS provider cannot delay push messages.

Example: During an SMS outage email still flows.

### Retries with backoff

Workers retry temporary errors with growing delays and a limit, then move the message to a dead-letter queue.

Example: A 503 from the email provider is retried after 1, 4 and 16 seconds.

### Fan-out control

A message to 50 million users is split into batches and paced to the provider limits and to your capacity.

Example: A campaign is sent as 500 batches over an hour, not in one second.

## Numbers to say out loud

- 50 million users and 3 messages a day is 150 million a day, about 1700 a second on average.
- A campaign peak of 50000 a second needs queues and workers sized for it, or pacing.
- Status records at 200 bytes use about 30 GB a day.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Duplicate sends | Angry users | Idempotency keys and a sent-record check |
| Provider outage | Messages delayed | Second provider and retry queue |
| Poison message | Worker loops | Dead-letter queue and alert |
| Spam from a bug | Mass sends | Per-producer limits and an emergency stop |
| Preference bug | Messages to opted-out users | Test it, audit it and log decisions |

## Follow-up questions to expect

- How do you handle time zones for scheduled sends?
- How do you prioritise a security code over a promotion?
- How do you measure delivery?
