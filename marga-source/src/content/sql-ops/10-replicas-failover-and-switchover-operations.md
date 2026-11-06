---
title: Replicas, switchover and failover operations
minutes: 13
summary: Run streaming replicas, tell planned switchover from emergency failover, avoid split brain and handle replication lag.
---

Replicas give you read capacity and a way to survive a lost server. The hard part is the moment of change: promoting a replica safely without two servers believing they are the primary.

## What you will learn

- Streaming replication and measuring lag
- Planned switchover versus emergency failover
- Split brain and fencing
- Rebuilding a failed primary

## Replication and lag

```sql
-- on the primary
SELECT client_addr, state, sent_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;

-- on a replica
SELECT now() - pg_last_xact_replay_timestamp() AS replay_delay;
```

Lag grows when replicas are slow, the network is busy or a long query on the replica conflicts with replay. Alert on both bytes and seconds. Reads from a lagging replica can return old data, so route read-your-own-write traffic to the primary.

## Switchover and failover

A **switchover** is planned: stop writes, let the replica catch up fully, promote it and demote the old primary with no data loss. A **failover** is unplanned: the primary is gone, you promote the most up-to-date replica and accept that some recent transactions may be lost if replication was asynchronous.

```bash
patronictl -c /etc/patroni.yml list
patronictl -c /etc/patroni.yml switchover --candidate db2 --scheduled now
```

Synchronous replication reduces data loss at the price of write latency and availability if the replica is down.

## Avoiding split brain

Use a **consensus** store and **fencing**: the old primary must be unable to accept writes before another is promoted, for example by losing its leader lock, being shut down or being cut off at the network layer. Clients should connect through a virtual address, proxy or DNS name that follows the leader.

## Rebuild

An old primary may have extra transactions. Rewind it with `pg_rewind` or rebuild it from a base backup, then join it as a replica. Never simply restart it as a primary.

## Incident: Two primaries

> **Incident:** A partitioned old primary kept accepting writes after promotion.

```console
db1: still accepting writes (leader lock lost 4m ago)
db2: promoted to primary
diverged writes: 1,842 rows on db1 only
```

The failover manager promoted db2 but nothing stopped db1 from running. Some application servers kept writing to it. The team enabled a watchdog so a node without the leader lock shuts down its database, moved clients behind a proxy that follows the leader, and wrote a runbook for reconciling data if it happens again.

## Common mistakes

- Promoting without fencing the old primary
- Restarting a failed primary as a primary
- Ignoring replica lag in application reads
- Automatic failover that was never tested

```quiz
Q: What is a switchover?
+ A planned role change with no data loss
- An unplanned crash :: No.
- A backup :: No.
- A table copy :: No.
> The replica catches up first.

Q: What is split brain?
+ Two servers both accepting writes as primary
- Two replicas reading :: No.
- A slow query :: No.
- A full disk :: No.
> Data diverges. The lesson section above explains why.

Q: How is split brain prevented?
+ Consensus and fencing
- More replicas only :: No.
- Faster disks :: No.
- Larger indexes :: No.
> Only one leader may write.

Q: What can a lagging replica return?
+ Stale data
- Wrong passwords :: No.
- No data ever :: No.
- Encrypted data :: No.
> Replay is behind the primary.
```

```cards
Switchover :: Planned promotion with no data loss
Failover :: Unplanned promotion after losing the primary
Fencing :: Making sure the old primary cannot write
pg_rewind :: Resyncs an old primary to follow a new one
```
