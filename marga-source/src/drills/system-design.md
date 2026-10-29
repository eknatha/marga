## The cache that came back empty
level: mid
After a restart the cache is empty and the database falls over within a minute.

```text
cache hit rate: 0%      db active connections: 400/400
db cpu: 100%            request p99: timeout
```
? What should the design have done?
+ Warmed the cache and ramped traffic, with the database sized for the miss rate
- Added more cache keys
- Increased client timeouts
- Disabled monitoring
why: A cold cache sends the full read load to the store it protects.

## Retries on every layer
level: mid
A dependency slows down and its callers make it worse.

```text
gateway retries: 3    service retries: 3    client retries: 3
calls reaching the dependency per user request: up to 27
```
? What is the best fix?
+ Retry at one layer with jittered backoff and a retry budget
- Add one more retry layer
- Remove all timeouts
- Retry immediately and faster
why: Layered retries multiply load exactly when the dependency is weakest.

## Stale after save
level: junior
A user saves a profile and the next page shows the old one.

```text
write: primary at 10:00:01
read:  replica at 10:00:02 (replication lag 3s)
```
? What is the likely cause?
+ The read went to a lagging replica
- The database lost the write
- The browser cache is full
- TLS expired
why: Replication lag explains a correct primary and a stale read.

## Two primaries
level: senior
After a failover both nodes report they are writable.

```text
old-primary: pg_is_in_recovery = false
new-primary: pg_is_in_recovery = false
```
? What protection was missing?
+ Fencing of the old primary before promotion
- A bigger disk
- More read replicas
- A shorter TTL
why: Without fencing, a paused or partitioned leader keeps writing.

## One bad file everywhere
level: senior
A generated file doubles in size and proxies crash fleet-wide.

```text
features.json: 2.4 MB (was 1.2 MB)   proxy: feature count exceeds limit, aborting
```
? What would have limited the damage?
+ A pre-publish size check, staged rollout and a loader that keeps the last good file
- A faster push to all regions
- More proxy instances
- A longer log retention
why: Both the producer and the consumer need guards, and the push must be staged.

## The survivor overloads
level: mid
Two regions each run at 60 percent. One region fails.

```text
region-a: failed    region-b: 120% of capacity    error rate rising
```
? What was missing?
+ Headroom or priority shedding so the survivor can carry the lost share
- A third DNS record
- A lower TTL on every record
- A bigger cache
why: Active-active needs capacity for the lost share, or deliberate shedding.

## Limiter store down
level: mid
The shared store behind the rate limiter is unreachable.

```text
limiter: connect timeout   gateway: rejecting 100% of requests with 429
```
? What should the limiter do when its store is down?
+ Fail open with a local limit as a floor
- Reject everything
- Disable all limits permanently
- Double the global limit
why: A limiter fault should not become an outage; keep a local floor.

## Quota at zero
level: senior
An automated quota system sets a core service quota to zero.

```text
quota: 0   used: 0   status: LIMIT_REACHED   auth requests failing
```
? What design guard was missing?
+ A sanity floor and staged application of automated limits
- A larger cache
- More replicas
- Shorter DNS TTLs
why: Automated limits are a dependency and need floors and staged changes.
