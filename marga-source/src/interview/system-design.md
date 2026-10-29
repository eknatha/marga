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
