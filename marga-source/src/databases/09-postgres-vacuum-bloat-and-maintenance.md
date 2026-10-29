---
title: Postgres vacuum, bloat and routine maintenance
minutes: 13
summary: Understand why Postgres needs vacuum, how to spot bloat and long transactions, and which maintenance keeps the database healthy.
---

A table holds 2 million live rows and occupies 40 GB. Queries get slower every week. The cause is not the data; it is dead row versions that vacuum has not been able to clean. Postgres keeps old versions for concurrent readers, and maintenance decides whether that is harmless or costly.

## What you will learn

- Why updates and deletes leave dead rows
- What vacuum and autovacuum do
- Finding bloat and blockers such as long transactions
- Routine maintenance and safe fixes

## Dead rows and MVCC

Postgres never edits a row in place. An update writes a new version and marks the old one as dead once no transaction can still see it. Dead versions occupy space until **vacuum** marks it reusable. If dead space grows faster than it is cleaned, tables and indexes **bloat**: they use more disk, more cache and more time per scan.

## Autovacuum

The autovacuum daemon vacuums and analyzes tables automatically when changes pass a threshold: by default 20 percent of the table plus 50 rows. On a huge, busy table, 20 percent is far too late, so tune it per table:

```sql
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);
```

The same daemon protects against **transaction ID wraparound**, a rare but severe condition in which the database stops accepting writes. Monitor the age of the oldest transaction ID and alert well before the limit.

## What blocks vacuum

Vacuum cannot remove a dead row that an old transaction might still see. Long-running transactions, forgotten sessions "idle in transaction", abandoned replication slots and stuck prepared transactions hold back cleanup.

```sql
SELECT pid, state, now() - xact_start AS age, left(query, 60) AS query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_start
LIMIT 5;

SELECT relname, n_live_tup, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 5;
```

Set `idle_in_transaction_session_timeout` so a forgotten session cannot block cleanup for days.

## Routine care and fixes

- Plain `VACUUM` does not shrink the file; it makes space reusable. That is usually enough.
- `VACUUM FULL` rewrites the table and takes an exclusive lock, so use it rarely, in a window. Tools such as `pg_repack` rebuild with only a short lock.
- Rebuild bloated indexes with `REINDEX INDEX CONCURRENTLY`.
- Keep statistics fresh with `ANALYZE`; the planner depends on them.
- Watch dead tuple counts, table size growth, and the oldest transaction age as regular dashboard items.

```predict
Q: Autovacuum runs often but dead rows keep growing and the table is bloated. What is a likely cause?
???
A long-running or idle-in-transaction session (or an old replication slot) holds back cleanup.
> Vacuum can only remove rows that no one can still see.
```

## Incident: The table that kept growing

> **Incident:** A queue-like table with constant updates grew from 5 GB to 60 GB in a month, and dashboards slowed down.

```console
=> SELECT pid, state, now()-xact_start AS age FROM pg_stat_activity WHERE state='idle in transaction';
  pid  |        state         |      age
 4172  | idle in transaction  | 11 days 03:12:44
```

A reporting tool had left a transaction open for eleven days, so vacuum could not remove any row version created since. The session was ended, a timeout for idle transactions was added, and the table was rebuilt online with pg_repack. Per-table autovacuum settings and an alert on the oldest transaction age keep it from happening again.

## Common mistakes

- Using VACUUM FULL on a busy production table
- Leaving autovacuum thresholds at the defaults for huge tables
- Ignoring idle-in-transaction sessions
- Not monitoring transaction ID age

```quiz
Q: Why does Postgres create dead rows?
+ Updates and deletes write new versions and leave old ones until vacuum cleans them
- Because of bad disks :: Not the cause.
- Because of replication :: Not the cause.
- Because of indexes :: Not the cause.
> MVCC keeps old versions for readers.

Q: What can prevent vacuum from removing dead rows?
+ Long-running or idle-in-transaction sessions and stale replication slots
- A short query :: Short queries finish quickly.
- A small table :: Size is not the issue.
- A fast network :: Not related.
> Old snapshots hold cleanup back.

Q: What does plain VACUUM do?
+ Marks dead space as reusable without shrinking the file
- Deletes the table :: No.
- Rewrites the table with a lock :: That is VACUUM FULL.
- Backs up data :: No.
> It is usually enough.

Q: How can you avoid long-held idle transactions?
+ Set idle_in_transaction_session_timeout
- Disable autovacuum :: That makes it worse.
- Turn off replication :: Unrelated.
- Add more indexes :: Unrelated.
> Time out forgotten sessions.
```

```cards
Dead rows are removed by :: vacuum
Autovacuum threshold default :: 20 percent of table plus 50 rows
Blockers :: long and idle-in-transaction sessions, old slots
Shrink online :: pg_repack or REINDEX CONCURRENTLY
Monitor :: dead tuples and oldest transaction age
```
