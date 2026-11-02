---
title: Graceful degradation and circuit breakers
minutes: 14
summary: Keep the core working when a dependency is slow or down, by failing fast, serving less and recovering gently.
---

Every dependency eventually fails. A resilient service decides in advance what it will still do without it. Graceful degradation means serving a reduced but useful result. Circuit breakers stop a service from wasting its own capacity on a dependency that is not answering.

## What you will learn

- Rank features as critical, important or optional
- Design fallbacks: cached, default, partial or queued
- Configure a circuit breaker and understand its states
- Avoid fallbacks that fail worse than the failure

## Rank what matters

For a shop: checkout and login are critical; search and the product page are important; recommendations, reviews and the loyalty banner are optional. If recommendations are down, show the page without them. This only works if the page is built so a missing part does not break the whole page, and if you decide it before the incident.

## Fallback options

- **Serve stale:** return a cached copy, marked as possibly old.
- **Default value:** a generic list instead of a personal one.
- **Partial result:** the answer from the shards that responded, with a flag.
- **Queue for later:** accept the write and process it when the dependency is back.
- **Feature off:** hide the feature and say so.

A fallback is code that runs rarely, so it is likely to be wrong. Test it routinely by switching dependencies off in a staging environment and, when safe, in production during a game day.

## Circuit breakers

A breaker wraps calls to a dependency and has three states. **Closed:** calls pass; failures are counted. **Open:** after too many failures or slow calls, calls fail immediately without touching the dependency, for a cool-down time. **Half-open:** after the cool-down, a few trial calls go through; success closes the breaker, failure reopens it.

This protects both sides: the caller stops tying up threads waiting on timeouts, and the dependency gets quiet time to recover. Combine with a timeout (so slowness counts as failure), a bulkhead pool for that dependency, and a fallback for the open state.

Tune on rates, not single failures: for example open when more than 50 percent of the last 20 calls failed or took longer than 2 seconds. Too sensitive and it opens on noise; too sluggish and it never helps.

## Fail open or closed

When a safety check cannot be reached, do you allow or deny? A spam filter may fail open (allow mail). A payment fraud check or an authorisation check usually fails closed. Decide per check, write it down, and test it. Cloudflare's 2025 outage came from a component that crashed on an oversized feature file instead of falling back to the previous good file; a safe fallback would have been to keep the last valid configuration.

## Shedding optional work

Under load, drop optional work first: analytics events, background refresh, expensive personalisation. Give each request a priority so overload hits the least important first.

## Recovery

Do not fail back all at once. When a dependency returns, ramp traffic, keep the breaker half-open for a while, and avoid synchronized retries.

```predict
Q: A recommendations service is timing out at 5 seconds. The product page calls it synchronously. What happens to the page, and what should change?
???
Every page view waits 5 seconds and holds a thread, so the page slows or fails. Use a short timeout, a circuit breaker, and fall back to a default list or hide the section.
> The optional part must not own the critical path.
```

## How it fails

Fallbacks that call the same failing dependency. Breakers that open for everyone because the failures were from one tenant. A degraded mode nobody has tested. Health checks that mark everything unhealthy at once and remove all capacity.

## Incident: A health check that removed everything

> **Incident:** A dependency failed. The health check included it, so every instance reported unhealthy and the load balancer sent traffic to none.

```console
$ curl -s -o /dev/null -w '%{http_code}\n' http://api-1:8080/healthz
503
$ curl -s http://api-1:8080/healthz
{"db":"ok","recommendations":"timeout","status":"unhealthy"}
```

This is a simulated illustration of a common pattern. A health check should answer whether this instance can serve its core job, not whether every optional dependency is fine. After the change, readiness checked only the database and the page degraded when recommendations were down.

## Interview question

"Your service depends on five others. One is down. What do you do?" Check which feature depends on it, apply the planned fallback, confirm breakers are open to protect threads, and keep health checks about the instance itself.

## Common mistakes

- Putting optional dependencies in the readiness check
- A fallback that calls the failing service
- Breakers with no half-open recovery
- Never rehearsing the degraded mode

```quiz
Q: What happens in the open state of a circuit breaker?
+ Calls fail immediately without reaching the dependency
- All calls are retried :: That would add load.
- Calls are queued forever :: No.
- The dependency restarts :: Not its job.
> Correct: Calls fail immediately without reaching the dependency. Re-read the matching lesson section for the full reasoning.

Q: Which fallback suits a recommendations widget?
+ A default or cached list, or hiding it
- Blocking checkout :: Disproportionate.
- Retrying forever :: Ties up threads.
- Crashing the page :: The opposite of degradation.
> Correct: A default or cached list, or hiding it. Re-read the matching lesson section for the full reasoning.

Q: What belongs in a readiness check?
+ What this instance needs to do its core job
- Every optional dependency :: Removes capacity needlessly.
- Nothing at all :: Cannot catch real failure.
- The CEO's calendar :: No.
> Correct: What this instance needs to do its core job. Re-read the matching lesson section for the full reasoning.

Q: What does half-open do?
+ Lets a few trial calls through to test recovery
- Opens all connections :: No.
- Disables timeouts :: No.
- Doubles traffic :: No.
> Correct: Lets a few trial calls through to test recovery. Re-read the matching lesson section for the full reasoning.
```

```cards
degradation :: serve less rather than fail
circuit breaker :: stops calls to a failing dependency
half-open :: trial calls after cool-down
fail open :: allow when a check cannot run
fail closed :: deny when a check cannot run
load shedding :: drop optional work under pressure
```
