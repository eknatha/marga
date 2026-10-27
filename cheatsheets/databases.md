---
title: Databases (PostgreSQL)
summary: SQL basics, operator queries, indexes and plans, locks, backups, replication, pooling and safe migrations.
module: databases
---

## Connect and explore

```bash
psql "host=db1.example.com dbname=shop user=readonly"
psql -h db1.example.com -U readonly shop -c "SELECT count(*) FROM orders;"
pg_isready -h db1.example.com -p 5432
```

| psql command | Meaning |
|--------------|---------|
| `\dt` | List tables |
| `\d orders` | Describe a table |
| `\x` | Toggle vertical output |
| `\timing` | Show query time |

## Safe changes

```sql
BEGIN;
SELECT count(*) FROM orders WHERE created_at < '2020-01-01';
DELETE FROM orders WHERE created_at < '2020-01-01';
COMMIT;   -- or ROLLBACK;
```

Never run `UPDATE` or `DELETE` without `WHERE`. Use a read-only role for investigation.

## Operator queries

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));
SELECT pid, state, now() - query_start AS running_for, left(query, 60)
FROM pg_stat_activity WHERE state <> 'idle' ORDER BY running_for DESC;
SELECT pid, pg_blocking_pids(pid) FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

## Indexes and plans

```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
ANALYZE orders;
```

| In the plan | Meaning |
|-------------|---------|
| `Seq Scan` on a big table | Reads every row, often needs an index |
| Estimate far from actual | Stale statistics, run `ANALYZE` |
| Sort spilling to disk | Needs a better index or more `work_mem` |

## Timeouts

```sql
ALTER ROLE app SET statement_timeout = '30s';
ALTER ROLE app SET lock_timeout = '5s';
ALTER ROLE app SET idle_in_transaction_session_timeout = '30s';
SELECT pg_cancel_backend(1234);
```

## Backups

```bash
pg_dump --format=custom --file=shop.dump shop
pg_restore --dbname=shop_check --jobs=4 shop.dump
pg_basebackup -h db1.example.com -D /backups/base -X stream -P
```

A backup counts only after a successful restore test. A replica is not a backup.

## Replication

```sql
SELECT client_addr, state, pg_wal_lsn_diff(sent_lsn, replay_lsn) AS bytes_behind
FROM pg_stat_replication;
SELECT slot_name, active FROM pg_replication_slots;
```

Failover needs quorum, fencing, promotion and client redirection.

## Safe migrations

| Change | Safer approach |
|--------|----------------|
| New index | `CREATE INDEX CONCURRENTLY` |
| NOT NULL | `CHECK ... NOT VALID`, then `VALIDATE CONSTRAINT` |
| Rename a column | Expand and contract over several deploys |
| Large backfill | Small batches, watch replica lag |
| Any `ALTER` | Set `lock_timeout` first |

## Redis quick checks

```bash
redis-cli INFO memory | grep used_memory_human
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
redis-cli --scan --pattern 'session:*' | head
```

Use `SCAN`, never `KEYS *`, on production. Set `maxmemory` and an eviction policy.

> **Danger:** `DELETE` or `UPDATE` without `WHERE` changes every row. Use a transaction and check the row count before you commit.

> **Warning:** A plain `CREATE INDEX` blocks writes while it builds. Use `CONCURRENTLY` on busy tables.

> **Danger:** Never delete files inside the data directory or `pg_wal` by hand. It can destroy the database.

> **Warning:** `KEYS *` on a production Redis blocks every client. Use `SCAN`.
