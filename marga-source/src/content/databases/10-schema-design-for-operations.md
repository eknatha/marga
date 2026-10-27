---
title: Schema design that is easy to operate
minutes: 12
summary: Choose keys, types, constraints and table layouts that keep a database fast, safe to change and easy to run.
---

The application team picked a text column for dates, no constraints, and one giant table for everything. It worked in the demo. A year later, bad data is everywhere, every migration locks the table, and nobody can say what a column means. Good design is partly an operations decision.

## What you will learn

- Keys and types that age well
- Constraints as a safety net
- Layouts that ease growth: partitioning and archiving
- Designing for change: nullable columns, defaults and naming

## Keys and types

Use a stable **primary key** that never changes and carries no business meaning: a bigint identity or a UUID. Use proper types: `timestamptz` for times (stored in UTC), `numeric` for money, `boolean`, `jsonb` for flexible parts. Dates stored as text cannot be compared, indexed or validated correctly. Pick sizes with growth in mind: an `integer` key overflows at about 2.1 billion rows, and changing it later means rewriting the table.

## Constraints

Let the database refuse bad data:

```sql
CREATE TABLE payments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id    bigint NOT NULL REFERENCES orders(id),
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  currency    char(3) NOT NULL,
  status      text NOT NULL CHECK (status IN ('pending','paid','failed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, created_at)
);
```

`NOT NULL`, `CHECK`, `UNIQUE` and foreign keys are cheap and catch bugs from every application, script and manual fix. Add them from the start; adding them later requires cleaning existing data first.

## Layouts for growth

Tables that grow without limit (events, logs, payments) become slow to vacuum, back up and index. Use **partitioning** by time so old data sits in separate partitions that you can detach and archive quickly:

```sql
CREATE TABLE events (
  id bigint GENERATED ALWAYS AS IDENTITY,
  happened_at timestamptz NOT NULL,
  payload jsonb
) PARTITION BY RANGE (happened_at);

CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

Dropping a month is then an instant `DROP TABLE`, not a slow delete that leaves bloat. Automate partition creation so you never run out of them.

## Designing for change

Make future migrations safe. Add new columns as nullable or with a cheap default, backfill in batches, then add constraints. Avoid renaming columns used by running code without a compatibility period. Keep names clear and consistent (`created_at`, `customer_id`), and document the meaning of non-obvious columns with `COMMENT ON`. Keep rarely used wide data (big documents, blobs) out of hot tables. Review each schema change with a question: what happens when this table has a hundred times more rows?

```predict
Q: Why is storing dates as text a poor design choice?
???
The database cannot validate, compare, index or do arithmetic on them reliably, and bad values get in.
> Types are constraints too.
```

## Incident: The table nobody could change

> **Incident:** A 900 million row events table needed a new column, and the migration locked writes long enough to cause an outage.

```console
=> ALTER TABLE events ALTER COLUMN user_id TYPE bigint;
-- waiting for ACCESS EXCLUSIVE lock ...
=> SELECT count(*) FROM events;
  count
-----------
 912330417
```

The team had used an integer key that was about to overflow, in a single unpartitioned table. The fix needed a phased plan: a new partitioned table, dual writes, batched copy, and a switch. Afterward the company adopted schema guidelines: bigint keys, timestamptz, constraints from the start, time partitioning for event tables, and a review checklist for every migration.

## Common mistakes

- Integer keys on tables that can grow large
- Missing constraints, so bad data accumulates
- One unbounded table with no archive plan
- Renaming or dropping columns without a compatibility period

```quiz
Q: Which type is best for timestamps?
+ timestamptz, storing UTC
- text :: It cannot be validated or compared.
- integer :: It loses meaning.
- char(10) :: Not a time type.
> Use real types.

Q: Why add constraints in the database?
+ They block bad data from every application, script and manual change
- They speed up all queries :: That is not their goal.
- They replace backups :: They do not.
- They reduce disk use :: Not their purpose.
> Defence in depth.

Q: What is the benefit of time partitioning for event tables?
+ Old data can be detached or dropped quickly without bloat
- Queries are always faster :: Not always.
- It removes the need for keys :: Keys remain.
- It encrypts data :: It does not.
> Cheap archiving.

Q: How do you add a new column safely to a large table?
+ Add it nullable or with a cheap default, backfill in batches, then add constraints
- Rewrite the table in one transaction :: It blocks writes.
- Drop and recreate the table :: Data loss.
- Do it during peak hours :: Increases risk.
> Plan for scale.
```

```cards
Time type :: timestamptz
Money type :: numeric
Safety net :: NOT NULL, CHECK, UNIQUE, foreign keys
Large event tables :: partition by time
Safe change :: nullable column, batch backfill, then constraint
```
