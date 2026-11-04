# Model answer: a managed database platform
prompt: db-platform
summary: A control plane that creates clusters with pooling, replication, backups and guardrails.

## The answer in one minute

Offer databases through an API that creates a primary, replicas, a pooler and backups with standard settings. Automate failover, restore tests and upgrades, give teams read-only visibility into performance, and enforce limits on connections and storage.

## The design

```diagram
title: Managed database platform design
node: api | Self-service API | 0 | 1 | Request, resize, restore. | Unreviewed changes.
node: ctl | Controller | 1 | 0 | Reconciles desired state. | A bug affects many clusters.
node: pool | Poolers | 1 | 2 | Transaction pooling. | Limits session features.
node: pri | Primary | 2 | 1 | Writes and WAL. | Single writer.
node: rep | Replicas | 3 | 0 | Reads and failover targets. | Lag.
node: bak | Backups and archive | 3 | 2 | Base plus WAL for point in time. | Untested restores.
node: obs | Monitoring | 4 | 1 | Lag, locks, bloat, slow queries. | Blind spots.
edge: api | ctl
edge: ctl | pri
edge: pool | pri
edge: pri | rep
edge: pri | bak
edge: pri | obs
```

## Every component, explained

### Self-service with defaults

A request creates a cluster with tested parameters, so teams get a safe database without tuning.

Example: A team gets a 3-node cluster with backups in about five minutes.

### Connection pooling

A pooler limits server connections and shares them between many clients.

Example: 500 application connections become 30 server connections.

### Automated failover

If the primary fails, the controller picks the most current replica, promotes it and moves the pooler, after fencing the old primary.

Example: Failover finishes in about 30 seconds with at most a second of data loss.

### Backups and restore tests

Base backups and archived WAL allow recovery to any time. A weekly job restores into a scratch cluster and checks data.

Example: A bad delete at 14:03 is recovered by restoring to 14:02:59.

### Guardrails

Limits on storage, connections and long transactions, and alerts on lag, bloat and locks.

Example: A transaction open for two hours triggers an alert before it blocks vacuum.

## Numbers to say out loud

- A fleet of 1000 clusters with daily backups needs a backup system sized for the total, often hundreds of TB.
- Each cluster holds hundreds of connections after pooling, not thousands.
- Replica lag target under 1 second, alert at 10.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Failover bug | Split brain or data loss | Fencing and rehearsals |
| Backup failure | Cannot restore | Restore tests |
| Upgrade problem | Downtime | Replica-first upgrades and rollback |
| Noisy tenant | Shared host pressure | Resource isolation |
| Controller outage | No changes | Clusters keep running without it |

## Follow-up questions to expect

- How do you do major version upgrades?
- How do you handle multi-region?
- What do you expose to users?
