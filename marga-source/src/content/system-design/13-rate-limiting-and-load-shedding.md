---
title: Rate limiting, load shedding and admission control
minutes: 15
summary: Protect a service from overload with limits at the edge, fair sharing between callers and shedding that keeps useful work flowing.
---

Overload is not rare. It comes from launches, retry storms, a single heavy customer, a slow dependency and recovery itself. A service that accepts everything delivers nothing: queues grow, latency exceeds timeouts and every request fails. The aim is to serve fewer requests well.

## What you will learn

- Choose a rate limit algorithm and where to enforce it
- Share capacity fairly between tenants
- Shed load by priority and use admission control
- Return signals that tell clients to back off

## Why overload collapses

When arrival exceeds capacity, queues grow. Wait time passes the client's timeout, so the work is done for a client who has already given up, and the client retries, adding load. Goodput falls toward zero even though servers are busy. This is congestion collapse. Limiting early, before expensive work, keeps goodput high.

## Algorithms

- **Fixed window:** count per minute; simple, but allows a burst of double at the window edge.
- **Sliding window:** smoother, more memory.
- **Token bucket:** tokens refill at a steady rate up to a burst size; each request spends one. Allows controlled bursts and is the common default.
- **Leaky bucket:** requests drain at a constant rate, smoothing output.
- **Concurrency limit:** cap in-flight requests rather than rate. Often better for protecting a service, because slow requests hold capacity longer.

## Where to enforce

At the edge or gateway (cheap, early), per service (protects itself), and per dependency (protects the callee). A distributed limiter needs shared state, which costs latency and can fail, so decide what happens if the limiter store is down: usually fail open with a local limit as a floor. Docker Hub's pull limits are a public example of limits applied by source address, which surprise teams whose CI jobs share one IP; read the current documentation for the exact numbers.

## Fairness

Per-tenant limits stop one customer taking everything. Weighted fair queueing gives each tenant a share and lets idle share be used by others. Pick the key carefully: per IP punishes shared networks, per API key is cleaner.

## Load shedding

When over capacity, reject deliberately: drop the lowest priority first (batch, prefetch, analytics), and reject new work rather than abandon work half done. Reject quickly and cheaply; a rejection that costs as much as the work defeats the point. Prefer shedding by queue age: drop requests that have waited longer than the client will wait.

## Admission control and clients

Limit concurrency at the entrance based on measured latency, so the service accepts only what it can finish in time. Tell clients: return HTTP 429 (too many requests) or 503 with a Retry-After header, and have clients back off with jitter. A client that ignores the signal needs a hard limit.

## Capacity and autoscaling

Autoscaling is slow compared with a spike, and new instances start cold (empty caches, no connections). Do not use it as the only protection. Keep headroom, scale on leading signals, and let limits hold the line while scale-out catches up.

```predict
Q: A service handles 1,000 requests a second. Traffic jumps to 3,000 and requests start taking longer than the 2 second client timeout. Why does adding retries make it worse, and what do you do?
???
Retries add more load while the service is already doing work for clients that gave up. Shed excess load early with a concurrency limit, return 429 or 503 with Retry-After, and make clients back off with jitter.
> Serving fewer requests well beats serving all of them badly.
```

## How it fails

A limiter that rejects good traffic because the key is wrong. A limiter store outage that blocks everything. Shedding that rejects critical requests first. A limit set once and never revisited as capacity changed.

## Incident: A quota that went to zero

> **Incident:** An automated quota system reduced a core service's quota to zero because the old system reported its usage as zero.

```console
$ gcloud service-usage quota describe --service=identity --limit=requests
limit: 0
used: 0
status: LIMIT_REACHED
```

The console output is a simulated illustration. In the real 14 December 2020 outage at Google, authentication failed for almost every Google service for about 50 minutes. The lesson is that limits are themselves a dependency that can fail: automated limits need sanity checks, staged change and a floor below which they cannot drop. See the case file.

## Interview question

"Design a rate limiter for an API gateway." Ask for the key and the limits, choose a token bucket, keep counters in a fast shared store with local fallback, return 429 with Retry-After, and say what happens when the store is down.

## Common mistakes

- Limits only at the edge, none per dependency
- Counting requests when concurrency is the real constraint
- No Retry-After, so clients retry immediately
- Autoscaling as the only defence

```quiz
Q: What does a token bucket allow?
+ Controlled bursts up to the bucket size at a steady refill rate
- No bursts at all :: That is a leaky bucket.
- Unlimited traffic :: No.
- Only one request per hour :: No.
> Correct: Controlled bursts up to the bucket size at a steady refill rate. Re-read the matching lesson section for the full reasoning.

Q: What is congestion collapse?
+ Servers are busy but little useful work completes
- A cable fault :: No.
- A DNS failure :: No.
- A planned freeze :: No.
> Correct: Servers are busy but little useful work completes. Re-read the matching lesson section for the full reasoning.

Q: Which status and header tell a client to back off?
+ 429 or 503 with Retry-After
- 200 with an empty body :: Misleading.
- 301 :: A redirect.
- 404 :: Not found.
> Correct: 429 or 503 with Retry-After. Re-read the matching lesson section for the full reasoning.

Q: If the limiter's shared store fails, what is a common choice?
+ Fail open with a local limit as a floor
- Block all traffic :: Turns a limiter fault into an outage.
- Disable logging :: Unrelated.
- Double the limits :: No.
> Correct: Fail open with a local limit as a floor. Re-read the matching lesson section for the full reasoning.
```

```cards
token bucket :: refills steadily, allows bursts
concurrency limit :: cap in-flight requests
load shedding :: reject deliberately under overload
429 :: too many requests
Retry-After :: tells the client when to retry
goodput :: useful work completed per second
```
