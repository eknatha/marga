---
title: Debugging database problems under pressure
minutes: 16
summary: Triage slow, blocked, full or unreachable databases with a fixed order of checks, from connections and locks to disk, replication and recovery.
---

Database incidents are tense because the data matters and everything depends on it. A fixed order of checks keeps you calm and stops you from making an unrecoverable change in a hurry.

## What you will learn

- A triage order for the four common symptoms
- Queries for connections, locks, disk and replication
- Safe emergency actions and their costs
- When to stop and protect the data

## Principle: do no harm first

Before you kill, restart, failover or delete anything, ask: can this lose data, and is there a recent backup? Look before you act, take notes of what you ran, and prefer reversible steps (cancel a query before killing a connection, add capacity before restarting).

## Symptom 1: it is slow

1. Host: CPU, memory, disk latency (`iostat -x 1`), swap
2. Sessions: how many active, how many waiting

```sql
SELECT wait_event_type, wait_event, count(*)
FROM pg_stat_activity WHERE state = 'active'
GROUP BY 1, 2 ORDER BY 3 DESC;
```

3. Top queries in the last interval (`pg_stat_statements`), and the plan of the worst
4. Recent changes: deploy, migration, traffic spike, stale statistics (`ANALYZE`)

## Symptom 2: queries hang

Look for blocking: long transactions, a queued `ALTER`, an `idle in transaction` session.

```sql
SELECT pid, pg_blocking_pids(pid) AS blocked_by, state, left(query, 60)
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

Cancel the **root** blocker, not the victims: `SELECT pg_cancel_backend(PID);` first, then `pg_terminate_backend(PID)` if needed.

## Symptom 3: out of space

```bash
df -h /var/lib/postgresql
du -sh /var/lib/postgresql/16/main/* | sort -h | tail -5
```

```sql
SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
```

Common causes: write-ahead logs piling up because of a stuck replica or an unused replication slot, a failing archive command, runaway temp files, bloat, or a huge table that grew. Free space safely by fixing the cause (drop an abandoned slot, repair archiving), or adding disk. **Never delete files inside the data directory by hand**, because that can destroy the database.

## Symptom 4: cannot connect

```bash
pg_isready -h db1.example.com -p 5432
ss -tlnp | grep 5432
journalctl -u postgresql --since "10 min ago"
```

Check in order: is the process up, is it listening, can the network reach it (firewall, security group, DNS), is it out of connections (`FATAL: too many clients`), does authentication fail (`pg_hba.conf`, password, TLS), did a failover move the primary?

## Replication problems

```sql
SELECT client_addr, state, pg_wal_lsn_diff(sent_lsn, replay_lsn) AS bytes_behind
FROM pg_stat_replication;
```

A lagging replica may need a long query cancelled, more IO, or a rebuild from a fresh base backup.

## Corruption and recovery

If you see checksum errors, missing files or crash loops, stop writing, **copy the data directory aside if you can**, and use your restore procedure rather than experimenting on the only copy. Document the timeline for the review.

```predict
Q: The data disk is 98 percent full and growing, and an unused replication slot shows 400 GB retained. What do you do?
???
Confirm the slot is truly abandoned, then drop it with pg_drop_replication_slot so the retained logs can be recycled. Do not delete WAL files by hand.
> The database knows what it still needs. The files do not tell you.
```

```diagram
title: Database incident triage
node: sym | Name the symptom | 0 | 1 | Slow, hanging, full or unreachable. | Mixing symptoms sends you down the wrong path.
node: look | Look without changing | 1 | 1 | Sessions, locks, disk, replication, logs. | Acting before looking can lose data.
node: safe | Safest action first | 2 | 1 | Cancel a query, drop a stale slot, add capacity. | Restarts hide the evidence and drop the cache.
node: prove | Confirm recovery | 3 | 1 | Latency, errors and replication back to normal. | Declaring it fixed too early invites a repeat.
edge: sym | look
edge: look | safe
edge: safe | prove
```

## Incident: the full disk from a forgotten slot

> **Incident:** A replica was decommissioned but its replication slot stayed. The primary kept every write-ahead log segment for it, filled the disk in the early hours and stopped accepting writes.

```console
$ psql -c "SELECT slot_name, active FROM pg_replication_slots"
 slot_name | active
-----------+--------
 replica_old | f
```

The team dropped the slot, the logs were recycled and writes resumed. They added alerts on disk free space, slot lag and WAL size, and a checklist item to remove slots when removing replicas.

## Common mistakes

- Killing victim sessions instead of the root blocker
- Deleting files in the data directory
- Restarting before capturing evidence
- Running heavy diagnostic queries on an overloaded primary without limits

```quiz
Q: In a lock pile-up, which session do you cancel first?
- Every waiting session :: They are the victims.
+ The root blocker at the head of the chain
- The replica :: Unrelated.
- A random session :: Guessing wastes time.
> Removing the blocker frees all waiting sessions.

Q: Why is deleting WAL files by hand dangerous?
- It is slow :: Not the issue.
+ The database may still need them for recovery or replication, and removing them can make it unrecoverable
- It changes ownership :: Not the issue.
- It stops backups only :: It can destroy the database.
> Use the database's own commands to release them.

Q: What is the first question before a risky emergency action?
- How fast can I type? :: Speed is not the concern.
+ Could this lose data, and is there a recent usable backup?
- Who else is watching? :: Irrelevant.
- Is it Friday? :: Irrelevant.
> Protect the data first, then restore service.

Q: Which tool checks if PostgreSQL accepts connections?
- pg_dump :: It makes backups.
+ pg_isready
- pg_restore :: It restores backups.
- pg_upgrade :: It upgrades versions.
> It tests the server's connection status without logging in.
```

```cards
Root blocker :: The session at the head of a lock chain
Replication slot :: Makes the primary keep logs a replica still needs
pg_isready :: Checks whether the server accepts connections
pg_cancel_backend :: Cancels a running query without ending the connection
Do no harm first :: Prefer reversible actions and protect the data
```
