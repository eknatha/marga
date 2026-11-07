---
title: Partitioning and data retention
minutes: 12
summary: Split large tables by time or key, drop old data cheaply and plan partitions so maintenance stays fast.
---

A table with billions of rows can still be fast to query, but it becomes hard to maintain: deletes are slow, vacuum takes forever and indexes grow huge. Partitioning keeps data in manageable pieces and makes retention a metadata operation.

## What you will learn

- Range, list and hash partitioning and when to use each
- Creating partitions and automating them
- Dropping and detaching old data safely
- Making queries use partition pruning

## Declarative partitioning

```sql
CREATE TABLE events (
    id bigint GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz NOT NULL,
    kind text NOT NULL,
    payload jsonb
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_11 PARTITION OF events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE INDEX ON events_2026_11 (created_at, kind);
```

**Range** partitions by time suit logs and events. **List** partitions split by a category such as region. **Hash** spreads rows evenly across a fixed number of partitions. Primary keys and unique constraints must include the partition key.

## Automate and retire

Create next month's partition before it is needed, with a scheduled job or an extension, and alert if it is missing, because inserts outside every range fail. Retire old data by detaching, archiving and dropping:

```sql
ALTER TABLE events DETACH PARTITION events_2025_11 CONCURRENTLY;
-- archive with pg_dump if required, then:
DROP TABLE events_2025_11;
```

Dropping a partition is fast and does not create dead rows, unlike deleting millions of rows.

## Pruning

```sql
EXPLAIN SELECT count(*) FROM events
WHERE created_at >= '2026-11-01' AND created_at < '2026-11-08';
```

If the plan shows only the relevant partitions, **pruning** works. Queries that omit the partition key scan all partitions. Keep the number of partitions reasonable, because thousands of tiny partitions slow planning.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Partitioning and data retention fits together
node: n1 | Declarative partitioning | 0 | 0 | Range partitions by time suit logs and events. | Forgetting to create future partitions. | process
node: n2 | Automate and retire | 1 | 1 | Create next month's partition before it is needed, with a scheduled job or an extension, and alert if it is missing, because inserts outside every range fail. | Deleting rows instead of dropping partitions. | process
node: n3 | Pruning | 2 | 0 | If the plan shows only the relevant partitions, pruning works. | Queries that do not use the partition key. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: No partition for today

> **Incident:** Inserts failed at midnight because the next partition did not exist.

```console
ERROR:  no partition of relation "events" found for row
DETAIL:  Partition key of the failing row contains (created_at) = (2026-12-01 00:00:03+00).
```

The job that created monthly partitions had been failing silently for weeks. At the month boundary writes began to fail. The team added a default partition as a safety net, alerts for missing future partitions and a test that checks three months ahead.

## Common mistakes

- Forgetting to create future partitions
- Deleting rows instead of dropping partitions
- Queries that do not use the partition key
- Creating thousands of tiny partitions

```quiz
Q: What is the main retention benefit of partitioning?
+ Old data can be dropped quickly
- Queries always run faster :: No.
- No backups needed :: No.
- Disks last longer :: No.
> Dropping a partition is a metadata operation.

Q: What must a primary key include?
+ The partition key
- A text column :: No.
- A timestamp only :: No.
- Nothing :: No.
> PostgreSQL requires it.

Q: What is partition pruning?
+ The planner skips partitions that cannot match
- Deleting old rows :: No.
- Compressing tables :: No.
- Renaming columns :: No.
> It limits scanning. The lesson section above explains why.

Q: What protects against a missing partition?
+ A default partition and alerts
- More RAM :: No.
- Turning off writes :: No.
- Reindexing :: No.
> A safety net catches stray rows.
```

```cards
Range partition :: Partition defined by value ranges such as dates
Pruning :: Skipping partitions the query cannot match
DETACH PARTITION :: Removes a partition from the parent table
Default partition :: Catches rows that fit no other partition
```
