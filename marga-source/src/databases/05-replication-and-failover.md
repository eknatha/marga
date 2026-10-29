---
title: Replication, high availability and failover
minutes: 16
summary: Understand primary and replica setups, synchronous and asynchronous replication, replication lag, failover and split brain, and read scaling.
---

One database server is a single point of failure. Replication keeps copies on other machines so you can survive a failure, spread read load, and do maintenance with little downtime. It also introduces new problems: lag, failover and the risk of two servers both believing they are in charge.

## What you will learn

- Primary and replica roles
- Asynchronous and synchronous replication
- Replication lag and stale reads
- Failover and split brain
- Managed high availability

## Primary and replicas

The **primary** accepts writes. **Replicas** receive the stream of changes (the write-ahead log in PostgreSQL, the binary log in MySQL) and apply them. Replicas can serve read-only queries and can be promoted to primary.

## Asynchronous or synchronous

| Mode | Commit returns when | Trade-off |
|------|---------------------|-----------|
| Asynchronous | The primary has written locally | Fast, but a primary crash can lose the last few commits |
| Synchronous | At least one replica has confirmed | No acknowledged commit lost, but slower and a stuck replica can stall writes |

Many teams use synchronous replication to a nearby replica for durability and asynchronous replicas elsewhere for reads and disaster recovery. Choose based on the RPO you agreed.

## Lag

Replicas apply changes after the primary, so reads from a replica may be slightly old. That is **replication lag**.

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replay_delay;
SELECT client_addr, state, sent_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS bytes_behind
FROM pg_stat_replication;
```

Causes of lag: heavy writes, a slow replica disk, long queries on the replica that conflict with applying changes, or network limits. Effects include a user saving a profile and not seeing it on the next page. Solutions include reading from the primary right after a write, session stickiness, or waiting for the replica to reach a known position.

## Failover

When the primary fails, a replica must be promoted and clients must follow.

```bash
pg_ctl promote -D /var/lib/postgresql/16/main
```

Doing it by hand is slow and error prone, so teams use an automated manager such as Patroni, or a managed service. A safe failover needs:

1. A reliable decision that the primary is really down (a majority of a consensus group such as etcd, not one health check)
2. **Fencing**: making sure the old primary cannot accept writes again
3. Promoting the most up-to-date replica
4. Pointing clients at the new primary through DNS, a virtual IP or a proxy
5. Rebuilding the old primary as a replica

**Split brain** happens when two servers both accept writes, causing divergent data that is hard or impossible to merge. Fencing and quorum exist to prevent it.

## Managed services

Cloud databases offer multi-zone standby instances with automatic failover, typically within a minute or two, and read replicas as a separate feature. You still need to test failover, because connection strings, pools and application retry logic decide how long users notice an outage.

```predict
Q: Your application writes to the primary and immediately reads from an asynchronous replica. A user sometimes does not see the data they just saved. Why?
???
Replication lag. The replica has not applied the change yet. Read from the primary after a write, or wait until the replica has caught up.
> Replicas give eventual, not instant, consistency.
```

```diagram
title: A failover
node: fail | Primary fails | 0 | 1 | Hardware, network or process failure. | A false alarm may trigger an unneeded failover.
node: elect | Decide and fence | 1 | 1 | A quorum agrees, and the old primary is cut off. | Without fencing, two primaries can accept writes.
node: promote | Promote a replica | 2 | 1 | The most up-to-date replica becomes the primary. | A lagging replica loses recent commits.
node: redirect | Redirect clients | 3 | 1 | DNS, a virtual IP or proxy moves traffic. | Cached DNS and old connections keep going to the failed node.
edge: fail | elect
edge: elect | promote
edge: promote | redirect
```

## Incident: the failover that made it worse

> **Incident:** A short network partition made an automated tool promote a replica while the old primary was still running. For several minutes both accepted writes, and the team had to reconcile the data by hand.

```console
$ patronictl list
| Member | Role   | State   | Lag in MB |
| db1    | Leader | running |           |
| db2    | Leader | running |           |
```

A well-known public example is the October 2018 incident at a large code-hosting company, which wrote up a failover after a short network partition. In general, the repair was slow, data on both sides had to be compared, and the lasting fixes were better quorum rules, fencing and tested failover procedures.

## Common mistakes

- Treating a replica as a backup
- Failing over without fencing the old primary
- Never rehearsing failover
- Reading from replicas for data that must be current

```quiz
Q: What is replication lag?
- Time to start the server :: That is boot time.
+ The delay before a replica applies changes made on the primary
- Time to run a backup :: Unrelated.
- Query latency on the primary :: Unrelated.
> Reads from a lagging replica can be stale.

Q: What is split brain?
- A corrupted index :: Unrelated.
+ Two servers both accepting writes as primary
- A very large table :: Unrelated.
- A failed backup :: Unrelated.
> It creates conflicting data and is prevented by quorum and fencing.

Q: What does synchronous replication add?
- Faster writes :: It makes writes slower.
+ Commits are acknowledged only after a replica confirms, so none are lost on failover
- Free backups :: It is not a backup.
- Read scaling :: Both modes can serve reads.
> The cost is latency, and a stuck replica can block commits.

Q: What does fencing do?
- Encrypts data :: Unrelated.
+ Ensures the old primary cannot accept writes after failover
- Speeds up promotion :: It adds a step.
- Creates backups :: Unrelated.
> Without it, a recovered old primary may reintroduce a second writer.
```

```cards
Primary :: The server that accepts writes
Replica :: A copy that receives changes and can serve reads
Replication lag :: Delay before a replica reflects primary changes
Fencing :: Preventing the old primary from accepting writes
Split brain :: Two nodes both acting as primary
```
