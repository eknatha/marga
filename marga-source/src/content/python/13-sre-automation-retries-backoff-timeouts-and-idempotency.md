---
title: SRE automation: retries, backoff, timeouts and idempotency
minutes: 12
summary: Make scripts survive flaky networks and APIs with timeouts, exponential backoff with jitter and idempotent operations, without causing retry storms.
---

Networks fail, APIs throttle and servers restart. A script that calls the network without a timeout can hang forever, and a script that retries blindly can make an outage worse. Good automation is patient, bounded and safe to run twice.

## What you will learn

- Set timeouts on every network call
- Retry only what is safe, with exponential backoff and jitter
- Make operations idempotent so a retry cannot double the effect
- Know when to stop and report

## Timeouts everywhere

Most HTTP libraries have no default timeout. Always set one, and separate connect from read time.

```python
import requests

resp = requests.get("https://api.example.com/v1/items", timeout=(3.05, 10))
resp.raise_for_status()
```

A timeout turns a silent hang into an error you can handle. Choose values from the real latency of the service, not from guesses, and keep an overall deadline for the whole job.

## Backoff with jitter

Retry transient failures only: connection errors, timeouts, `429` and `5xx`. Never retry `400`, `401`, `403` or `404` blindly, since the answer will not change. Wait longer after each attempt, and add randomness so many clients do not retry at the same moment.

```python
import random, time

def call_with_retry(fn, attempts=5, base=0.5, cap=20):
    for n in range(attempts):
        try:
            return fn()
        except (requests.ConnectionError, requests.Timeout) as err:
            if n == attempts - 1:
                raise
            delay = random.uniform(0, min(cap, base * 2 ** n))
            time.sleep(delay)
```

This is "full jitter": a random delay between zero and a growing limit. If a server sends a `Retry-After` header, obey it. Put a cap on total attempts and total time, and log each retry with its reason so you can see a pattern.

## Idempotency

An operation is idempotent when running it twice has the same effect as running it once. "Set replicas to 3" is idempotent. "Add one replica" and "create an order" are not. For non-idempotent calls, send an **idempotency key** (many APIs support one), check whether the thing already exists before creating it, or use "create if not exists" semantics. Then a timeout, where you do not know if the first call worked, is safe to retry.

## Circuit breaking and giving up

If a dependency is down, hammering it prevents recovery. Stop after a bounded number of failures, wait, and report clearly what was done and what was not. A script that finishes half the work should say which half, so a person or the next run can continue.

```predict
Q: A POST that creates a payment times out. Should the script simply retry it?
???
Only with an idempotency key or a check that the payment does not exist, because the first request may have succeeded.
> A timeout does not mean the request failed.
```

## Incident: The retry storm

> **Incident:** A short database failover turned into a 40-minute outage because every client retried immediately and in a tight loop.

```console
$ grep -c "retry" /var/log/app/client.log
184220
$ grep "attempt" /var/log/app/client.log | head -2
attempt 1 failed, retrying immediately
attempt 2 failed, retrying immediately
```

The failover took 20 seconds, but thousands of clients retried without delay and without limit, so the new primary was flooded as soon as it started and fell over again. The team added exponential backoff with jitter and a retry budget, put timeouts on every call, and made the job's writes idempotent so retries were safe. The next failover passed unnoticed.

## Common mistakes

- Calls with no timeout
- Retrying immediately or without a limit
- Retrying errors that can never succeed
- Retrying non-idempotent writes with no key

```quiz
Q: Why add jitter to backoff?
+ So clients do not all retry at the same moment
- To make the delay shorter always :: Jitter randomizes it.
- To avoid logging :: Unrelated.
- To skip timeouts :: Unrelated.
> Spreading retries prevents spikes.

Q: Which status codes are usually worth retrying?
+ 429 and 5xx, plus connection errors and timeouts
- 400 and 404 :: These will not change.
- 401 only :: Needs new credentials, not a retry.
- All of them :: Wasteful and risky.
> Retry transient failures only.

Q: What makes an operation idempotent?
+ Running it twice gives the same result as once
- It runs faster :: Not the definition.
- It uses less memory :: Not the definition.
- It never fails :: Not the definition.
> Safe to repeat.

Q: A request times out and you do not know if it worked. What makes a retry safe?
+ An idempotency key or an existence check
- Retrying faster :: Could duplicate the effect.
- Deleting logs :: Unrelated.
- Ignoring the result :: Leaves uncertainty.
> Make the operation repeatable.
```

```cards
Timeout :: bound every network call, connect and read
Full jitter :: random delay up to a growing limit
Retry only :: connection errors, timeouts, 429 and 5xx
Idempotent :: same effect when run twice
Retry budget :: cap total attempts and total time
```
