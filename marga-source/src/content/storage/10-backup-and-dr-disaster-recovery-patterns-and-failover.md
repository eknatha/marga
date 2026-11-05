---
title: Backup and DR: disaster recovery patterns and failover
minutes: 12
summary: Compare backup and restore, pilot light, warm standby and active-active designs, and plan data replication, DNS failover and failback for each recovery objective.
---

Disaster recovery (DR) is the ability to run your service somewhere else after losing a site, a region or an account. The right design depends on how much downtime and data loss the business accepts and how much it will pay. This lesson compares the standard patterns and the details that decide whether they work.

## What you will learn

- The four common DR patterns and their trade-offs
- Replicating data, and why order and consistency matter
- Traffic failover with DNS and load balancers
- Failback and keeping the DR site honest

## Four patterns

1. **Backup and restore**: copies of data and the code to rebuild live elsewhere. Cheapest, with an RTO of hours to days.
2. **Pilot light**: the core data layer runs and replicates continuously in the DR site, while application servers are off or minimal and are started on demand. RTO is tens of minutes to hours.
3. **Warm standby**: a smaller but complete copy runs all the time and scales up on failover. RTO is minutes.
4. **Active-active** (multi-site): several sites serve live traffic. RTO near zero, with the highest cost and the hardest data consistency problems.

Pick per service. A payment system may justify warm standby or active-active. An internal wiki can use backup and restore.

## Data is the hard part

Stateless servers are easy to rebuild. Data needs replication: asynchronous replication keeps latency low but can lose the last seconds on failover (non-zero RPO), while synchronous replication across distance adds latency to every write and can reduce availability. Decide RPO per data store, and ensure related data fails over together (a database and its object storage, a queue and its consumers), or you will see orders without their files. Think about secrets, certificates, container images and configuration, which must exist in the DR site before the disaster, not be fetched from the lost site.

## Moving traffic

```console
$ dig +short app.example.com
$ aws route53 list-health-checks --max-items 3
$ curl -s -o /dev/null -w '%{http_code}\n' https://dr.example.com/health
```

Common methods: DNS failover with health checks and a short TTL (some clients cache longer than the TTL), global load balancers or anycast addresses (faster, provider specific), and manual switching steps in a runbook. Decide who is allowed to trigger failover and with which evidence, since a false failover causes its own outage and a split-brain risk if both sites accept writes.

## Failback and keeping DR honest

After the primary returns, plan the way back: re-sync data in the reverse direction, switch traffic in a quiet window and then re-establish the original protection. Keep the DR site tested and in step with production: run infrastructure from the same code, deploy to both, use game days to fail over real traffic for non-critical services, and compare capacity so the DR site can carry the load. A DR site that is a year behind production will fail when you need it.

```predict
Q: You use asynchronous replication to another region and the primary fails with 5 seconds of replication lag. What is the cost of failing over?
???
Up to roughly 5 seconds of recent writes may be lost. That is the RPO of asynchronous replication, which must be acceptable to the business.
> Async replication means non-zero RPO.
```

## Incident: The standby that could not take the load

> **Incident:** When a region failed, the standby in the second region started but ran out of capacity within minutes and returned errors.

```console
$ kubectl get nodes --context dr-cluster | wc -l
4
$ kubectl get nodes --context prod-cluster | wc -l
36
```

The DR cluster had been sized for "a small copy" and had a quota limit on instance launches that nobody had raised. Autoscaling hit the quota after three nodes. Failover succeeded technically but the service was degraded for 90 minutes. The team raised quotas, pre-provisioned capacity for the critical tier, ran a load test on the DR site each quarter and added the DR capacity to the architecture review.

## Common mistakes

- Choosing a pattern without agreed RTO and RPO
- Replicating data but not secrets, images and configuration
- No decision rule for who triggers failover
- A DR site that drifts from production or lacks capacity and quota

```quiz
Q: Which pattern has a continuously replicating data layer but minimal application servers?
+ Pilot light
- Backup and restore :: No live replication.
- Active-active :: Full capacity in several sites.
- No DR :: Nothing runs.
> The pilot light keeps the data core alive.

Q: What is the RPO impact of asynchronous replication?
+ Some recent writes may be lost during failover
- No data is ever lost :: Only true for synchronous.
- All data is lost :: Not typical.
- It only affects reads :: Not the issue.
> There is a lag window.

Q: Why decide in advance who triggers a failover?
+ A wrong or late decision can cause an outage or split-brain
- To avoid testing :: Opposite.
- To save DNS records :: Unrelated.
- To remove monitoring :: Unrelated.
> Make the decision rule explicit.

Q: What often limits a DR site at failover?
+ Capacity and quota that were never raised or tested
- Too many dashboards :: Not a limit.
- Too many tags :: Not a limit.
- A long README :: Not a limit.
> Test DR at production load.
```

```cards
Backup and restore :: cheapest, RTO of hours to days
Pilot light :: data replicates, app servers start on demand
Warm standby :: small full copy, scales up on failover
Active-active :: several live sites, lowest RTO, highest cost
Failback :: plan the return path and re-sync
```
