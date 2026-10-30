---
title: Worked design: a notification fan-out system
minutes: 16
summary: Deliver one event to millions of devices, with fan-out strategies, priority queues, provider limits, deduplication and retry control.
---

A notification system turns one event ("new message", "payment received", "outage") into many deliveries over email, push and chat. The hard parts are fan-out, uneven load, third-party limits and not sending the same message twice or a million at once to a recovering dependency.

## What you will learn

- Design fan-out on write and fan-out on read, and when to mix them
- Use priorities, queues and per-provider limits
- Make delivery idempotent and avoid duplicate sends
- Protect providers and the system from retry storms

## 1. Clarify

Producers publish events with a type, an audience and a payload. The system delivers to each recipient's chosen channels. Critical notices (security alerts, payment failures) are time sensitive; marketing can wait. Users set preferences and quiet hours. Duplicates are annoying, and for some notices harmful. SLO: 99 percent of critical notifications are handed to a provider within 10 seconds, bulk within 30 minutes.

## 2. Estimate

50 million users, 5 notifications per user per day: 250 million a day, about 2,900 per second average, bursts to 10x on events (a flash sale or an outage notice). A single broadcast to 20 million users must complete in minutes: 20 million over 600 seconds is about 33,000 per second sustained, far above the average. Provider limits apply: email and push providers cap per-second sends and per-recipient rates, so the egress rate is set by the providers, not by our fleet.

## 3. Sketch

Event intake API, an event stream, a fan-out service that expands audiences into per-recipient messages, priority queues per channel, channel workers that call providers, a preference and deduplication store, a delivery status store, and a dead-letter queue.

## 4. Deep-dive

**Fan-out strategy.** For targeted notices (one user), expand immediately. For huge audiences (all users), expanding to 20 million messages at intake would flood the queue and delay critical traffic. Expand in batches by partition of the user table, as background jobs that are rate limited, and keep them off the critical lane. That is fan-out on write for most cases, with controlled batching for broadcasts. Where a recipient pulls their feed (an in-app inbox), fan-out on read avoids storing millions of copies; hybrids store for normal users and read for celebrity-sized audiences.

**Priority lanes.** Separate queues and workers for critical, normal and bulk traffic, with their own capacity so a marketing blast cannot delay a security alert. That is a bulkhead. Workers pull from critical first.

**Provider limits and backpressure.** Each channel worker has a rate limiter matched to the provider's limits and a circuit breaker. If the provider slows or returns errors, the breaker opens, messages wait in the queue, and bulk is delayed before critical. Use a second provider for critical channels when the cost justifies it.

**Idempotency and dedup.** Give each notification a unique id (event id plus recipient plus channel). Before sending, record the id in the dedup store in the same step as claiming the send; a redelivery from the queue finds the id and skips. Providers that accept an idempotency key should receive it. Accept that some paths are at-least-once and make duplicates harmless where possible.

**Retries.** Retry transient failures with exponential backoff and jitter, a cap, and a retry budget per provider. Invalid addresses and unsubscribed users are not retried; failures go to a dead-letter queue with an owner. In January 2019 a retry storm from one application overloaded CoreDNS in Zalando's Kubernetes clusters, pods ran out of memory and DNS went down for over an hour: the same pattern applies to workers retrying a slow provider while also overloading name resolution. See the case file.

**Preferences and quiet hours.** Check preferences at send time, not only at intake, because they change. Defer non-critical messages during quiet hours using a delayed queue, and spread the morning wake-up burst with jitter.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Provider outage | deliveries stall | breaker, queue, secondary provider for critical |
| Broadcast floods queue | critical delayed | separate lanes, rate-limited expansion |
| Worker crash mid-send | possible duplicate | dedup record, idempotency key |
| Poison message | worker loops | attempt cap and dead-letter queue |
| Queue backlog | stale notices | age alerts, expire old bulk messages |
| Preference store down | wrong sends | cached preferences, fail safe to critical only |
| Retry storm | provider and DNS overload | jitter, budget, limited concurrency |

## 6. Trade-offs

At-least-once delivery with dedup is simpler than exactly-once and occasionally duplicates. Separate lanes cost idle capacity. A second provider costs money and integration work. Expiring stale bulk messages protects users from a flood of old notices at the cost of undelivered ones. State which you chose.

```predict
Q: A marketing broadcast to 20 million users is queued at the same moment as password reset emails. All use one queue. What happens, and what is the fix?
???
Password resets wait behind millions of marketing messages and arrive late. Use separate priority lanes with their own workers and rate-limited expansion for the broadcast.
> One queue means one fate for all traffic.
```

## How it fails

A broadcast that starves critical alerts. Duplicate sends after a worker restart. A provider limit exceeded so the account is throttled or suspended. An expired credential for a provider. A dead-letter queue nobody reads.

## Incident: A retry storm against shared infrastructure

> **Incident:** One application retried aggressively and overloaded a shared service that many others needed.

```console
$ kubectl top pod -n kube-system -l k8s-app=kube-dns
NAME                       CPU(cores)   MEMORY(bytes)
coredns-6d4b75cb6d-x7k2p   1998m        1.9Gi
$ kubectl get events -n kube-system | grep OOMKilled | head -2
Warning  OOMKilled  pod/coredns-6d4b75cb6d-x7k2p  Container exceeded memory limit
```

The console output is a simulated illustration. The real case is Zalando on 7 January 2019, in the case file. For a notification system, the response is a per-provider retry budget, jittered backoff, concurrency limits per worker pool, and keeping bulk traffic behind critical traffic so a storm cannot take shared dependencies down.

## Interview question

"Design a notification system for 50 million users." Cover event intake, fan-out strategy, priority lanes, per-provider limits, dedup ids, retries with budgets, preferences, and the failure table.

## Common mistakes

- One queue for all priorities
- Expanding a broadcast at intake
- Retrying without a budget
- Ignoring provider rate limits and quotas

```quiz
Q: Why separate queues for critical and bulk notifications?
+ A bulk blast cannot delay critical messages
- It makes queues smaller :: Not the reason.
- It removes the need for retries :: No.
- It lowers provider cost :: Not the reason.
> Correct: A bulk blast cannot delay critical messages. Re-read the matching lesson section for the full reasoning.

Q: How do you avoid sending a duplicate after a worker restart?
+ Record a unique notification id and skip if it exists
- Hope the queue is exactly once :: Not guaranteed.
- Send twice always :: Makes duplicates.
- Remove acknowledgements :: Makes it worse.
> Correct: Record a unique notification id and skip if it exists. Re-read the matching lesson section for the full reasoning.

Q: What sets the real maximum send rate?
+ The provider limits and the rate limiters you place in front of them
- The size of the queue :: Not the limit.
- The number of users :: Not the limit.
- The database size :: Not the limit.
> Correct: The provider limits and the rate limiters you place in front of them. Re-read the matching lesson section for the full reasoning.

Q: Where do messages that keep failing go?
+ A dead-letter queue with an owner
- Back to the front of the queue forever :: Poison loop.
- Deleted silently :: Loses information.
- The provider :: Not appropriate.
> Correct: A dead-letter queue with an owner. Re-read the matching lesson section for the full reasoning.
```

```cards
fan-out on write :: expand to per-recipient messages at publish time
fan-out on read :: recipient pulls their data at read time
priority lane :: separate queue and workers for important traffic
dedup id :: unique key preventing a repeated send
dead-letter queue :: holding place for repeatedly failing messages
quiet hours :: user period when non-critical sends wait
```
