---
title: Indexes and reading query plans
minutes: 15
summary: Know what an index does and costs, read EXPLAIN output to find sequential scans and bad estimates, and add the right index safely on a live system.
---

A table with ten rows is fast however you query it. A table with fifty million rows is only fast when the database can jump straight to the rows it needs. Indexes make that possible, and query plans show whether the database is using them.

## What you will learn

- What an index is and when it helps
- The cost of indexes
- Reading `EXPLAIN` and `EXPLAIN ANALYZE`
- Why the planner sometimes ignores an index
- Creating indexes without blocking writes

## What an index is

An index is a separate, sorted structure (usually a B-tree) that maps column values to row locations, like the index at the back of a book. Looking up a value needs a few page reads instead of reading the whole table.

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
CREATE INDEX idx_orders_recent ON orders (created_at DESC);
CREATE INDEX idx_orders_open ON orders (customer_id) WHERE status = 'open';
CREATE UNIQUE INDEX idx_customers_email ON customers (lower(email));
```

- A **composite index** on `(customer_id, created_at)` helps queries that filter on `customer_id`, or on both. It does not help a query that filters only on `created_at`, because order matters.
- A **partial index** (with `WHERE`) is small and fast for a common subset.
- A **unique index** also enforces uniqueness.

## The cost

Every index must be updated on every write, takes disk space and memory, and slows `INSERT`, `UPDATE` and `DELETE`. Add the indexes your queries need, and remove the ones nothing uses.

```sql
SELECT relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC
LIMIT 10;
```

An index with `idx_scan` of zero for a long time is a candidate for removal (check replicas and rare reports first).

## Reading a plan

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 20;
```

```text
Limit  (cost=0.43..8.10 rows=20) (actual time=0.05..0.09 rows=20 loops=1)
  ->  Index Scan using idx_orders_customer on orders
        (cost=0.43..120.5 rows=310) (actual time=0.04..0.08 rows=20 loops=1)
        Index Cond: (customer_id = 42)
Planning Time: 0.2 ms
Execution Time: 0.12 ms
```

Look for these in order:

1. **Scan type**: `Seq Scan` on a big table is a warning. `Index Scan` or `Index Only Scan` is usually good.
2. **Estimated rows versus actual rows**. A large gap means the statistics are stale. Run `ANALYZE`.
3. **Where the time goes**: find the node with the largest actual time.
4. **Sorts that spill to disk** and nested loops over huge row counts.

`EXPLAIN` alone shows the plan without running the query. `EXPLAIN ANALYZE` actually runs it, so wrap writes in a transaction you roll back.

## Why an index is not used

- The query returns a large share of the table, so a sequential scan is genuinely cheaper
- A function or cast on the column (`WHERE lower(email) = ...` needs an index on `lower(email)`)
- A leading wildcard (`LIKE '%abc'`)
- Mismatched types, such as comparing text to a number
- Stale statistics

## Adding an index on a live system

A plain `CREATE INDEX` blocks writes to the table while it builds. On a busy table use:

```sql
CREATE INDEX CONCURRENTLY idx_orders_customer ON orders (customer_id);
```

It takes longer and cannot run inside a transaction, and a failed build leaves an invalid index that you must drop and retry. MySQL uses online DDL with `ALGORITHM=INPLACE` for similar results.

```predict
Q: A table has an index on (customer_id, created_at). Does a query with only WHERE created_at > '2025-01-01' use it efficiently?
???
Not efficiently. The index is sorted by customer_id first, so a filter on created_at alone cannot use it as a range seek. A separate index on created_at would help.
> Column order in a composite index decides which queries it serves.
```

```diagram
title: Finding why a query is slow
node: slow | Slow query found | 0 | 1 | From slow query log or monitoring. | Tuning random queries wastes time. Start with the worst by total time.
node: plan | EXPLAIN ANALYZE | 1 | 1 | Shows scan type, row estimates and time per step. | Plain EXPLAIN hides the real timings.
node: cause | Find the cause | 2 | 1 | Missing index, stale statistics, bad predicate or too many rows. | Adding an index without reading the plan may not help.
node: fix | Fix and measure | 3 | 1 | Add an index concurrently or rewrite the query, then compare. | No before and after number means no proof.
edge: slow | plan
edge: plan | cause
edge: cause | fix
```

## Incident: the index build that blocked checkout

> **Incident:** At peak traffic, a plain CREATE INDEX on the orders table blocked every insert for eleven minutes. Checkout timed out for customers.

```console
$ psql shop -c "SELECT pid, wait_event_type, left(query,50) FROM pg_stat_activity WHERE wait_event_type = 'Lock' LIMIT 3"
```

The team cancelled the build, re-ran it with `CREATE INDEX CONCURRENTLY` in a quiet period, and added index creation to the migration checklist.

## Common mistakes

- Indexing every column
- Reading only plain EXPLAIN
- Wrong column order in composite indexes
- Building indexes without CONCURRENTLY at peak time

```quiz
Q: What is a cost of adding an index?
- Reads become slower :: Reads usually speed up.
+ Writes become slower and storage grows
- Constraints are removed :: Indexes do not remove them.
- Queries become impossible :: They still run.
> Every write must maintain every index.

Q: What does a large gap between estimated and actual rows suggest?
- A hardware fault :: Most often it means stale statistics.
+ Stale or poor statistics, so run ANALYZE and check the predicate
- A full disk :: That shows as write errors.
- A missing primary key :: It is unrelated.
> The planner chooses plans from estimates, so bad estimates give bad plans.

Q: Which statement builds an index without blocking writes in PostgreSQL?
- CREATE INDEX :: It blocks writes during the build.
+ CREATE INDEX CONCURRENTLY
- CREATE UNIQUE ONLY :: This is not a statement.
- ALTER INDEX FAST :: This is not a statement.
> It takes more time but allows normal traffic.

Q: Why might the database use a sequential scan despite an index?
- Indexes never work :: They do.
+ The query returns a large part of the table, so reading it all is cheaper
- Indexes expire daily :: They do not.
- The table is read-only :: That is not required.
> The planner picks the cheapest plan, not always an index.
```

```cards
B-tree index :: A sorted structure that finds rows without scanning the table
Composite index :: An index on several columns where order matters
Seq Scan :: Reading every row in the table
EXPLAIN ANALYZE :: Runs the query and reports the real plan timings
CREATE INDEX CONCURRENTLY :: Builds an index without blocking writes
```
