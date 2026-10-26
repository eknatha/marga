---
title: Safe schema migrations and zero-downtime changes
minutes: 15
summary: Change a live schema without outages using the expand and contract pattern, online index and column changes, batched backfills and migration tooling.
---

Application code can be rolled back in seconds. A schema change on a table with a hundred million rows may lock it for minutes and cannot be undone by redeploying. Safe migrations are a skill of their own.

## What you will learn

- Migration tools and versioned changes
- Which operations take dangerous locks
- The expand and contract pattern
- Backfilling data in batches
- Checks before running a migration in production

## Versioned migrations

Keep every schema change as a numbered file in version control, applied in order by a tool (Flyway, Liquibase, Alembic, Rails or Django migrations, or Atlas). The tool records what has run in a table, so every environment ends in the same state and reviewers see the change before it ships.

```sql
-- 0042_add_orders_status.sql
ALTER TABLE orders ADD COLUMN status text;
```

Run migrations from the pipeline, not from a laptop, and run them before the code that needs them.

## Operations that hurt

| Operation | Risk on a large table | Safer approach |
|-----------|----------------------|----------------|
| Add a column with a volatile default (older versions) | Rewrites the whole table | Add nullable, backfill in batches, then set the default |
| Add `NOT NULL` | Scans the table under a strong lock | Add a `CHECK ... NOT VALID` constraint, validate separately |
| Add a foreign key | Locks and validates both tables | Add `NOT VALID`, then `VALIDATE CONSTRAINT` |
| Create an index | Blocks writes | `CREATE INDEX CONCURRENTLY` |
| Change a column type | Rewrites the table | Add a new column and migrate |
| Rename a column | Breaks running code | Expand and contract |

Always set a lock timeout, so a migration that cannot get its lock fails fast instead of queueing:

```sql
SET lock_timeout = '3s';
SET statement_timeout = '60s';
ALTER TABLE orders ADD COLUMN status text;
```

Retry in a quiet moment if it fails.

## Expand and contract

To rename `customer_name` to `full_name` without downtime, do it in separate deploys:

1. **Expand**: add the new column `full_name` (nullable)
2. **Write both**: deploy code that writes the old and the new column
3. **Backfill**: copy existing data in batches
4. **Read the new column**: deploy code that reads `full_name`
5. **Stop writing the old column**
6. **Contract**: drop `customer_name` in a later release, after a safety period

Each step is backward compatible with the previous version of the code, so a rollback is always possible until the final drop.

## Backfill in batches

```sql
UPDATE orders SET full_name = customer_name
WHERE id BETWEEN 1 AND 10000 AND full_name IS NULL;
```

```bash
for start in $(seq 1 10000 1000000); do
  psql shop -c "UPDATE orders SET full_name = customer_name WHERE id BETWEEN $start AND $((start + 9999)) AND full_name IS NULL"
  sleep 0.5
done
```

Small batches keep transactions short, avoid replication lag spikes, and can be stopped and resumed. Watch replica lag while it runs and slow down if it grows.

## Before production

- Rehearse on a restored copy of production-sized data and record how long it takes
- Review the lock each statement takes
- Have a rollback or forward-fix plan
- Take a fresh backup or know your PITR window
- Do not combine a risky migration with a code release in the same deploy

```predict
Q: You must make a nullable column NOT NULL on a table with 200 million rows. What is a safer approach than ALTER COLUMN SET NOT NULL directly?
???
Add a CHECK (column IS NOT NULL) constraint as NOT VALID, which is quick, then run VALIDATE CONSTRAINT, which does not block writes for long. On recent PostgreSQL versions the validated constraint can then be used to set NOT NULL cheaply.
> Splitting a change into a quick lock and a slow non-blocking check keeps the site up.
```

```diagram
title: Expand and contract
node: exp | Expand | 0 | 1 | Add the new column or table, nullable. | Adding it with a heavy default locks the table.
node: dual | Write both | 1 | 1 | Code writes old and new, then data is backfilled. | Forgetting rows written before dual-write leaves gaps.
node: read | Read new | 2 | 1 | Switch reads to the new column. | Switching before the backfill finishes returns missing data.
node: drop | Contract | 3 | 1 | Drop the old column after a safe period. | Dropping too early removes your rollback.
edge: exp | dual
edge: dual | read
edge: read | drop
```

## Incident: the column rename

> **Incident:** A single deploy renamed a column and shipped the code that used the new name. During the rolling update, old application instances still queried the old name and returned errors for seven minutes.

```console
$ kubectl logs deploy/shop | grep -c 'column "customer_name" does not exist'
18342
```

The team adopted expand and contract for all renames, added a rule that migrations must work with both the old and new code versions, and tested that rule in staging by running the previous release against the new schema.

## Common mistakes

- Running a table rewrite at peak time
- Migration and code in one irreversible step
- No lock timeout
- Skipping a rehearsal on realistic data

```quiz
Q: What is expand and contract?
- A way to resize disks :: Unrelated.
+ Making schema changes in backward compatible steps across several deploys
- A backup method :: Unrelated.
- A replication mode :: Unrelated.
> Each step works with both the old and new code.

Q: Why batch a backfill?
- SQL requires it :: It does not.
+ To keep transactions short and limit locks and replication lag
- To avoid indexes :: Unrelated.
- To encrypt rows :: Unrelated.
> Small steps are safe to stop and resume.

Q: Why set lock_timeout before ALTER TABLE?
- To speed the change :: It does not.
+ So the statement fails quickly instead of queueing and blocking other queries
- To skip validation :: It does not.
- To drop locks :: It does not.
> A queued ALTER can take down a busy table.

Q: When should the old column be dropped?
- In the same deploy :: This removes your rollback.
+ Later, after all code uses the new column and a safety period has passed
- Never :: It can be dropped eventually.
- Before the backfill :: This loses data.
> Dropping is the one step that is hard to undo.
```

```cards
Migration :: A versioned, ordered change to the database schema
Expand and contract :: Add, migrate, then remove, in compatible steps
NOT VALID constraint :: Added quickly, validated later without long locks
Backfill :: Filling in data for existing rows, ideally in batches
lock_timeout :: Fail instead of waiting too long for a lock
```
