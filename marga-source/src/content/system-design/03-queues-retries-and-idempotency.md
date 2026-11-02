---
title: Queues, retries, timeouts and idempotency
minutes: 15
summary: Decouple with queues, retry without causing storms, and make operations safe to repeat.
---

Networks lose messages and services time out. The question is never whether a call will be repeated, but what happens when it is. Queues absorb bursts, retries recover from blips, and idempotency makes repeats harmless. Done carelessly, the same tools turn a small fault into a storm.

## What you will learn

- Choose between a queue and a stream, and what ordering and delivery guarantees mean
- Set timeouts, retries, backoff and jitter so retries help instead of hurt
- Make operations idempotent with keys
- Apply backpressure and dead-letter queues

## Queues and streams

A **queue** hands each message to one consumer and removes it after acknowledgement; good for work to be done once. A **stream** is an ordered log that many consumers read at their own pace and can replay; good for events and pipelines. Ordering is usually guaranteed only within a partition, so choose the partition key so related events stay together (for example the account id).

**Delivery guarantees:** at-most-once (may lose), at-least-once (may repeat), exactly-once (in practice, at-least-once delivery plus idempotent handling). Assume at-least-once and design consumers to be safe on repeats.

## Timeouts

Every call needs a timeout shorter than the caller's own timeout. Without one, a slow dependency ties up threads and connections until the caller fails too. Set timeouts from the dependency's real latency (for example just above its 99th percentile), and use a deadline that passes down the whole call chain so work is abandoned once the user has gone.

## Retries

Retry only errors that may succeed later (timeouts, 503, connection reset), not ones that never will (400, 404). Use exponential backoff with **jitter**: wait 100 ms, then up to 200, then up to 400, each randomised. Cap the attempts. Without jitter, thousands of clients retry at the same moments and hit the recovering service in waves.

**Retry amplification:** if each of three layers retries three times, one user request can become 27 calls to the bottom service during an incident, exactly when it is least able to cope. Retry at one layer, and use a **retry budget** (for example, retries may be at most 10 percent of requests).

## Idempotency

An operation is idempotent if doing it twice has the same effect as once. Setting a value is; adding to a balance is not. Make non-idempotent operations safe with an **idempotency key**: the client sends a unique key, the server records the key with the result, and a repeat returns the stored result instead of acting again. Payment APIs use this so a retried charge does not bill twice. Store the key and the effect in the same transaction.

## Backpressure and dead letters

If producers outrun consumers, queues grow without limit and latency climbs. Apply backpressure: bound the queue, reject or slow producers when it is full, and alert on queue age, not only length. Messages that fail repeatedly go to a **dead-letter queue** so one poison message does not block the rest; someone must watch it.

```predict
Q: A client times out calling a payment service and retries. The first call had actually succeeded. How do you avoid a double charge?
???
Send an idempotency key with the request; the server stores the key with the result and returns that result on the repeat instead of charging again.
> The timeout tells you nothing about whether it worked.
```

## How it fails

Unbounded queues hide overload until memory is gone. Missing jitter creates retry waves. Layered retries multiply load. Consumers without idempotency double-apply work after a redelivery.

## Incident: When retries became the outage

> **Incident:** A dependency slowed down and the clients that called it retried aggressively, keeping it overloaded long after the original fault.

```console
$ grep -c "retry attempt" /var/log/api/app.log
48211
$ grep -c "request received" /var/log/api/app.log
15870
```

This is a simulated illustration of the retry-storm pattern. About three attempts per request, summed across layers, kept the dependency saturated. No single public case is claimed here; the case files on overload and recovery show related effects. The fix was a retry budget, jittered backoff and retries at only one layer.

## Interview question

"A queue consumer is slow and the backlog is growing. What do you check, and what do you change?" Check consumer errors and retries, per-message time, partition skew and downstream latency; change by scaling consumers only if the downstream can take it, adding backpressure, and moving poison messages to a dead-letter queue.

## Common mistakes

- Retrying at every layer
- Retries with no jitter or cap
- Assuming exactly-once delivery
- Alerting on queue length but not age

```quiz
Q: Why add jitter to retry backoff?
+ So clients do not retry in synchronised waves
- To make retries faster :: It spreads, it does not speed up.
- To skip timeouts :: Timeouts are still needed.
- To avoid idempotency :: Unrelated.
> Waves hit a recovering service repeatedly.

Q: What does an idempotency key let a server do?
+ Return the stored result for a repeated request instead of acting again
- Encrypt the request :: It is not encryption.
- Speed up the database :: Not its purpose.
- Order messages :: It does not order.
> Correct: Return the stored result for a repeated request instead of acting again. Re-read the matching lesson section for the full reasoning.

Q: Three layers each retry three times. Worst case calls to the bottom service per user request?
+ 27
- 9 :: That is only two layers.
- 3 :: Only one layer.
- 12 :: Not how it multiplies.
> Correct: 27. Re-read the matching lesson section for the full reasoning.

Q: What belongs in a dead-letter queue?
+ Messages that keep failing, set aside so others proceed
- All new messages :: No.
- Successful messages :: No.
- Only large messages :: Size is not the rule.
> Correct: Messages that keep failing, set aside so others proceed. Re-read the matching lesson section for the full reasoning.
```

```cards
at-least-once :: may repeat, so consumers must tolerate repeats
backoff :: wait longer after each failure
jitter :: randomise the wait
retry budget :: cap retries as a share of traffic
idempotency key :: client token that makes repeats safe
backpressure :: slow or reject producers when full
```
