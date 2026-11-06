---
title: Finding the worst queries with pg_stat_statements
minutes: 13
summary: Rank queries by total time, calls and rows with pg_stat_statements, then tune the few that cause most of the load.
---

Slow-query logs show single bad events, but load comes from patterns. The pg_stat_statements extension groups queries by shape and tells you where the database spends its time, so you can spend yours on the right query.

## What you will learn

- Enabling and reading pg_stat_statements
- Ranking by total time, mean time and calls
- Moving from a query to its plan and fix
- Measuring the effect of a change

## Enable and read

```sql
-- postgresql.conf: shared_preload_libraries = 'pg_stat_statements'
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT calls,
       round(total_exec_time::numeric, 0) AS total_ms,
       round(mean_exec_time::numeric, 2)  AS mean_ms,
       rows,
       left(query, 80) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Queries are **normalized**, so `WHERE id = 7` and `WHERE id = 9` count as one entry with a placeholder. Sort three ways: by total time for overall load, by mean time for slow single calls and by calls for chatty clients.

## From query to fix

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42 AND status = 'open';

CREATE INDEX CONCURRENTLY orders_customer_status_idx
  ON orders (customer_id, status);
```

Look for sequential scans on large tables, row estimates far from actual rows and many shared buffers read. Typical fixes are a suitable index, selecting only needed columns, removing an unneeded join, batching many small queries into one or caching the result in the application.

## Measure

```sql
SELECT pg_stat_statements_reset();
-- run normal traffic for an hour, then query again
```

Reset the counters before a change and compare after a representative period. Record the before and after total time so the improvement is evidence rather than a feeling.

## Incident: The fast query that used all the CPU

> **Incident:** A cheap query called constantly dominated database load.

```console
calls: 18400000  mean_ms: 4.1  total_ms: 75440000
query: SELECT * FROM sessions WHERE token = $1
Seq Scan on sessions (rows=1 of 2,100,000)
```

The team had chased long reports. Ranking by total time exposed a session lookup with no index on token. One index removed the scan, brought the mean time under 0.1 ms and cut CPU by half.

## Common mistakes

- Tuning only the slowest single query
- Not resetting statistics before a test
- Adding indexes without checking write cost
- Reading plans without ANALYZE and BUFFERS

```quiz
Q: Which ordering shows overall database load best?
+ total_exec_time
- mean only :: No.
- query length :: No.
- table name :: No.
> Total time includes how often a query runs.

Q: Why are queries normalized?
+ Values become placeholders so shapes group together
- To hide the database :: No.
- To speed disks :: No.
- To encrypt data :: No.
> Same shape, one entry.

Q: What does a large gap between estimated and actual rows suggest?
+ Stale or poor statistics
- A DNS issue :: No.
- Too many CPUs :: No.
- A full disk :: No.
> The planner chose from wrong estimates.

Q: How do you prove a fix worked?
+ Compare statistics before and after
- Trust intuition :: No.
- Restart the server :: No.
- Delete the index :: No.
> Measure the same workload.
```

```cards
pg_stat_statements :: Extension that records query statistics by shape
total_exec_time :: Total time spent running a query shape
Normalized query :: Query with literal values replaced by placeholders
EXPLAIN ANALYZE :: Runs a query and shows the real plan and timings
```
