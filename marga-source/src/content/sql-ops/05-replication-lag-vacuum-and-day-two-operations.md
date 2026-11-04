---
title: Replication lag, vacuum and day-two operations
minutes: 15
summary: Monitor replication, understand autovacuum and bloat, and run changes and backups so the database stays healthy.
---

A database that works on launch day needs care for years: copies must keep up, old rows must be cleaned out, backups must restore, and changes must not hurt users.

## What you will learn

- Streaming replication and how to measure lag
- Vacuum, autovacuum and table bloat
- Safe schema changes
- Backups, point-in-time recovery and restore tests

## Replication and lag

A **primary** sends its write-ahead log (WAL) to **standbys**, which replay it. Lag is the delay before a change on the primary is visible on a standby. Reading from a standby that is behind can show old data, such as a user's order missing right after it was placed.

```console
primary$ psql -c "SELECT client_addr, state, pg_wal_lsn_diff(sent_lsn, replay_lsn) AS bytes_behind, replay_lag FROM pg_stat_replication;"
 client_addr | state     | bytes_behind | replay_lag
-------------+-----------+--------------+-----------------
 10.0.2.21   | streaming |   1572864000 | 00:07:41.28
standby$ psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS delay;"
 delay
-----------------
 00:07:44.1
```

Common causes of lag: a heavy write burst, a slow standby disk, a long query on the standby that conflicts with replay (the setting `max_standby_streaming_delay` decides who gives way), or the network. A **replication slot** keeps WAL for a standby that is offline, and if the standby never returns the primary's disk fills with WAL. Monitor slots and drop abandoned ones.

## Vacuum and bloat

When a row is updated or deleted, the old version stays until **vacuum** removes it. **Autovacuum** runs vacuum automatically when about 20 percent of a table (the `autovacuum_vacuum_scale_factor`) plus a small base has changed. On a table with 500 million rows that means 100 million dead rows before it starts, which is far too late. Lower the factor for big, busy tables:

```text
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.02);
```

```console
$ psql -c "SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 2;"
 relname | n_live_tup | n_dead_tup | last_autovacuum
---------+------------+------------+---------------------
 events  |  412000000 |   96000000 | 2026-09-30 03:12:10
```

Vacuum cannot remove a row version that some open transaction might still see, so a long transaction (see the locks lesson) keeps dead rows alive. **Bloat** is the wasted space left behind. `VACUUM` marks it reusable; it does not shrink the file. To shrink a table, use `pg_repack` or `VACUUM FULL` (which locks the table).

A related risk is **transaction ID wraparound**: transaction numbers are finite, and vacuum must freeze old rows. If autovacuum cannot keep up, PostgreSQL eventually refuses writes to protect data. Monitor `age(datfrozenxid)`.

## Safe schema changes

- Add columns as nullable with no default or with a constant default (cheap on current versions), then backfill in batches.
- Create indexes with `CONCURRENTLY`.
- Add constraints as `NOT VALID` and validate later, so the lock is short.
- Set `lock_timeout` for the migration, and run it when traffic is low.
- Keep changes backward compatible, so old and new application versions both work during a deploy.

## Backups

- **Logical** backups (`pg_dump`) are portable and slow to restore on big databases.
- **Physical** backups with WAL archiving (tools such as pgBackRest) allow **point-in-time recovery**: restore to the minute before the bad change.
- Replication is not a backup: a mistaken `DELETE` replicates to every standby in seconds.
- Decide RPO and RTO, then restore to a scratch server regularly and run a query that checks the data.

## Incident: The standby that was always behind

> **Incident:** Customers saw their new orders missing for several minutes, and then the primary ran out of disk.

```console
primary$ psql -c "SELECT slot_name, active, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained FROM pg_replication_slots;"
 slot_name    | active | retained
--------------+--------+----------
 reporting_s1 | f      | 412 GB
```

A reporting replica had been switched off a week earlier but its replication slot remained. The primary kept every WAL file since then, 412 GB, until the disk filled. Another standby was lagging because a long report on it conflicted with replay. Dropping the dead slot with `pg_drop_replication_slot` freed the disk, and reports were moved to a replica with its own conflict settings. Replication needs monitoring just as the primary does.

## Common mistakes

- Reading important data from a lagging standby
- Leaving autovacuum defaults on very large tables
- Believing a replica is a backup
- Never restoring a backup to see if it works

```quiz
Q: What can a replication slot with an offline standby cause?
+ The primary keeps WAL until its disk fills
- Faster writes :: No.
- Automatic failover :: No.
- Smaller backups :: No.
> Drop abandoned slots.

Q: Why can autovacuum start too late on a huge table?
+ The default scale factor waits for about 20 percent of rows to change
- Autovacuum is disabled by default :: It is enabled.
- It only runs on Sundays :: No.
- It needs a restart :: No.
> Lower the factor for big, busy tables.

Q: Why is replication not a backup?
+ A bad DELETE replicates to the standbys quickly
- Replicas cannot be read :: They can.
- Replication is too slow :: Not the reason.
- Replicas cannot store WAL :: No.
> Backups let you go back in time.

Q: What does point-in-time recovery need?
+ A base backup and archived WAL
- Only a standby :: Not enough.
- Only pg_dump output :: It cannot replay to a minute.
- A bigger max_connections :: Unrelated.
> WAL lets you stop at a chosen time.
```

```cards
Replication lag :: delay before a standby shows a change
WAL :: write-ahead log of changes
Replication slot :: keeps WAL for a standby
Autovacuum :: removes dead row versions automatically
Bloat :: wasted space from dead rows
PITR :: restore to a chosen moment
```
