---
title: Reliability patterns
minutes: 17
summary: Apply timeouts, retries with backoff, circuit breakers, load shedding and capacity planning so one failing part does not take down the whole system.
---

Large systems are always partly broken. A disk fails somewhere, a dependency slows down, a deploy goes wrong. Reliable systems are not those where nothing fails, but those designed so that failures stay small. A handful of patterns do most of the work.

## What you will learn

- Timeouts, retries and the retry storm
- Circuit breakers and bulkheads
- Load shedding and graceful degradation
- Capacity planning and testing failure

## Timeouts

Every call over a network needs a **timeout**. Without one, a slow dependency holds your threads or connections indefinitely, and your service becomes slow, then dead, because of someone else's problem.

- Set timeouts shorter than the caller's own deadline. If the user's request has 2 seconds, do not make a 10-second call inside it.
- Propagate a **deadline** down the call chain, so downstream work is abandoned when the caller has already given up.

## Retries, with care

Retrying helps with brief, transient failures. Done badly, it multiplies load on a struggling service and turns a hiccup into an outage.

Rules for safe retries:

| Rule | Reason |
|------|--------|
| Retry only **idempotent** operations (or use idempotency keys) | A retried payment must not charge twice |
| Use **exponential backoff** | Waiting 1s, 2s, 4s gives the system room to recover |
| Add **jitter** (randomness) | Prevents all clients retrying at the same instant |
| Cap attempts (two or three) and total time | Avoids runaway work |
| Use a **retry budget** | Allow retries as at most about 10% of traffic, so they cannot swamp the service |

```python
import random, time

def call_with_retries(fn, attempts=3, base=0.2, cap=2.0):
    for attempt in range(attempts):
        try:
            return fn()
        except TransientError:
            if attempt == attempts - 1:
                raise
            sleep = min(cap, base * (2 ** attempt))
            time.sleep(random.uniform(0, sleep))
```

> **Warning:** If every layer of a five-layer system retries three times, one failing call at the bottom becomes 3 to the power 5, or 243 calls. Retry at one layer, usually the one closest to the user, and not at every layer.

## Circuit breakers

A **circuit breaker** watches calls to a dependency. When failures pass a threshold, it **opens** and fails fast instead of calling, giving the dependency time to recover and saving your resources. After a pause it lets a few trial requests through (**half-open**), and closes again if they succeed.

```text
closed (normal) --failures exceed threshold--> open (fail fast)
open --after cool-down--> half-open (trial requests)
half-open --success--> closed      half-open --failure--> open
```

Pair a breaker with a **fallback**: a cached value, a default, or a reduced feature.

## Bulkheads and graceful degradation

A **bulkhead** isolates resources, as a ship's compartments keep one leak from sinking it. Give each dependency its own connection pool or thread pool, so a slow recommendations service cannot use all your capacity and starve checkout.

**Graceful degradation** means a failure in a non-critical feature should not break the critical path. If recommendations fail, show the product without them. Decide in advance which features are essential and which are optional.

## Load shedding and limits

When demand exceeds capacity, doing nothing makes every request slow and then fail. It is better to **shed load**: reject some requests quickly (HTTP 429 or 503 with a `Retry-After` header) so the rest succeed. Prioritize: keep checkout, shed bulk exports. Add **rate limits** per client so one noisy caller cannot harm others, and **queues with bounded length** so overload becomes visible rather than hidden latency.

## Capacity and testing failure

- Know your limits with **load tests** that match production traffic shapes.
- Keep headroom: plan for peak plus the loss of one zone or instance group.
- Watch saturation trends, and add capacity before the limit, not at it.
- **Practise failure.** Game days and chaos experiments (kill an instance, add latency to a dependency, fail over a database) reveal what breaks while you are watching and ready, not at 3 a.m.

Start small: pick a hypothesis ("if the cache is unavailable, checkout still works, only slower"), limit the blast radius, run it in a quiet period, and stop immediately if customer impact appears.

## Incident: a retry storm after a short blip

> **Incident:** The inventory database has a 20-second hiccup. Inventory recovers, but the system stays down for 40 minutes with the API at 100% CPU.

```console
$ kubectl top pod -n shop
NAME                   CPU(cores)   MEMORY(bytes)
shop-api-6d8f7c9b5-a   1990m        480Mi
```

Charting the request rate that reached inventory shows what happened:

```promql
sum(rate(http_requests_total{service="inventory"}[1m]))
```

The rate was about 900 per second before the blip and 11,000 per second during it. During the blip, every client retried immediately and without limit. Inventory's request rate rose twelvefold, so when the database came back it was instantly overwhelmed again, and again. The retries *were* the outage. Break the loop first: shed load at the edge or temporarily reduce traffic so inventory can recover (scaling the API further would only add more retrying clients). Then fix the design: exponential backoff with jitter, a cap of two attempts, a retry budget, a circuit breaker on the inventory client, and a fallback that serves cached stock levels. Rehearse the scenario in a game day by injecting latency into inventory and confirming the system stays stable.

## Common mistakes

- No timeouts on outbound calls
- Retries at every layer, without backoff or jitter
- Retrying non-idempotent operations
- One shared pool for all dependencies
- Never testing failure on purpose

```quiz
Q: Why add jitter to retries?
- It makes retries faster
+ It stops all clients from retrying at the same moment
- It avoids timeouts
- It encrypts requests
> Randomizing delays spreads retry load over time.

Q: What does an open circuit breaker do?
- Retries more aggressively
+ Fails calls immediately without contacting the failing dependency
- Restarts the dependency
- Doubles the timeout
> Failing fast protects both the caller and the struggling dependency.

Q: What is a bulkhead?
- A type of load balancer
+ Isolating resources per dependency so one failure cannot consume everything
- A retry policy
- A deployment strategy
> Separate pools stop a slow dependency from starving other work.

Q: What is the best response when demand far exceeds capacity?
- Accept everything and let all requests slow down
+ Shed some load quickly so the remaining requests succeed
- Remove timeouts
- Retry more
> Controlled rejection beats universal slowness.
```

```cards
Safe retry rules? :: Idempotent operations only, exponential backoff with jitter, capped attempts, ideally a retry budget
Circuit breaker states? :: Closed, open and half-open
Why retry at only one layer? :: Retries multiply across layers and can create a storm
Graceful degradation? :: Non-critical features fail without breaking the critical path
```
