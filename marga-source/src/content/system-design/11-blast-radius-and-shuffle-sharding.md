---
title: Blast radius and shuffle sharding
minutes: 13
summary: Measure how much a fault can reach, and use shuffle sharding to make one bad client or request unable to hurt the rest.
---

Blast radius is the share of users or data a single fault can reach. Good designs set a target for it and then show how each fault stays inside it. A poison request, a noisy tenant or a bad deploy should hurt a few, not everyone.

## What you will learn

- Define blast radius and set a target
- Reduce it with staged rollout, cells and sharding
- Explain shuffle sharding and compute its effect
- Handle the poison request and the noisy tenant

## Blast radius as a number

For each kind of fault write the share affected: a crashed host, a bad deploy, a poisoned input, a lost zone, a bad config. If a bad deploy reaches 100 percent, no amount of zone redundancy gives you a four-nines design. Targets guide choices: a rollout in four stages of 1, 5, 25 and 100 percent limits an undetected bad build to 1 percent for the first detection window.

## Sharding to shrink it

If customers are divided among N shards, one customer's fault reaches 1/N of customers. But sharding by customer id alone has a flaw: the unlucky customers sharing the shard with a bad one are always the same.

## Shuffle sharding

Instead of mapping a customer to one shard, assign each customer a small random subset of workers, for example 2 out of 8. A poison customer takes down only the workers in its subset. Another customer is hurt only if their whole subset overlaps, and even then they still have a surviving worker if the subsets differ.

Example: 8 workers, each customer gets 2. The number of distinct pairs is 28 (8 choose 2). A given other customer shares both workers with the bad customer with probability 1/28, about 3.6 percent, and loses only one worker with some probability but still has one left in most cases. With plain 4 shards of 2 workers, a bad customer would take out one quarter of customers entirely. Larger fleets give much better numbers: with 100 workers and subsets of 5, there are about 75 million combinations. Clients that retry across their subset will route around the damage.

Shuffle sharding needs clients, or a router, that retry on another worker in their subset, and it assumes faults follow the customer (a poison request, a heavy tenant), not the infrastructure.

## Poison requests

A request that crashes the worker that handles it, and which clients then retry onto other workers, spreads like a fire. Defences: shuffle sharding, crash isolation, request validation at the edge, limits on retries, and a "quarantine" that stops a repeatedly failing request from being retried at all. A new unprotected code path with blank policy fields crashed Google's Service Control worldwide in June 2025; see the case file.

## Noisy tenants

One tenant using too much hurts others unless there are per-tenant limits, quotas and fair queueing. Quotas that are too coarse fail others; quotas wrong in the other direction fail the tenant. Google's 2020 authentication outage came from an automated quota system that set the quota of a core service to zero because an older system reported its usage as zero. Automated limits need sanity checks and slow, staged application.

## Rollout as blast radius control

Stage by cell, region or percentage; watch a bake time with real health signals; stop automatically on regression. The first stage should be small enough to survive being wrong and large enough to carry real traffic.

```predict
Q: 100 workers, each customer gets a random set of 5. One customer sends a poison request that kills any worker it reaches. How many workers can it take out, and is every other customer affected?
???
At most 5 workers. Other customers lose workers only if their subsets overlap, and few overlap fully, so most keep service by retrying on the rest of their subset.
> Subset size sets the damage, overlap sets who else is hurt.
```

## How it fails

Shuffle sharding fails when faults are in shared infrastructure (a bad deploy to all workers) or when clients do not retry across the subset. Staged rollouts fail when the bake time is too short to catch slow failures, or when health checks measure the wrong thing.

## Incident: One request crashed the fleet

> **Incident:** A change with blank fields reached binaries that had a new, unprotected feature. A null pointer caused a crash loop everywhere.

```console
$ gcloud logging read 'severity>=ERROR' --limit 3 --format='value(textPayload)'
panic: nil pointer dereference in policy check
panic: nil pointer dereference in policy check
panic: nil pointer dereference in policy check
```

The console lines are a simulated illustration. In the real 12 June 2025 incident the replicated policy data reached all regions within seconds, and the fleet crash-looped; a feature flag and staged rollout of the binary feature would have bounded it. See the case file for the sourced timeline and Google's remediation list.

## Interview question

"How do you stop one tenant taking down a shared service?" Per-tenant quotas and fair queueing, shuffle sharding for isolation, and automatic limits on retries from that tenant.

## Common mistakes

- Percentage rollouts with no bake time
- Global data replication of configuration within seconds with no staging
- Per-tenant limits missing or applied without sanity checks
- Assuming sharding isolates faults that live in shared code

```quiz
Q: What does shuffle sharding give each customer?
+ A small random subset of workers
- A dedicated cluster :: Too costly.
- A copy of the database :: Not the idea.
- The whole fleet :: That is no isolation.
> Correct: A small random subset of workers. Re-read the matching lesson section for the full reasoning.

Q: With 8 workers and subsets of 2, how many distinct subsets exist?
+ 28
- 8 :: That is one worker each.
- 16 :: No.
- 56 :: That counts ordered pairs.
> 8 choose 2. Re-read the matching lesson section for the full reasoning.

Q: Which fault does shuffle sharding NOT help with?
+ A bad deploy to every worker
- A poison request from one customer :: It helps.
- A noisy tenant :: It helps.
- One crashing worker :: It helps.
> Correct: A bad deploy to every worker. Re-read the matching lesson section for the full reasoning.

Q: What should a rollout stage include besides a small percentage?
+ A bake time with health checks that can stop it
- A larger team :: No.
- More dashboards only :: No stop condition.
- A holiday freeze :: Not the control.
> Correct: A bake time with health checks that can stop it. Re-read the matching lesson section for the full reasoning.
```

```cards
blast radius :: share of users a fault reaches
shuffle sharding :: random worker subset per customer
poison request :: input that crashes what handles it
bake time :: wait and watch between stages
quota :: per-tenant limit
fair queueing :: share capacity among tenants
```
