---
title: System design for platform and SRE
summary: The design order, estimation numbers, building-block rules and failure-containment patterns on one page.
module: system-design
---

## The order

```text
1. Clarify    - users, what must never be wrong, SLO
2. Estimate   - requests per second, storage, bandwidth, peak
3. Sketch     - smallest design that meets the numbers
4. Deep-dive  - the risky part: data store, queue, rollout
5. Failures   - slow, down, wrong, overloaded, for every box
6. Trade-offs - say what you gave up
```

## Numbers to remember

```text
seconds per day     ~ 100,000 (86,400)
1M requests/day     ~ 10 per second
100M requests/day   ~ 1,000 per second
peak versus average ~ 3x unless known
memory read ~100 ns | SSD read ~100 us | same-region RTT ~1 ms | cross-continent RTT 100-200 ms
99.9% = 43 min/month | 99.99% = 4.3 min/month | 99.999% = 26 s/month
```

## Building blocks in one line each

- **Cache:** jitter TTLs, coalesce refills, serve stale, warm before cutover, size the store for the cold case.
- **Queue:** assume at-least-once, make consumers idempotent, bound the queue, watch age not length.
- **Retry:** timeout shorter than the caller, exponential backoff with jitter, retry at one layer, use a budget.
- **Idempotency:** client key, stored with the result in one transaction.
- **Consistency:** pick per feature; fix stale reads with read-your-writes; alert on replication lag.
- **Quorum:** majority of an odd number; 3 tolerates 1, 5 tolerates 2; spread across zones.
- **Fencing:** the resource rejects a lower token; a lease alone is not enough.
- **Time:** monotonic for durations; never order by wall-clock across machines; handle negative differences.

## Containing failure

```text
failure domain   what one cause takes down together (process, host, zone, region, change)
cell             full independent copy for a slice of users, thin router, hard size limit
bulkhead         separate pools per dependency
shuffle shard    random worker subset per customer
canary           smallest stage with a stop signal and bake time
fail static      keep last known good on bad input
fail open/closed decide per check, write it down, test it
```

## Overload

```text
token bucket         steady refill, bounded burst
concurrency limit    cap in-flight work (protects slow paths)
shed by priority     batch first, critical last
signals              429 or 503 with Retry-After; clients back off with jitter
autoscaling          slow; limits hold the line meanwhile
```

## Multi-region

```text
RTO = time down       RPO = data lost, in time
backup/restore < pilot light < warm standby < active-active
survivors must carry the lost share (N regions need headroom)
two DNS providers; drill the failover; recovery tools off the failing system
```

## Retry arithmetic

```text
layers retrying  3 x 3 x 3  =  27 calls per user request at the bottom
fix: retry at one layer, jittered backoff, budget of ~10% of traffic
```

> **Warning:** Retries without jitter arrive in waves and keep a recovering service down.

## Failover checks

```bash
# who is writable? exactly one should answer false for recovery
psql -h NODE -Atc "select pg_is_in_recovery()"
# replication lag in seconds on a replica
psql -Atc "select extract(epoch from now()-pg_last_xact_replay_timestamp())"
```

> **Warning:** Never promote a node without fencing the old primary first, or two writers will diverge.

## Data

```text
partition key   many values, even load, keeps related data together; check the biggest value
range           cheap scans, hot end for sequential keys
hash            even load, scans hit all partitions
consistent hash ring + virtual nodes: adding a node moves ~1/N keys
storage engines B-tree: in-place pages, watch vacuum and bloat | LSM: append and compact, watch compaction debt
replication     leader/follower | multi-leader (conflicts) | leaderless (R + W > N)
backup          RPO sets frequency, RTO sets restore speed; independent copy; timed restore test
```

> **Warning:** Replicas copy deletes. A backup you have not restored is a hope.

## By design: observability, security, cost

```text
observability  SLI at the edge | golden signals | per-version and per-cell labels | trace id in logs
               independent probe and paging path | dead-man's switch | cap cardinality
security       trust boundaries | least privilege | short-lived workload credentials | default-deny network
               separate accounts and keys | audit logs | secret rotation runbook
cost/capacity  measure unit throughput at the SLO | N+1 and zone loss (3 zones: run under ~66%)
               list non-CPU limits | scale on leading signals | write down savings that cut redundancy
```

## Change safety checklist

1. Can it be previewed on real data?
2. Smallest first stage and stop signal?
3. Previous good state and rollback time?
4. What does the consumer do with garbage?
5. Does the fixer depend on the broken thing?

> **Warning:** A second zone does not protect against a change pushed to every zone at once. Count shared things, not copies.

> **Warning:** A status page, runbook or monitoring tool hosted on the failing platform will fail with it. Host them independently.

> **Warning:** Automated quotas and limits need a floor. A limit that can reach zero is an outage waiting for a bad input.
