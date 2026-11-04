---
title: Reading EXPLAIN and finding slow queries
minutes: 15
summary: Find the queries that cost the most, read an EXPLAIN plan, and tell a missing index from stale statistics.
---

Most database slowness comes from a small number of queries. The work is to find them, read what the database does with them, and change one thing at a time. The examples use PostgreSQL, and the ideas carry over to MySQL and others.

## What you will learn

- Finding expensive queries with pg_stat_statements and the slow query log
- Reading EXPLAIN and EXPLAIN ANALYZE
- Sequential scan, index scan and join types
- What stale statistics look like

## Find the queries first

Enable the `pg_stat_statements` extension. It records every normalized query with how many times it ran and how long it took.

```console
$ psql -c "SELECT calls, round(total_exec_time::numeric,0) AS total_ms, round(mean_exec_time::numeric,1) AS mean_ms, left(query,60) AS query FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 3;"
 calls  | total_ms | mean_ms | query
--------+----------+---------+--------------------------------------------------
 480211 |  9120432 |    19.0 | SELECT * FROM orders WHERE customer_id = $1 ORDER BY
   1210 |  4411200 |  3645.5 | SELECT customer_id, sum(total) FROM orders WHERE cre
```

Sort by **total** time, not by the slowest single run. A 19 ms query that runs 480 000 times costs more than a 3.6 s report that runs 1 200 times. The setting `log_min_duration_statement = 500` writes any statement slower than 500 ms to the log, which catches queries your extension view has not reached yet.

## EXPLAIN

`EXPLAIN` shows the plan the database chooses. `EXPLAIN (ANALYZE, BUFFERS)` runs the query and shows what really happened. Do not use ANALYZE on a statement that changes data without a transaction you roll back.

```console
$ psql -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE customer_id = 4711;"
 Seq Scan on orders  (cost=0.00..412345.00 rows=11 width=96) (actual time=0.031..1893.2 rows=9 loops=1)
   Filter: (customer_id = 4711)
   Rows Removed by Filter: 9999991
   Buffers: shared hit=1204 read=211141
 Planning Time: 0.12 ms
 Execution Time: 1893.3 ms
```

Read it from the inside out and look for:

- **Seq Scan** on a big table that returns a few rows. The database read ten million rows to find nine (`Rows Removed by Filter`). An index on `customer_id` would let it jump to them.
- **Index Scan / Index Only Scan / Bitmap Heap Scan**: the database uses an index. Fewer buffers read is the goal.
- **Estimated rows vs actual rows**: `rows=11` versus `rows=9` is fine. When the estimate is 10 and the actual is 2 000 000, the planner made its choice with wrong information. Run `ANALYZE table;` to refresh statistics.
- **Sort** with `Sort Method: external merge Disk` means the sort spilled to disk because `work_mem` was too small for that query.
- **Nested Loop** is good for few rows and terrible for many. **Hash Join** and **Merge Join** suit larger sets.

## Change one thing

After a change, run the same EXPLAIN again and compare the time and the buffers. Keep the old plan text in your ticket, so a reviewer can see the difference.

```console
$ psql -c "CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);"
CREATE INDEX
$ psql -c "EXPLAIN (ANALYZE) SELECT * FROM orders WHERE customer_id = 4711;" | grep -E "Index|Execution"
 Index Scan using idx_orders_customer on orders  (actual time=0.040..0.061 rows=9 loops=1)
 Execution Time: 0.09 ms
```

`CONCURRENTLY` builds the index without blocking writes. It takes longer and cannot run inside a transaction block.

## Incident: The query that was fast yesterday

> **Incident:** A checkout query went from 5 ms to 4 seconds overnight with no code change.

```console
$ psql -c "EXPLAIN (ANALYZE) SELECT * FROM carts WHERE status='open' AND user_id=88;"
 Nested Loop  (cost=0.85..120.40 rows=3 width=64) (actual time=0.03..4012.7 rows=118002 loops=1)
$ psql -c "SELECT relname, last_autoanalyze, n_live_tup FROM pg_stat_user_tables WHERE relname='carts';"
 carts | 2026-10-19 02:11:04 | 3120
```

The planner expected 3 rows and found 118 002. The table had been loaded with a large import the night before, and statistics were two weeks old, so the planner chose a nested loop that suited a small table. `ANALYZE carts;` fixed the plan in seconds. The lesson is to compare estimated and actual rows before adding indexes: a missing index and stale statistics look similar and have different cures.

## Common mistakes

- Tuning the slowest single query and ignoring the one that runs a million times
- Adding indexes before reading the plan
- Running EXPLAIN ANALYZE on writes in production without a rollback
- Judging by a query on a small development database

```quiz
Q: Which view lets you rank queries by total time spent?
+ pg_stat_statements
- pg_locks :: It shows locks.
- pg_tables :: It lists tables.
- information_schema.columns :: It lists columns.
> Sort by total execution time.

Q: What does Rows Removed by Filter with a huge number tell you?
+ The database read many rows to find a few, so an index may help
- The disk is full :: No.
- The query is cached :: No.
- The table is encrypted :: No.
> A sequential scan did too much work.

Q: The planner expects 3 rows but 118 000 are returned. What should you try first?
+ Run ANALYZE to refresh statistics
- Restart the server :: Not a first step.
- Drop the table :: No.
- Increase max_connections :: Unrelated.
> Wrong estimates often come from stale statistics.

Q: Why use CREATE INDEX CONCURRENTLY on a busy table?
+ It builds the index without blocking writes
- It makes the index smaller :: No.
- It works in a transaction :: It cannot.
- It skips the table scan :: No.
> It takes longer but avoids a write lock.
```

```cards
EXPLAIN :: shows the chosen query plan
EXPLAIN ANALYZE :: runs the query and shows real timings
Seq Scan :: reads the whole table
pg_stat_statements :: records cost per query
ANALYZE :: refreshes table statistics
work_mem :: memory per sort or hash step
```
