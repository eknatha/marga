## How do you approach a system design question?
level: junior
Follow a fixed order: clarify who uses it, what must never be wrong and the SLO; estimate requests per second, storage and peak; sketch the smallest design that meets the numbers; deep-dive the risky parts such as the data store and the rollout; walk the failure modes of every component; and finish by stating the trade-offs and what the design gives up. Writing assumptions down lets reviewers challenge the exact input that might be wrong.

## What is a cache stampede and how do you prevent it?
level: mid
A stampede happens when a popular key expires and many requests miss together, all querying the database for the same data, which slows it and makes the refill slower still. Prevent it with request coalescing so one request refills, jittered TTLs so keys do not expire together, serving stale data while refreshing in the background, and early refresh for hot keys. Also size the database for a cold cache, and warm the cache before shifting traffic after a restart.

## How do you make retries safe?
level: mid
Retry only errors that can succeed later, use exponential backoff with jitter and a cap, set timeouts shorter than the caller, and retry at one layer with a retry budget so three layers do not multiply load by twenty-seven. Make operations idempotent with a client-supplied key stored with the result in the same transaction, so a repeat returns the stored result instead of acting twice. Bound queues and send repeatedly failing messages to a dead-letter queue.

## Explain quorum and why clusters use odd sizes.
level: mid
A quorum is a majority, so any two quorums overlap in at least one node and a later read sees the latest committed write. Three nodes tolerate one failure and five tolerate two. A fourth node adds no tolerance over three, because the majority becomes three, so odd sizes give the same safety at lower cost. Spread members across failure domains, and remember that without a majority the cluster stops committing writes to preserve consistency.

## What is split brain and how do you prevent damage from it?
level: senior
Split brain is two nodes acting as leader at once, often because a paused or partitioned old leader does not know it was replaced. Prevent harm with fencing: every leadership carries an increasing token and the resource rejects writes with a lower one. Other tools are shutting off the old node, revoking its network access and verifying that only one writable primary exists. A lease alone is not enough because a paused process can outlive its lease.

## What is a cell-based architecture and what are its trade-offs?
level: senior
A cell is a complete independent copy of the service for a slice of customers, with a thin router that sends each customer to one cell. A fault is limited to that cell's share of users and rollouts can be staged cell by cell. The costs are duplicated infrastructure, harder cross-customer queries, a router that must be extremely reliable, and a hard maximum cell size to keep. Cells do not help against shared dependencies, so they must be mapped and minimised.

## How would you stop one tenant from taking down a shared service?
level: senior
Apply per-tenant quotas and fair queueing at the gateway, concurrency limits per service, and priority classes so overload sheds the least important work first. Use shuffle sharding so each tenant maps to a small random subset of workers and a poison request or heavy tenant affects few others. Return 429 with Retry-After and make clients back off with jitter. Sanity-check automated limits so they cannot drop to zero.

## How do you design for 99.99 percent availability?
level: senior
Start from the budget: about 4.3 minutes a month. Use cells and multiple regions, health-checked traffic steering with two DNS providers, synchronous replication within a region and a clear RPO across regions, staged rollout of code and configuration with automatic halt, load shedding, degradation paths and tested failover with survivor capacity. Write the failure modes with their blast radius and duration, and state the trade-offs. Zones and a load balancer alone do not reach four nines.

## How do you make configuration changes safe?
level: mid
Treat configuration as code: version, review and validate it with the real parser, including size and shape limits. Roll it out in stages with a bake time and automatic halt on error rate, let consumers keep the last known good file when input is invalid, provide a kill switch, and make sure rollback does not depend on the system that is broken. Avoid fast paths that skip staging, because emergencies are when they get used.

## How do you choose a partition key?
level: mid
Pick a key with many distinct values that spreads reads and writes evenly and keeps data used together on one partition. Check the largest value of the key and the share of traffic it carries, because a celebrity account, a huge tenant or a default value can make a hot partition even with hashing. Avoid sequential keys with range partitioning, use a large fixed number of logical partitions or consistent hashing so growth moves little data, and plan resharding before a node is full.

## What is the difference between replication and backup?
level: junior
Replication keeps live copies for availability and read scale, but it copies deletes and corruption within seconds. A backup is an independent copy you can restore to a point in time, ideally in another account or provider with separate credentials and protection against deletion. A backup only counts once a restore has been tested and timed against the recovery time objective.

## How would you design observability into a new service?
level: mid
Define SLIs and an SLO at the edge, emit the golden signals per route, label metrics by version and cell so rollouts can be compared and halted, carry a trace id through logs, metrics and traces, expose saturation signals for each limit, record change events, and set burn-rate alerts that page on symptoms. Keep an independent external probe and paging path, control label cardinality, and tier retention to control cost.

## How do you limit the damage of a stolen credential?
level: senior
Give each workload its own least-privilege identity with short-lived credentials, scope permissions to the resources it needs, segment environments and accounts, default-deny network policy, and log and alert on unusual use. Keep secrets in a manager, scan code and logs, and have a tested runbook for rotation and revocation. Treat support and build tools as production because they often hold broad access.

## How do you plan capacity for a launch?
level: senior
Forecast peak from average, a peak factor and known events, load test one unit at the SLO to find throughput at about 60 percent of its limit, then add N+1 and zone-loss headroom so survivors can carry the load. List the non-CPU limits on the path such as threads, connections and quotas, plan scale-up time and cold start, and agree what is shed if demand exceeds the plan. Record cost trade-offs and who accepted them.

## Design a URL shortener.
level: mid
Estimate about 40 writes and 4,000 reads per second for 100 million links a month, so reads and availability dominate. Use block-leased random keys to avoid collisions without a hot coordinator, a partitioned key-value store, a cache and CDN with jittered TTLs and negative caching, 302 redirects when counting clicks, asynchronous counts, abuse scanning and creation limits, and a plan for a viral key. Walk the failure table and state the trade-offs.

## Design a multi-tenant Kubernetes platform.
level: senior
Group tenants into several clusters by risk tier instead of one huge cluster, apply quotas, limit ranges, priority classes, pod security and default-deny network policy, cap per-tenant objects, and treat DNS, networking, ingress and admission webhooks as shared single points with redundancy and limits. Stage cluster upgrades through a canary cluster with pre-checks, keep a rebuild path, back up and restore the control plane, and spread critical services across clusters.
