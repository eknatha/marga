---
title: Autovacuum, bloat and maintenance windows
minutes: 12
summary: Keep tables healthy by tuning autovacuum, measuring bloat, avoiding transaction ID wraparound and planning safe maintenance.
---

Updates and deletes in PostgreSQL create new row versions and leave old ones behind. Autovacuum reclaims them in the background. When it cannot keep up, or cannot remove rows because something still needs them, tables bloat and performance drops.

## What you will learn

- Dead tuples, bloat and what autovacuum does
- Finding what blocks vacuum
- Tuning autovacuum for busy tables
- Transaction ID wraparound and safe maintenance

## Watch vacuum

```sql
SELECT relname, n_live_tup, n_dead_tup,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 10;
```

A growing `n_dead_tup` with an old `last_autovacuum` means vacuum is behind. Track table and index size over time, because steady growth with a constant row count is bloat.

## What blocks cleanup

Vacuum cannot remove a row version that some transaction might still see.

```sql
SELECT pid, now() - xact_start AS age, state, left(query, 60)
FROM pg_stat_activity
WHERE xact_start IS NOT NULL ORDER BY age DESC LIMIT 5;

SELECT slot_name, active, restart_lsn FROM pg_replication_slots;
```

Long transactions, idle-in-transaction sessions and inactive replication slots are the usual causes. Fix them first, then tune.

## Tuning

```sql
ALTER TABLE events SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_cost_limit = 2000
);
```

The default triggers at 20 percent dead rows, which is too late for huge tables. Lower the scale factor per hot table and raise the cost limit so vacuum works faster.

## Wraparound and maintenance

Transaction IDs are finite. Monitor `age(datfrozenxid)` and keep it far from the limit. To shrink an already bloated table, use `pg_repack` or plan a `VACUUM FULL`, which locks the table, in a maintenance window with a rollback plan.

## Incident: The transaction that never ended

> **Incident:** An idle transaction blocked cleanup for three weeks.

```console
pid 8841  idle in transaction  xact_start: 21 days ago
n_dead_tup: 184220001  last_autovacuum: 2 minutes ago
table size: 412 GB (live data about 40 GB)
```

A script opened a transaction and never closed it. Autovacuum ran constantly but could not remove old rows. After the session was ended the team added idle_in_transaction_session_timeout and an alert on transactions older than 15 minutes.

## Common mistakes

- Only raising autovacuum frequency when something blocks it
- Forgetting inactive replication slots
- Running VACUUM FULL during business hours
- Ignoring transaction ID age

```quiz
Q: What blocks vacuum from removing rows?
+ Old transactions or replication slots
- A new index :: No.
- A larger disk :: No.
- A backup tag :: No.
> They might still need old versions.

Q: What is bloat?
+ Space taken by dead row versions
- A query plan :: No.
- A backup :: No.
- A cache :: No.
> Tables grow bigger than needed.

Q: What setting stops forgotten transactions?
+ idle_in_transaction_session_timeout
- work_mem :: No.
- port :: No.
- shared_buffers :: No.
> It ends idle sessions.

Q: What does VACUUM FULL do?
+ Rewrites the table with a strong lock
- Never locks :: No.
- Only reads :: No.
- Creates a replica :: No.
> Plan it in a window.
```

```cards
Dead tuple :: Old row version waiting for cleanup
Autovacuum :: Background process that cleans and analyzes tables
Bloat :: Space wasted by dead tuples and empty pages
Wraparound :: Transaction ID exhaustion risk
```
