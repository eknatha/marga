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

## The table that stopped accepting inserts
level: mid
A write fails on one big table while the rest of the database works.

```text
ERROR 1114 (HY000): The table 'bookmarks' is full
file size: 2.0T   limit: 2.0T
```
? What design habit was missing?
+ Tracking the distance to a single-node limit and partitioning or archiving early
- Adding more read replicas
- A longer connection timeout
- Disabling the query log
why: A hard limit is reached abruptly; partition or archive while there is room to copy.

## The backup that took three hours
level: mid
A restore test is timed for the first time.

```text
pg_restore: 2h 41m elapsed    RTO target: 60 minutes
```
? What should change?
+ Add snapshots or a warm standby for fast recovery and keep point-in-time recovery
- Run the backup more often only
- Delete the old backups
- Raise the RTO silently
why: Backup frequency sets RPO; restore speed sets RTO, and only a timed test shows it.

## One hot key
level: senior
One cache node is at 100 percent while the others are idle.

```text
node-3: 98% cpu, key "item:viral" 41% of requests
node-1, node-2: 6% cpu
```
? What helps most?
+ Replicate or edge-cache the hot key and add per-key limits
- Add more cache nodes without changes
- Shorten all TTLs
- Disable the cache
why: Hashing spreads keys, not the traffic to a single key.

## Alerts that never fired
level: mid
The error-rate alert stayed green during a total outage.

```text
error_rate: 0%   requests: 0   service: crash loop at start-up
```
? What is the gap?
+ The signal came from the service itself; measure at the edge and alert on missing traffic
- The threshold was too high
- The dashboard colours were wrong
- Logs were too long
why: A crashed service cannot report its own failure.

## A role that reads everything
level: senior
A service needs one bucket and has a broad storage role. A flaw is found in the service.

```text
role: storage-full-access   resources: *   credentials: long-lived
```
? What limits the blast radius?
+ Scope the role to the one bucket, use short-lived credentials and add access alerts
- Rename the role
- Add a second broad role
- Rotate the key yearly
why: The permission set is the blast radius of a compromise.

## Zones at 80 percent
level: mid
Three zones each run at 80 percent of capacity and one is lost.

```text
zone-a: down   zone-b: 120%   zone-c: 120%
```
? What was the design mistake?
+ No zone-loss headroom; run near 66 percent or shed low priority work
- Too many zones
- Too few dashboards
- A short TTL
why: Redundancy is real only if the survivors can carry the lost share.
