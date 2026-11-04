---
title: SQL performance and database operations
summary: Plans, indexes, locks, connections, replication and vacuum, with the queries that show what a busy PostgreSQL database is doing.
module: sql-ops
---

## Find slow queries

```sql
SELECT calls, round(mean_exec_time) AS mean_ms, round(total_exec_time) AS total_ms, left(query, 80)
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 10;

EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 42;
```

Look for sequential scans on big tables, estimated rows far from actual rows, and sorts that spill to disk.

## Indexes

```sql
CREATE INDEX CONCURRENTLY orders_cust_status ON orders (customer_id, status);
SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes ORDER BY idx_scan LIMIT 10;
ANALYZE orders;
```

> **Warning:** A plain CREATE INDEX blocks writes. Use CONCURRENTLY on live tables.

## Sessions and locks

```sql
SELECT pid, state, now()-xact_start AS tx_age, wait_event_type, left(query, 60)
FROM pg_stat_activity WHERE state <> 'idle' ORDER BY tx_age DESC NULLS LAST;

SELECT pid, pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
SELECT pg_cancel_backend(2214);      -- cancel query
SELECT pg_terminate_backend(2214);   -- end session
```

## Connections

```sql
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
SHOW max_connections;
```

Use a pooler. Set `idle_in_transaction_session_timeout`.

## Vacuum and bloat

```sql
SELECT relname, n_live_tup, n_dead_tup, last_autovacuum FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 10;
VACUUM (VERBOSE, ANALYZE) orders;
```

An old open transaction stops vacuum from removing dead rows.

## Replication

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS replica_lag;   -- on the replica
SELECT client_addr, state, sent_lsn, replay_lsn FROM pg_stat_replication;  -- on the primary
```

## Quick diagnosis

| Symptom | First look |
|---|---|
| One query slow | EXPLAIN ANALYZE, indexes, statistics |
| Everything slow | top statements, I/O, locks, connections |
| Too many connections | state grouping, idle in transaction, pooler |
| Table keeps growing | dead tuples, vacuum, old transactions |
| Replica behind | replay blocked, I/O, batch size |

## Cautions

> **Danger:** `kill` of a long transaction or `pg_terminate_backend` rolls it back. Check what it is doing first.

> **Warning:** A plain `CREATE INDEX` blocks writes on the table. Use `CREATE INDEX CONCURRENTLY` on live systems.

> **Warning:** Raising `max_connections` does not fix a connection storm and can exhaust memory. Add a pooler.

> **Caution:** `VACUUM FULL` locks the table and rewrites it. Use normal vacuum, or a repack tool, on busy tables.
