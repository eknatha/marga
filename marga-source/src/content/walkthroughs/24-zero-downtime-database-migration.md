# Zero-downtime database migration
level: Advanced
modules: sql-ops, databases
lessons: sql-ops/replication-lag-vacuum-and-day-two-operations, sql-ops/indexes-that-help-and-indexes-that-hurt
summary: How to move a live database or change its schema while users keep working, and how to back out safely.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Move or change a database while the application stays up
- Keep a safe way back at every step
- Verify that data matches before the switch
- Keep the switch short and rehearsed

## The big picture

```diagram
title: Zero-downtime migration reference design
node: app | Application | 0 | 1 | Writes and reads through a connection string or proxy. | Hard-coded hosts make switching slow.
node: prox | Proxy or DNS name | 1 | 1 | Single place to move traffic. | Long DNS caches delay the switch.
node: old | Old database | 2 | 0 | Source of truth until cutover. | Writes after cutover to the wrong side are lost.
node: new | New database | 2 | 2 | Receives a copy and then takes over. | Version or setting differences cause surprises.
node: rep | Replication stream | 3 | 1 | Logical or physical replication keeps the new side current. | Lag at cutover loses recent writes.
node: chk | Data checks | 4 | 0 | Row counts, checksums and sample queries. | Skipping them hides silent corruption.
node: back | Rollback path | 4 | 2 | Reverse replication or a frozen old database. | Without it, a bad cutover is permanent.
edge: app | prox
edge: prox | old
edge: prox | new
edge: old | rep
edge: rep | new
edge: new | chk
edge: chk | back
```

## A request, step by step

1. Create the new database and copy a snapshot of the old one.
2. Start replication so the new database follows the old one with small lag.
3. Run data checks and read-only test queries against the new side.
4. Lower DNS time-to-live or use a proxy, and tell people when the switch will happen.
5. Stop writes briefly, wait until lag is zero, then point the proxy to the new database.
6. Watch errors and latency, keep reverse replication running, and decommission the old side after a safe period.

## Why the design looks like this

- **Replication before cutover** keeps the switch short.
- **A proxy or short TTL** lets traffic move in seconds.
- **Checks before and after** find differences while they are cheap to fix.
- **Reverse replication** gives a path back.
- **Expand then contract schema changes** keep old and new code working together.

## Scaling decisions

1. Rehearse on a copy of production and time every step.
2. Automate the checklist and the checks.
3. Do schema changes as add, backfill, switch, drop in separate releases.
4. Move small, low-risk databases first.
5. Keep the old database read-only for a period.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Replication lag at cutover | Recent writes are missing | Block writes and wait for zero lag |
| Sequence or ID gaps | Duplicate keys after switch | Set sequences ahead of the old maximum |
| Different version behaviour | Queries change plans | Test with production queries, compare plans |
| DNS cache | Some clients still write to the old side | Proxy, short TTL, close old connections |
| Lock during schema change | App stalls | Lock timeouts, concurrent index builds |
| No rollback | A bad cutover is stuck | Reverse replication and a clear decision point |

## Trade-offs

- A longer rehearsal costs time and removes surprises.
- Dual writes seem easy and create hard consistency problems.
- A short write freeze is simple and visible, and often acceptable.

```predict
Q: Right after cutover, inserts fail with duplicate key errors. What is the likely cause?
???
Sequences on the new database were not advanced past the maximum IDs from the old one, so new IDs collide with copied rows.
> Replication copies rows but not always sequence positions, so they must be set before accepting writes.
```
