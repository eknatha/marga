---
title: High availability and disaster recovery in the cloud
minutes: 15
summary: Design for failure at the level of instance, zone and region, choose between backup, pilot light, warm standby and active-active, and prove recovery targets with tests.
---

Everything fails eventually: disks, hosts, whole data centres, sometimes an entire region, and often people (a bad deploy, a wrong command). High availability keeps a service running through small failures automatically. Disaster recovery restores it after large ones. They have different costs and different tests, and you need to choose them on purpose, based on what an hour of downtime costs.

## What you will learn

- Failure domains: instance, zone, region, account, provider
- Recovery time objective (RTO) and recovery point objective (RPO)
- The four disaster recovery patterns
- Data replication and its trade-offs
- Testing: restore drills and failover exercises

## Failure domains

| Domain | Typical failure | Protection |
|--------|-----------------|------------|
| Instance | Hardware or process crash | Auto scaling, health checks, stateless design |
| Zone | Power or network issue in one data centre | Spread across at least two or three zones |
| Region | Large regional outage, bad regional dependency | Second region |
| Account | Compromised or deleted account, billing lock | Backups in a separate account |
| Human | Wrong delete, bad deploy, ransomware | Backups, versioning, immutable copies, change control |

Multi-zone design covers most hardware and data-centre failures cheaply and should be the default. Multi-region design is much more expensive and complex; use it when the business requires it.

## RTO and RPO

**RTO** is how long you can be down. **RPO** is how much data you can lose, measured in time since the last good copy. An RPO of 15 minutes needs backups or replication at least that often. Ask the business what each costs per hour, then pick a design that matches, not the biggest one available.

## Disaster recovery patterns

| Pattern | What runs in the second region | RTO | RPO | Cost |
|---------|-------------------------------|-----|-----|------|
| Backup and restore | Only backups copied over | Hours | Hours | Lowest |
| Pilot light | Data replicated; minimal core services off or tiny | Tens of minutes | Minutes | Low |
| Warm standby | Full stack at reduced size | Minutes | Seconds to minutes | Medium |
| Active-active | Full stack serving traffic in both | Near zero | Near zero | Highest |

## Data is the hard part

Stateless services are easy to rebuild. Data needs replication: synchronous replication has no loss but adds latency and can stop writes if the link breaks; asynchronous replication is faster but may lose the latest writes. Replication copies mistakes too: a deleted table is deleted everywhere, so keep point-in-time recovery and separate backups. Test restores, because an untested backup is a hope.

## Traffic and automation

Use health-checked DNS or a global load balancer to move traffic. Keep DNS TTLs low enough for your RTO. Define everything as code so the second region can be created by a pipeline, not by memory. Keep secrets, container images and configuration available in the second region, and check that quotas there are high enough.

## Prove it

```console
$ aws rds restore-db-instance-to-point-in-time \
    --source-db-instance-identifier shop-prod \
    --target-db-instance-identifier shop-restore-test \
    --restore-time 2026-10-20T09:00:00Z
```

Run restore drills each quarter and time them. Run a failover exercise (a game day) that actually moves traffic, and record the measured RTO and RPO. Update the runbook with what you learn.

```predict
Q: Your database is replicated to a second region, and an engineer drops a table by mistake. Does the replica save you?
???
No, the drop is replicated too. You need point-in-time recovery or a separate backup taken before the mistake.
> Replication protects against hardware and site failure, not against logical errors.
```

## Incident: the failover that did not work

> **Incident:** A region becomes unavailable and the team starts a failover that had never been tested. It takes nine hours instead of the planned one.

```console
$ terraform plan -var region=eu-west-1
Error: creating RDS Cluster: DBSubnetGroupDoesNotExist
Error: InstanceLimitExceeded: You have requested more instances than your quota
```

Network pieces were missing in the second region, the instance quota there was too low, and the latest container image had not been replicated. After the event the team replicated images, raised quotas, kept the stack as code that applies cleanly in both regions, and ran a quarterly failover drill with measured results.

## Common mistakes

- Treating replication as backup
- Never testing a restore or failover
- Choosing multi-region without a business reason
- Forgetting quotas, secrets and images in the second region

```quiz
Q: What does RPO measure?
- How long recovery takes :: That is RTO.
+ How much data can be lost, measured in time
- The number of servers :: Unrelated.
- The cost :: Unrelated.
> An RPO of 15 minutes means up to 15 minutes of data may be lost.

Q: Which pattern keeps a minimal environment ready and data replicated?
- Backup and restore :: Nothing runs in advance.
+ Pilot light
- Active-active :: Both regions fully serve.
- Single zone :: Not a disaster recovery pattern.
> A pilot light is scaled up when needed.

Q: Why is replication not a backup?
+ It also copies mistakes and deletions
- It is too slow :: Not the reason.
- It cannot cross regions :: It can.
- It needs a licence :: Unrelated.
> Keep point-in-time recovery and separate copies.

Q: How do you know your recovery targets are real?
+ Run timed restore and failover drills
- Read the documentation :: It proves nothing.
- Buy more storage :: Unrelated.
- Wait for an incident :: Too late.
> Measured results replace assumptions.
```

```cards
RTO? :: How long you can be down
RPO? :: How much data you can lose, in time
Cheapest DR pattern? :: Backup and restore
Why is replication not backup? :: It copies deletions and errors
How to prove DR works? :: Timed restore and failover drills
```
