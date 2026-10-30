---
title: Worked design: a rate limiter service
minutes: 16
summary: Design a shared limiter for an API gateway: algorithm, state, consistency, failure behaviour and how not to cause an outage with it.
---

A rate limiter protects services and enforces fairness. It sits on every request, so it must be fast and must never become the reason requests fail. The design question is less "which algorithm" than "what do we do when the limiter itself is wrong, slow or down".

## What you will learn

- Choose limits, keys and algorithm for a gateway limiter
- Design shared counters and accept approximate accuracy
- Decide fail-open or fail-closed and protect the limiter from itself
- Communicate limits to clients and watch the system

## 1. Clarify

Limit requests per API key per second and per minute, with different tiers, plus a global protection limit per service. It runs in the gateway on every call. Limit decisions must add under 2 ms. Slightly inaccurate limits are acceptable (a customer allowed 105 instead of 100 for a moment). A limiter outage must not block traffic. Limits are changed by operators and must roll out safely.

## 2. Estimate

Gateway traffic 50,000 requests per second at peak across 20 gateway nodes, 200,000 active keys. A counter per key and window is small: 200,000 keys by a few counters by about 64 bytes is a few tens of MB, easily in memory. The cost is the network call: asking a shared store for every request is 50,000 operations per second of added latency and a new dependency on the hot path.

## 3. Sketch

Local limiter in each gateway node (token bucket in memory), plus a shared store (replicated in-memory store) holding counts per key for accurate global limits, synchronised in batches. A configuration service distributes rules. A metrics path records allow, deny and error decisions.

## 4. Deep-dive

**Algorithm.** A token bucket per key: tokens refill at the sustained rate up to the burst size; each request spends one. It allows controlled bursts and is cheap. For protecting a service, add a concurrency limit that caps in-flight requests, because slow requests hold capacity.

**Where state lives.** Three choices: purely local (each node enforces limit divided by nodes; cheap, inaccurate when traffic is uneven); a central store consulted per request (accurate, adds latency and a dependency); or hybrid. The hybrid is common: each node holds a local allowance, and refills it in chunks from the shared store (for example 10 percent of the key's limit at a time). Accuracy is within a chunk, store calls drop by an order of magnitude, and if the store is unreachable the node keeps enforcing its local allowance.

**Atomicity.** The shared update must be atomic (increment and compare in one operation) to avoid races between gateway nodes. Use the store's atomic operations or a short script, not read then write.

**Failure behaviour.** If the store is down, fail open to local limits with a conservative floor. Blocking all traffic because the limiter cannot count turns a minor fault into an outage. For sensitive operations such as login attempts, you may choose fail-closed or stricter local limits; decide per rule and write it down.

**Protecting the limiter.** Cache denies for a short time, apply a cheap pre-filter for obviously abusive sources before the keyed lookup, and bound the work per request. Treat rules as configuration with validation, staged rollout and a floor: an automated or mistaken rule that sets a limit to zero is an outage. In December 2020 an automated quota system cut the quota of a core Google authentication service to zero because an old system reported its usage as zero, and authentication failed for almost every Google service for about 50 minutes. See the case file.

**Client contract.** Return 429 with a Retry-After header and rate limit headers showing the limit and remaining count. Document backoff with jitter. Clients that ignore it are limited harder. In December 2021 an automated scaling activity made clients on AWS's internal network flood the devices linking it to the main network, and clients did not back off; congestion lasted hours. A clear contract and client-side backoff matter even inside one company.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Shared store down | accuracy lost | local allowance continues, alert |
| Store slow | added latency | tight timeout, circuit breaker, skip to local |
| Bad rule pushed | mass rejections | validation, floor, staged rollout, kill switch |
| Clock skew | windows misaligned | token bucket with monotonic time |
| Hot key | one node overloaded | local caching of denies, per-node limits |
| Gateway restart | local state lost | brief extra allowance acceptable |
| Retry storm | load amplified | 429 with Retry-After, retry budgets |

## 6. Trade-offs

Accuracy against latency: chunked allowances are fast and approximate. Fail-open protects availability and risks abuse during the outage. Per-key limits need many counters; a few tiers with shared limits are cheaper. State these choices.

```predict
Q: The shared counter store fails. The gateway is set to fail closed. What happens, and what would you change for most traffic?
???
Every request is rejected because the limiter cannot count, so a limiter fault becomes a full outage. Fail open with a conservative local limit for most rules, and keep fail-closed only for the few sensitive ones.
> A protective component must not become the single point of failure.
```

## How it fails

A limit of zero. A store that becomes the slowest call on the path. A distributed counter updated with read-then-write. Clients with no backoff. Operators unable to see which rule denied a request.

## Incident: A quota that read zero

> **Incident:** An automated process set a limit to zero from a bad reading, and the limiter obeyed.

```console
$ ratectl show rule identity-core
limit_per_minute: 0
source: automated-quota-sync
last_usage_reading: 0
```

This is a simulated illustration of the pattern. The real event is the Google authentication quota outage of 14 December 2020, in the case file. The guards are a floor under every limit, a sanity check against the previous value, staged application and a kill switch.

## Interview question

"Design a rate limiter for an API gateway." Ask for keys and limits, choose token bucket plus a concurrency limit, use local allowances refilled in chunks from a shared atomic store, fail open with a floor, return 429 with Retry-After, validate and stage rule changes, and monitor decisions.

## Common mistakes

- A shared store call on every request with no fallback
- Read then write counters
- Limits that can drop to zero
- No client guidance on backoff

```quiz
Q: What does a local allowance refilled in chunks give you?
+ Fewer store calls and continued enforcement if the store is down
- Perfect accuracy :: It is approximate.
- No need for limits :: No.
- Faster DNS :: Unrelated.
> Correct: Fewer store calls and continued enforcement if the store is down. Re-read the matching lesson section for the full reasoning.

Q: Which failure behaviour is common for a limiter when its store is unreachable?
+ Fail open with a conservative local limit
- Reject all requests :: Turns a fault into an outage.
- Disable logging :: Unrelated.
- Double the limit :: Unsafe.
> Correct: Fail open with a conservative local limit. Re-read the matching lesson section for the full reasoning.

Q: Why must counter updates be atomic?
+ Concurrent gateway nodes would otherwise race and miscount
- To save memory :: Not the reason.
- To avoid TLS :: Unrelated.
- To sort keys :: Unrelated.
> Correct: Concurrent gateway nodes would otherwise race and miscount. Re-read the matching lesson section for the full reasoning.

Q: What should a rule change process include?
+ Validation, a floor, staged rollout and a kill switch
- A single manual push :: Risky.
- Removing monitoring :: No.
- Only a code review :: Not enough.
> Correct: Validation, a floor, staged rollout and a kill switch. Re-read the matching lesson section for the full reasoning.
```

```cards
token bucket :: refill rate plus burst size
concurrency limit :: cap on in-flight requests
local allowance :: share of a limit held on one node
fail open :: allow traffic when the check cannot run
Retry-After :: header telling a client when to retry
limit floor :: lowest value a rule may take
```
