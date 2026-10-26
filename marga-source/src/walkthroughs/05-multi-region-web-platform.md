# A multi-region web platform with failover
level: Advanced
modules: cloud, networking, databases, sre
lessons: cloud/high-availability-and-disaster-recovery, databases/replication-and-failover, sre/production-readiness-reviews
summary: How to run a service from two cloud regions, route traffic with health checks, replicate data and practise failing over.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Keep serving users when a zone or an entire region fails
- Recover within agreed time (RTO) and data loss (RPO) targets
- Keep latency low for users in different parts of the world
- Stay affordable and operable by a normal team

## The big picture

```diagram
title: Active and standby regions
node: users | Users | 0 | 1 | Connect through a global name. | Cached DNS answers can keep sending them to a failed region.
node: route | Global routing | 1 | 1 | DNS or an anycast load balancer with health checks. | Without health checks it keeps sending traffic to a dead region.
node: a_app | Region A application | 2 | 0 | Runs across several zones behind a regional load balancer. | All zones share a single misconfiguration in a deploy.
node: b_app | Region B application | 2 | 2 | Same version, running at reduced or full capacity. | Untested standby capacity fails exactly when needed.
node: a_db | Primary database | 3 | 0 | Accepts writes in region A. | Losing it triggers the failover decision.
node: b_db | Replica in region B | 3 | 2 | Receives changes from A, ready for promotion. | Cross-region lag means some recent writes can be lost.
node: obj | Replicated object storage | 4 | 1 | Files and backups copied to both regions. | Replication can copy a deletion too without versioning.
node: ci | Pipeline and config | 0 | 2 | Deploys the same release to both regions from one source. | A shared bad release defeats having two regions.
edge: users | route
edge: route | a_app
edge: route | b_app
edge: a_app | a_db
edge: b_app | b_db
edge: a_db | b_db
edge: a_db | obj
edge: b_db | obj
edge: ci | a_app
edge: ci | b_app
```

## What a regional failover looks like

1. Monitoring and synthetic checks show region A failing from the outside.
2. Routing stops sending new users to A, using health checks or a manual decision.
3. The team confirms region A's database is unavailable and decides to promote region B's replica. This is a decision with a data-loss cost, so it is made by a named person against a runbook.
4. Region B's application is scaled up and pointed at the promoted database.
5. Caches warm, queues drain, and monitoring confirms that errors and latency return to normal.
6. Later, region A is rebuilt as the standby and data is resynchronised.

## Design choices

- **Active-active** serves from both regions all the time. It gives the best availability and latency, and the hardest data problems (conflicting writes).
- **Active-passive (warm standby)** keeps the second region running at small scale. Failover is faster than cold, cheaper than active-active.
- **Backup and restore** into another region is cheapest, with the longest recovery time.
- Choose by RTO and RPO, not by taste. Each step toward lower numbers costs more and adds complexity.

## Things that catch teams out

- **Capacity**: if region B must carry all traffic, quotas, instance limits and database sizes must allow it, and be checked.
- **Dependencies in one region**: authentication, DNS zones, secrets, the container registry and the CI system can quietly live in region A only.
- **Configuration drift**: region B was last deployed three weeks ago.
- **Failback**: moving back is as risky as failing over and needs its own plan.
- **Human factors**: runbooks must be tested, and the on-call engineer must know who can approve a promotion.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Failover never rehearsed | Steps fail in an emergency | Regular game days |
| Replica far behind | More data lost than the RPO | Monitor lag, alert on thresholds |
| Split brain | Both regions accept writes | Fencing and a single promotion authority |
| Shared bad release | Both regions fail | Staged rollouts, one region at a time |
| Cached DNS | Users stay on the dead region | Low TTL, health-checked anycast |
| Region B capacity too small | Failover causes a second outage | Capacity tests and reserved quotas |

## Trade-offs

- Every extra region doubles parts of the bill and the operating work.
- Cross-region synchronous replication protects data and adds latency to every write.
- Often the right answer is multi-zone in one region plus a well-tested backup and restore plan, and a second region only for services that truly need it.

```predict
Q: Region B has been in standby for six months and has never received real traffic. Why is that risky and what do you do about it?
???
It may be missing quota, capacity, configuration, secrets or dependencies, so failover could fail at the worst time. Run regular failover exercises, send a small share of real traffic to it, and keep it deployed from the same pipeline.
> A standby that is never used is an unproven assumption.
```
