---
title: Clocks, time and ordering
minutes: 13
summary: Why you cannot trust wall clocks to order events, and what to use instead.
---

Programs treat time as a simple number. In a distributed system it is not. Clocks drift, jump and disagree, and the same instant is seen differently by two machines. Designs that assume otherwise lose writes, expire locks early and crash on a leap second.

## What you will learn

- Distinguish wall-clock time from monotonic time
- Explain clock skew, jumps and leap seconds
- Order events with logical clocks and versions instead of timestamps
- Design timeouts and expiry that survive clock changes

## Two kinds of clock

**Wall-clock time** is the calendar date and time, synchronised by NTP. It can jump forwards or backwards when corrected. **Monotonic time** only moves forward and is meant for measuring durations. Use the monotonic clock for timeouts and elapsed time, and wall-clock only for showing dates and for coarse expiry.

## Skew and drift

Two servers can differ by milliseconds or, if sync breaks, by seconds or more. Last-write-wins by timestamp then silently discards the newer write when it comes from the slower clock. Do not use machine timestamps to decide which of two concurrent writes is correct.

## Leap seconds and other jumps

At midnight UTC on 1 January 2017, a leap second was inserted. Cloudflare's custom DNS software computed a time difference that became negative, a value the code assumed could not happen, and a call that panics on negative input failed. Customers with CNAME records saw errors until about 06:45 UTC. Other time bugs: expired certificates, date rollovers, daylight saving transitions, and a Microsoft Exchange date check that failed at the start of 2022. The pattern: code that assumes time only moves forward, evenly.

## Ordering without wall clocks

- **Logical clocks (Lamport):** a counter that increases with each event and each received message, giving an order consistent with cause and effect.
- **Version vectors:** per-replica counters that detect true concurrency, so a system can keep both versions and ask for a merge.
- **Database sequence or log offset:** let one authority assign order, as a stream partition does.
- **Hybrid logical clocks:** physical time plus a counter, close to real time and still ordered.

Some databases bound clock uncertainty with special hardware and then wait out the uncertainty before committing. You do not need this, but know the idea: if you must use time for ordering, state the error bound and handle it.

## Practical rules

- Run time sync everywhere and alert when offset grows.
- Use monotonic clocks for durations and timeouts.
- Never compute with a time difference you assume is positive; clamp or handle it.
- Store UTC; convert for display only.
- Test with the clock moved: forwards, backwards, a leap second, a daylight saving change, certificate expiry.
- Track every certificate expiry date; they are clocks too.

```predict
Q: Two replicas accept writes to the same key, and the system keeps the one with the later timestamp. One server's clock is 3 seconds slow. What goes wrong?
???
A newer write from the slow server can carry an older timestamp and be discarded, losing data silently. Use version vectors or a single ordering authority instead.
> Timestamps are not a safe tie-breaker across machines.
```

## How it fails

Silently, until the date arrives. A negative duration, an early expiry, a lock that two holders believe they own, a certificate that lapsed because nobody tracked it.

## Incident: A leap second and a negative number

> **Incident:** At midnight UTC a time difference computed by the DNS software was negative and a function that rejects negative values panicked.

```console
$ dig +short app.example.com CNAME
;; connection timed out; no servers could be reached
$ journalctl -u rrdns --since "00:00" | grep -i panic | head -2
panic: negative duration passed to random selection
```

The console output is a simulated illustration; the real timeline and Cloudflare's own explanation are in the case file. The fix was to handle the negative value, and the lasting lesson is to treat time inputs as untrusted and to test timestamps that move backwards.

## Interview question

"How do you make sure only one worker processes a job when clocks differ?" Do not depend on timestamps. Use a lock with a fencing token, or let a queue partition assign each job to a single consumer.

## Common mistakes

- Last-write-wins by wall-clock timestamp
- Measuring durations with the wall clock
- Assuming time differences are never negative
- No alert on clock offset or certificate expiry

```quiz
Q: Which clock should you use to measure a timeout?
+ The monotonic clock
- The wall clock :: It can jump.
- A database timestamp :: Not for durations.
- The user's browser clock :: Untrusted.
> Correct: The monotonic clock. Re-read the matching lesson section for the full reasoning.

Q: Why is last-write-wins by timestamp risky?
+ A slow clock can make a newer write look older and lose it
- It is always slower :: Not the issue.
- It needs more storage :: Not the issue.
- It breaks encryption :: Unrelated.
> Correct: A slow clock can make a newer write look older and lose it. Re-read the matching lesson section for the full reasoning.

Q: What orders events without wall clocks?
+ Logical clocks, version vectors or a single sequencing log
- Larger servers :: No.
- Faster networks :: No.
- More replicas :: No.
> Correct: Logical clocks, version vectors or a single sequencing log. Re-read the matching lesson section for the full reasoning.

Q: What went wrong in the 2017 Cloudflare leap second case?
+ A time difference became negative and the code could not handle it
- A disk filled up :: Not this case.
- A certificate expired :: Not this case.
- A BGP route was withdrawn :: Not this case.
> Correct: A time difference became negative and the code could not handle it. Re-read the matching lesson section for the full reasoning.
```

```cards
wall clock :: calendar time, can jump
monotonic clock :: forward only, for durations
skew :: difference between clocks
leap second :: extra second inserted into UTC
Lamport clock :: counter giving cause-consistent order
version vector :: per-replica counters that detect concurrency
```
