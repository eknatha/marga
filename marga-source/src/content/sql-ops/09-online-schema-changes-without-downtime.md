---
title: Online schema changes without downtime
minutes: 13
summary: Change tables on a busy database safely with lock timeouts, concurrent indexes, backfills in batches and the expand and contract pattern.
---

Schema changes are routine but dangerous on a live system. The risk is rarely the work itself; it is the lock the statement needs and the queue of queries that forms behind it. A handful of habits make changes safe.

## What you will learn

- Which operations take strong locks
- Using lock_timeout and CONCURRENTLY
- Backfilling data in batches
- Adding constraints without blocking writes

## Locks and timeouts

```sql
SET lock_timeout = '3s';
SET statement_timeout = '15min';

ALTER TABLE orders ADD COLUMN channel text;           -- fast, no rewrite
CREATE INDEX CONCURRENTLY orders_channel_idx ON orders (channel);
```

`ALTER TABLE` needs a strong lock briefly, but if a long transaction holds a conflicting lock it waits, and every later query waits behind it. A **lock_timeout** makes the migration fail fast so you can retry in a quieter moment. `CREATE INDEX CONCURRENTLY` avoids blocking writes but takes longer and cannot run inside a transaction.

## Backfill in batches

```sql
-- repeat until 0 rows are updated
UPDATE orders SET channel = 'web'
WHERE id IN (SELECT id FROM orders WHERE channel IS NULL LIMIT 5000);
```

One huge update holds locks, bloats the table and creates replication lag. Small batches with a short pause let vacuum and replicas keep up. Watch lag while it runs.

## Constraints

```sql
ALTER TABLE orders ADD CONSTRAINT orders_channel_chk
  CHECK (channel IS NOT NULL) NOT VALID;
ALTER TABLE orders VALIDATE CONSTRAINT orders_channel_chk;
```

Adding a constraint as `NOT VALID` checks only new rows and needs a short lock. `VALIDATE` then scans existing rows with a weaker lock. The same idea applies to foreign keys.

## Expand and contract

Make changes compatible in steps: **expand** by adding the new column, deploy code that writes both, backfill, switch reads, then **contract** by removing the old column in a later release. Each step can be rolled back.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Online schema changes without downtime fits together
node: n1 | Locks and timeouts | 0 | 0 | ALTER TABLE needs a strong lock briefly, but if a long transaction holds a conflicting lock it waits, and every later query waits behind it. | Changing hot tables without lock_timeout. | process
node: n2 | Backfill in batches | 1 | 1 | One huge update holds locks, bloats the table and creates replication lag. | One giant backfill update. | process
node: n3 | Constraints | 2 | 0 | Adding a constraint as NOT VALID checks only new rows and needs a short lock. | Adding constraints with full validation inline. | process
node: n4 | Expand and contract | 3 | 1 | Make changes compatible in steps: expand by adding the new column, deploy code that writes both, backfill, switch reads, then contract by removing the old column in a... | Dropping a column in the same release as the code change. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The index that blocked all writes

> **Incident:** A plain CREATE INDEX stalled writes on a hot table.

```console
CREATE INDEX orders_status_idx ON orders (status);
waiting for ShareLock on relation orders
412 queries waiting, longest 241s
```

A plain index build takes a lock that blocks writes for the whole build. On a large table that was minutes of failed requests. The team standardized on CONCURRENTLY with a lock timeout, added a migration review checklist and ran a rehearsal against a copy of production.

## Common mistakes

- Changing hot tables without lock_timeout
- One giant backfill update
- Adding constraints with full validation inline
- Dropping a column in the same release as the code change

```quiz
Q: What does CONCURRENTLY do for index builds?
+ Avoids blocking writes
- Skips the table :: No.
- Deletes data :: No.
- Locks the whole database :: No.
> It takes longer but is safer.

Q: Why use lock_timeout?
+ To fail fast instead of blocking queries
- To speed disks :: No.
- To rename tables :: No.
- To compress data :: No.
> Avoid long lock queues.

Q: What is NOT VALID for constraints?
+ Checks only new rows until validated
- Disables the constraint forever :: No.
- Deletes bad rows :: No.
- Locks the table :: No.
> Validate later with a weaker lock.

Q: What is the contract step?
+ Removing the old structure after the switch
- Adding a new column :: No.
- Backing up :: No.
- Restarting :: No.
> It happens in a later release.
```

```cards
lock_timeout :: Maximum time a statement waits for a lock
NOT VALID :: Adds a constraint without checking existing rows
Backfill :: Filling new data for existing rows
Expand and contract :: Compatible, staged schema change pattern
```
