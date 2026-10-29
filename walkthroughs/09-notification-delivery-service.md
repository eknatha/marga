# A notification service with queues and retries
level: Intermediate
modules: python, observability, cloud
lessons: python/http-apis-and-json, python/concurrency-for-operations, observability/alerting-and-dashboards
summary: How a service sends email and push messages reliably by putting work on a queue, retrying with backoff and sending failures to a dead-letter queue.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Accept a request to notify a user and answer quickly
- Deliver every message at least once, and avoid duplicates where possible
- Survive slow or failing email and push providers
- Let operators see what is stuck

## The big picture

```diagram
title: Notification service reference design
node: caller | Calling services | 0 | 1 | Ask for a notification with a user, a template and a unique request key. | Callers that retry without a key can cause duplicates.
node: api | Notification API | 1 | 1 | Validates the request, stores it and returns at once. | If it does work inline, a slow provider slows every caller.
node: queue | Message queue | 2 | 1 | Holds work until a worker takes it. | A queue with no limit hides a growing backlog until memory runs out.
node: workers | Delivery workers | 3 | 1 | Render the template and call the provider. | Too many workers can overload the provider and get you blocked.
node: prov | Email and push providers | 4 | 1 | Third-party services that deliver to inboxes and phones. | Providers rate-limit and have outages.
node: dlq | Dead-letter queue | 3 | 2 | Keeps messages that failed too many times. | Nobody reads it, so lost messages stay lost.
node: db | Status store | 2 | 0 | Records state of each message and the request key. | Without it you cannot answer where a message went.
node: dash | Dashboards and alerts | 4 | 0 | Queue age, failure rate and delivery time. | Alerting on queue length instead of age misses slow starvation.
edge: caller | api
edge: api | db
edge: api | queue
edge: queue | workers
edge: workers | prov
edge: workers | dlq
edge: workers | db
edge: queue | dash
```

## One message, step by step

1. A calling service sends a request with a user, a template and a request key such as an order number.
2. The API checks the key. If it has seen the key, it returns the earlier result and does nothing more. Otherwise it stores the request and puts a job on the queue.
3. A worker takes the job, builds the message and calls the email provider with a short timeout.
4. On success the worker marks the message as sent. On a temporary error it puts the job back with a delay that doubles each time.
5. After a fixed number of attempts the job goes to the dead-letter queue and an alert fires.
6. An operator inspects the dead-letter queue, fixes the cause (for example a bad address format) and replays the messages.

## Why the design looks like this

- A **queue** separates accepting work from doing it, so a slow provider no longer slows callers.
- A **request key** makes retries safe because the second request is recognised.
- **Backoff with jitter** stops all failed jobs from retrying at the same moment.
- A **dead-letter queue** turns silent loss into a visible list that someone owns.
- **At-least-once delivery** is simpler and more reliable than exactly-once. Duplicates are handled by keys and by messages that are safe to repeat.

## Scaling decisions

1. Start with one queue and a few workers. Measure the age of the oldest message.
2. Add workers when queue age grows, but cap them to the provider's rate limit.
3. Split queues by priority so a password reset is never stuck behind a newsletter.
4. Add a second provider for failover when email is business-critical.
5. Batch sends where providers allow it to cut cost and time.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Provider outage | Jobs fail and pile up | Backoff, a second provider, alert on oldest message age |
| Retry storm | All jobs retry together and make it worse | Jitter, caps on attempts and on concurrency |
| Duplicate message | A customer gets the same email twice | Request keys, status check before send |
| Poison message | One bad job crashes workers repeatedly | Attempt limit and the dead-letter queue |
| Queue full or lost | Notifications vanish | Durable queue, persistent store of requests, replay tool |
| Marketing floods the queue | Password resets are delayed | Separate queues and worker pools by priority |

## Trade-offs

- Fast acceptance means a caller may not know whether the message was delivered. Provide a status endpoint or a callback.
- More retries improve delivery but delay the final failure and can annoy users with late messages. Set an expiry per message type.
- Exactly-once delivery sounds attractive, but across a network it is costly. At-least-once with safe repeats is the usual choice.

```predict
Q: A password reset email is stuck behind 2 million marketing messages. What design change prevents this?
???
Use separate queues (or priorities) and separate worker pools for urgent and bulk messages, so bulk traffic can never delay urgent traffic.
> Isolation by priority is a cheap way to protect the messages that matter most.
```
