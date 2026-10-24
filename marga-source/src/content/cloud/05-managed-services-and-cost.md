---
title: Managed services, reliability and cost
minutes: 16
summary: Use managed databases, queues and DNS well, design for failure across zones, and keep spending visible and under control.
---

Operating a database yourself means owning backups, patching, failover and tuning. A managed service takes most of that work, and you pay for it in money and some loss of control. Deciding what to run yourself and what to rent is one of the most valuable judgments a cloud engineer makes.

## What you will learn

- Common managed services and what they replace
- High availability versus disaster recovery
- Recovery objectives (RTO and RPO)
- A cost-control routine

## Managed services worth knowing

| Need | AWS | Azure |
|------|-----|-------|
| Relational database | RDS, Aurora | Azure Database for PostgreSQL, MySQL; Azure SQL |
| Key-value / document store | DynamoDB | Cosmos DB |
| Cache | ElastiCache | Azure Cache for Redis |
| Queue and messaging | SQS, SNS, EventBridge | Service Bus, Event Grid |
| DNS | Route 53 | Azure DNS |
| Content delivery | CloudFront | Azure Front Door, CDN |
| Secrets | Secrets Manager, Parameter Store | Key Vault |
| Monitoring | CloudWatch | Azure Monitor |

Queues deserve a special mention. Putting a queue between components absorbs bursts, lets a slow consumer catch up, and means a failure in one part does not instantly break the rest. Design consumers to be **idempotent**, because delivery may be repeated.

## High availability and disaster recovery

They answer different questions:

| | High availability (HA) | Disaster recovery (DR) |
|---|-----------------------|------------------------|
| Protects against | A component or zone failing | Losing a whole region or a data-destroying event |
| Typical design | Multiple zones, automatic failover | Backups elsewhere, a second region |
| Recovery | Automatic, seconds to minutes | Planned, minutes to hours or more |

Two numbers define the target for any system:

- **RTO** (recovery time objective): how long can we be down?
- **RPO** (recovery point objective): how much recent data can we afford to lose?

An RPO of 24 hours is met by nightly backups. An RPO of 5 minutes needs continuous replication. Tighter objectives cost much more, so agree on them with the business per system, not as one blanket number. A disaster recovery plan that has never been **exercised** is a hypothesis.

For a managed database, enable Multi-AZ (AWS) or zone-redundant HA (Azure) for availability, automated backups with point-in-time recovery for data protection, and deletion protection to stop an accidental removal.

## Infrastructure that fails gracefully

- **Timeouts and retries with backoff** on every network call
- **Health checks** that remove unhealthy instances
- **Graceful degradation**: if recommendations are down, still show the product page
- **Limit blast radius** with separate accounts, zones and per-service quotas
- **Test failure** deliberately: stop an instance, fail over a database, and see what actually happens

## Controlling cost

| Practice | Effect |
|----------|--------|
| Budgets with alerts at 50%, 80%, 100% | No surprises at month end |
| Tags: `owner`, `env`, `service` | Costs can be attributed |
| Review the top five cost items monthly | Most savings sit in a few services |
| Right-size from measured use | Stops paying for idle capacity |
| Commitments for steady load | Large discounts for predictable baseline |
| Shut down non-production out of hours | Often saves more than half of those costs |
| Delete orphans: disks, snapshots, IPs, load balancers | Removes waste with no impact |

```console
$ aws ec2 describe-volumes --filters Name=status,Values=available \
    --query 'Volumes[].{id:VolumeId,gb:Size}' --output table
```

Unattached ("available") volumes are paying for storage nobody uses.

Watch data transfer. Traffic between zones, out to the internet and between regions is billed, and chatty cross-zone designs can create surprising charges.

## Incident: a database failover causes an outage anyway

> **Incident:** The primary database's zone fails. Multi-AZ failover happens in about a minute, but the application stays down for 25 minutes.

The database did its job. The application did not:

```console
$ kubectl logs deploy/shop-api -n shop --tail 4
ERROR connection refused to 10.20.20.15:5432
ERROR connection refused to 10.20.20.15:5432
ERROR connection refused to 10.20.20.15:5432
```

The application connected using the database's **IP address**, which it cached. After failover the endpoint's DNS name points at the new primary, but the app never re-resolved it. Fixes: connect using the **DNS endpoint** the service provides, never an IP; keep DNS caching time low in the client; make the client reconnect with backoff when connections drop; and run a **failover exercise** on a schedule so you discover this in a test, not at 3 a.m. Also record the real recovery time from the exercise, since it is the honest figure to compare with the agreed RTO.

## Common mistakes

- Treating Multi-AZ as a backup
- Using IP addresses instead of service DNS names
- Setting RTO and RPO as numbers nobody has tested
- No cost alerts or ownership tags
- Running self-managed databases without anyone responsible for restores

```quiz
Q: What does RPO describe?
- How long recovery may take
+ How much recent data loss is acceptable
- How many zones are used
- The size of a backup
> Recovery point objective is measured as time of data lost.

Q: Which feature protects against a single availability zone failing?
- Daily snapshots only
+ Multi-AZ or zone-redundant deployment with automatic failover
- A bigger instance
- Versioning
> HA across zones keeps the service running through a zone failure.

Q: Why should applications connect to a database through its DNS name?
- It is encrypted
+ After failover the name points to the new primary, while an IP address does not
- DNS is faster
- IP addresses are not allowed
> Managed failover updates the endpoint's DNS record.

Q: Which action usually removes cost without any user impact?
- Deleting production databases
+ Removing unattached disks and old snapshots
- Disabling monitoring
- Removing tags
> Orphaned resources provide no value but continue to be billed.
```

```cards
RTO vs RPO? :: RTO is how long you can be down; RPO is how much data you can lose
HA vs DR? :: HA survives component or zone failures automatically; DR recovers from losing a region or data
Why use a queue between components? :: It absorbs bursts and isolates failures, but consumers must handle repeats
Why exercise failover? :: To find real recovery times and hidden flaws before an actual incident
```
