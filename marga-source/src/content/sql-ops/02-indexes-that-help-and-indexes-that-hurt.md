---
title: Indexes that help and indexes that hurt
minutes: 14
summary: Design composite, partial and covering indexes, and find unused or duplicate ones that slow writes.
---

An index is a trade. It makes some reads fast and makes every write slower and larger. Good index design means adding the few that matter and removing the ones that do not.

## What you will learn

- How a B-tree index is used, and why column order matters
- Composite, partial and covering indexes
- The write cost of indexes and how to find unused ones
- Why an index is sometimes ignored

## How a B-tree works for you

A B-tree index keeps values sorted. It answers equality, ranges and `ORDER BY` on the indexed columns. With a **composite** index on `(customer_id, created_at)`, rows are sorted by customer first, then by date inside each customer.

The rule of thumb for column order: columns tested for **equality** first, then the column used for a **range or sort**.

```console
$ psql -c "CREATE INDEX CONCURRENTLY idx_orders_cust_created ON orders (customer_id, created_at);"
$ psql -c "EXPLAIN SELECT * FROM orders WHERE customer_id = 4711 AND created_at >= '2026-10-01' ORDER BY created_at DESC LIMIT 20;" | head -3
 Limit  (cost=0.57..38.10 rows=20 width=96)
   ->  Index Scan Backward using idx_orders_cust_created on orders
         Index Cond: ((customer_id = 4711) AND (created_at >= '2026-10-01'))
```

This one index serves queries by customer alone, and by customer plus date, and also gives the sort for free. It does **not** help a query that filters only on `created_at`, because the sorted order begins with customer.

## Partial and covering indexes

A **partial index** covers only some rows. If 2 percent of orders are `status='open'` and queries look only for those, a smaller index is faster to scan and cheaper to maintain.

```text
CREATE INDEX CONCURRENTLY idx_orders_open ON orders (customer_id) WHERE status = 'open';
```

A **covering index** adds extra columns so the database can answer from the index alone (an index-only scan):

```text
CREATE INDEX CONCURRENTLY idx_orders_cust_total ON orders (customer_id) INCLUDE (total);
```

Index-only scans also need the table's visibility map to be current, which vacuum keeps up to date.

## The cost of indexes

Every insert updates every index on the table. Every update that changes an indexed column does too. Indexes also take disk and memory and slow vacuum. A table with twelve indexes may have write speed far below one with three.

Find indexes that are never used:

```console
$ psql -c "SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size FROM pg_stat_user_indexes ORDER BY idx_scan, pg_relation_size(indexrelid) DESC LIMIT 3;"
 relname | indexrelname        | idx_scan | size
---------+---------------------+----------+--------
 orders  | idx_orders_status   |        0 | 1.8 GB
 orders  | idx_orders_created  |       12 | 1.6 GB
```

`idx_scan = 0` since the last statistics reset is a candidate for removal, but check first that the statistics cover a full business cycle (month end, reporting jobs) and that the index does not enforce a unique constraint. Drop with `DROP INDEX CONCURRENTLY`.

Duplicate indexes are common too: an index on `(customer_id)` is redundant when `(customer_id, created_at)` exists, because the composite serves the same lookups.

## When the planner ignores an index

- The query returns a large part of the table, so reading the table directly is cheaper.
- A function wraps the column: `WHERE lower(email) = 'a@b.c'` cannot use an index on `email`. Create an expression index on `lower(email)`, or change the query.
- The types differ and force a cast of the column.
- Statistics are stale and the planner thinks the table is small.
- A leading wildcard: `LIKE '%smith'` cannot use a plain B-tree.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Indexes that help and indexes that hurt fits together
node: n1 | How a B-tree works for you | 0 | 0 | A B-tree index keeps values sorted. It answers equality, ranges and ORDER BY on the indexed columns. | Putting the range column before the equality column in a composite index. | process
node: n2 | Partial and covering indexes | 1 | 1 | A partial index covers only some rows. If 2 percent of orders are status='open' and queries look only for those, a smaller index is faster to scan and cheaper to... | Adding an index for every slow query without checking existing ones. | store
node: n3 | The cost of indexes | 2 | 0 | Every insert updates every index on the table. | Dropping an index that backs a unique or foreign key constraint. | store
node: n4 | When the planner ignores an index | 3 | 1 | The query returns a large part of the table, so reading the table directly is cheaper. | Wrapping an indexed column in a function. | store
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Twenty indexes and a slow import

> **Incident:** A nightly import that took 20 minutes grew to 5 hours over a year.

```console
$ psql -c "SELECT count(*) FROM pg_indexes WHERE tablename='events';"
 count
-------
    23
$ psql -c "SELECT pg_size_pretty(pg_table_size('events')) AS table, pg_size_pretty(pg_indexes_size('events')) AS indexes;"
 table  | indexes
--------+---------
 41 GB  | 87 GB
```

Over time people added an index for each new report. The import had to update 23 indexes for every row, and the indexes were twice the size of the table. A review found nine unused and four duplicate indexes. Removing thirteen brought the import back under an hour. Each index had been a reasonable choice when it was added; nobody owned the total.

```wrongpath
@goal The query is slow, so index every column in the WHERE clause.
@wrong
CREATE INDEX ON orders (status);
CREATE INDEX ON orders (created_at);
CREATE INDEX ON orders (customer_id);
CREATE INDEX ON orders (total);
@result
(queries are a bit faster)
$ \di+ orders*
4 indexes, 18 GB
inserts: 1200/s down to 400/s
@why Each index must be updated on every write. A low-selectivity index on status is never used, and the planner often ignores single-column indexes when a composite one would fit the query.
@right
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 4821 AND status = 'open' ORDER BY created_at DESC LIMIT 20;
CREATE INDEX CONCURRENTLY ON orders (customer_id, created_at DESC) WHERE status = 'open';
@after Read the plan, design one index for the real query, and drop indexes that are never used.
```

## Common mistakes

- Adding an index for every slow query without checking existing ones
- Putting the range column before the equality column in a composite index
- Wrapping an indexed column in a function
- Dropping an index that backs a unique or foreign key constraint

```quiz
Q: For a query WHERE customer_id = 5 AND created_at > X ORDER BY created_at, which index order is best?
+ (customer_id, created_at)
- (created_at, customer_id) :: The equality column should come first.
- (created_at) only :: It would not use the customer filter.
- No index :: The index helps.
> Equality columns first, then range or sort.

Q: What does a partial index do?
+ Indexes only rows that match a condition
- Indexes half of each row :: No.
- Skips unique checks :: No.
- Is always unique :: No.
> Smaller and cheaper for a known subset.

Q: Why can WHERE lower(email) = 'a@b.c' ignore an index on email?
+ The function changes the value, so the index order cannot be used
- Indexes cannot store text :: They can.
- Email is too long :: Not the reason.
- The index is encrypted :: No.
> Use an expression index on lower(email).

Q: What is the main cost of having many indexes?
+ Every write must update all of them
- Reads become impossible :: No.
- Tables cannot grow :: No.
- Queries return wrong rows :: No.
> Write speed, disk and vacuum all suffer.
```

```cards
Composite index :: index on several columns in order
Partial index :: index of rows matching a condition
Covering index :: index that also holds extra columns
Index-only scan :: answers from the index alone
idx_scan :: how often an index was used
CONCURRENTLY :: build or drop without blocking writes
```
