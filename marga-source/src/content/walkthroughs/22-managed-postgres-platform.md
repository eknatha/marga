# A managed Postgres platform for many teams
level: Advanced
modules: sql-ops, databases
lessons: sql-ops/connections-pooling-and-capacity, sql-ops/replication-lag-vacuum-and-day-two-operations
summary: How a platform team offers databases as a service with backups, failover, pooling and guardrails.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Create a database for a team in minutes with sensible defaults
- Survive a node failure with little data loss
- Protect the database from connection storms and bad queries
- Give teams visibility without full superuser power

## The big picture

```diagram
title: Managed Postgres platform reference design
node: team | Application teams | 0 | 1 | Request a database through a form or API. | Direct superuser access bypasses guardrails.
node: ctl | Platform controller | 1 | 0 | Creates clusters, users, parameters and backups. | A bug here changes many databases.
node: pool | Connection pooler | 1 | 2 | PgBouncer in transaction mode in front of each primary. | Session-state features break in transaction mode.
node: pri | Primary | 2 | 1 | Accepts writes, ships WAL to replicas and archive. | Its loss without a good replica loses data.
node: rep | Replicas | 3 | 0 | Serve reads and stand by for failover. | Lag makes reads stale and failover lossy.
node: arc | Backup and WAL archive | 3 | 2 | Base backups plus continuous WAL for point-in-time restore. | An untested backup is a hope, not a plan.
node: obs | Monitoring and slow-query log | 4 | 1 | Connections, locks, vacuum, lag, slow queries. | Without it, problems appear as outages.
edge: team | pool
edge: ctl | pri
edge: pool | pri
edge: pri | rep
edge: pri | arc
edge: pri | obs
edge: rep | obs
```

## A request, step by step

1. A team asks for a database. The controller creates a primary, replicas, a pooler and a user with limited rights.
2. The application connects through the pooler, which shares a few server connections among many clients.
3. Writes go to the primary and are streamed to replicas and archived to object storage.
4. Monitoring tracks connections, replication lag, long transactions and dead rows.
5. If the primary fails, the controller promotes the most up-to-date replica and moves the pooler to it.
6. To recover from a mistake, the team restores to a point in time into a new cluster and compares.

## Why the design looks like this

- **A pooler per cluster** protects the server from connection storms.
- **Continuous archiving** allows recovery to any second.
- **Limited roles** stop teams from changing server settings.
- **Standard parameters** make clusters behave the same.
- **Automated restore tests** prove that backups work.

## Scaling decisions

1. Start with one primary, one replica and daily backups.
2. Add the pooler and set connection limits by team.
3. Add automated failover with fencing of the old primary.
4. Add slow-query reports and index advice.
5. Automate major version upgrades with rehearsals.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Connection storm | Database refuses connections | Pooler, limits, alerts at 80 percent |
| Replica lag | Stale reads, lossy failover | Alerts, workload separation, tuned conflict settings |
| Vacuum falls behind | Bloat and slow queries | Per-table settings, no forgotten transactions |
| Bad migration | Locks block the app | Review, lock timeouts, concurrent index builds |
| Backup not restorable | Data loss in a disaster | Weekly restore tests |
| Failover loses data | Writes acknowledged then missing | Synchronous commit where needed, fencing |

## Trade-offs

- Strong guardrails reduce incidents and limit power users.
- Synchronous replication adds safety and write latency.
- Transaction pooling saves connections and restricts session features.

```predict
Q: Replicas lag by ten minutes after a team starts a large report. What do you check and change?
???
Whether the report holds back replay on the replica, the conflict delay settings, and whether to move the report to a dedicated replica.
> Long queries on a replica can block replay, so heavy reporting needs its own replica or tuned settings.
```
