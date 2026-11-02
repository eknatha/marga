---
title: Transactions, isolation and locking
minutes: 15
summary: Learn ACID, isolation levels, how locks and long transactions cause stalls, and how to find and resolve blocking and deadlocks.
---

A bank transfer must either move the money out and in, or do neither. Transactions give databases that promise. They also explain many production stalls, because a transaction that stays open too long holds locks that everyone else waits for.

## What you will learn

- ACID in plain terms
- Isolation levels and the anomalies they prevent
- Row locks, table locks and deadlocks
- Finding blocking sessions and long transactions

## ACID

| Letter | Meaning | What it protects you from |
|--------|---------|---------------------------|
| Atomicity | All statements in a transaction apply, or none | Half-done transfers |
| Consistency | Constraints hold before and after | Orphaned or invalid rows |
| Isolation | Concurrent transactions do not see each other's partial work | Reading unfinished data |
| Durability | Committed data survives a crash | Losing acknowledged writes |

Durability comes from the **write-ahead log (WAL)**: changes are written to the log and flushed to disk before the commit is acknowledged.

## A transaction

```sql
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

If the server crashes between the two updates, neither remains after recovery.

## Isolation levels

| Level | Prevents | Notes |
|-------|----------|-------|
| Read committed | Reading uncommitted data | Default in PostgreSQL. Each statement sees data committed before it began. |
| Repeatable read | Rows changing between two reads in one transaction | Default in MySQL InnoDB. |
| Serializable | All anomalies, as if transactions ran one after another | Can abort transactions that must be retried. |

Stronger isolation costs more coordination. Applications using serializable mode must be ready to retry on a serialization failure.

## Locks

Writers lock the rows they change until commit or rollback. Readers normally do not block writers (PostgreSQL uses MVCC, keeping old versions visible to readers).

```sql
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
```

`FOR UPDATE` locks selected rows so you can safely read then update them. Schema changes (`ALTER TABLE`) take stronger table-level locks, and a waiting `ALTER` can queue behind a long transaction while blocking everyone behind it.

**Deadlock**: transaction A holds row 1 and waits for row 2, while B holds row 2 and waits for row 1. The database detects it, aborts one transaction and reports an error. Prevent deadlocks by updating rows in a consistent order and keeping transactions short.

## Find blockers

```sql
SELECT blocked.pid AS blocked_pid, blocking.pid AS blocking_pid,
       left(blocking.query, 60) AS blocking_query,
       now() - blocking.xact_start AS blocking_for
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid));

SELECT pid, state, now() - xact_start AS xact_age, left(query, 60)
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY xact_age DESC LIMIT 5;
```

Look for sessions in state `idle in transaction`. They hold locks (and stop cleanup of old row versions) while doing nothing. Protect yourself with timeouts:

```sql
ALTER ROLE app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE app SET lock_timeout = '5s';
ALTER ROLE app SET statement_timeout = '30s';
```

To end a stuck session: `SELECT pg_cancel_backend(pid);` cancels the query, and `pg_terminate_backend(pid)` ends the connection. Fix the cause in the application afterwards.

```predict
Q: A developer opens a transaction, runs one UPDATE, and then goes to lunch without committing. What do other sessions experience?
???
Anyone who wants to change the same rows waits until the transaction ends, and the database cannot clean up old row versions. A lock_timeout or idle_in_transaction_session_timeout limits the damage.
> Open transactions are not free. Keep them short.
```

```diagram
title: How one long transaction becomes an outage
node: tx | Long open transaction | 0 | 1 | Holds row locks and an old snapshot. | Idle in transaction sessions are invisible without monitoring.
node: alter | Schema change waits | 1 | 1 | ALTER TABLE queues for a lock behind the transaction. | The queued ALTER now blocks every new query.
node: pile | Queries pile up | 2 | 1 | Connections fill with waiting statements. | The pool is exhausted and the app times out.
node: out | User-facing outage | 3 | 1 | Requests fail across the service. | Killing the wrong session may make it worse.
edge: tx | alter
edge: alter | pile
edge: pile | out
```

## Incident: the migration that waited for a lock

> **Incident:** A routine ALTER TABLE queued behind a report transaction that had been open for forty minutes. New queries queued behind the ALTER, and the site went down in seconds.

```console
$ psql shop -c "SELECT pid, state, now()-xact_start AS age FROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY age DESC LIMIT 2"
```

They cancelled the ALTER first, which freed the queue, set `lock_timeout` on migrations so they fail fast, and moved reports to a replica.

## Common mistakes

- Holding a transaction open while calling another service
- Running schema changes with no lock timeout
- Ignoring `idle in transaction` sessions
- Retrying deadlocks forever without finding the order problem

```quiz
Q: What does atomicity guarantee?
- Faster queries :: It does not affect speed.
+ All statements in a transaction apply or none do
- Data is encrypted :: It is unrelated.
- Only one user at a time :: That is serializable isolation.
> It prevents half-finished changes.

Q: What is a deadlock?
- A crashed server :: It is a lock cycle.
+ Two transactions each wait for a lock the other holds
- A full disk :: It is a storage issue.
- A slow query :: Slowness is not a cycle.
> The database aborts one transaction to break the cycle.

Q: Why are idle in transaction sessions harmful?
- They use network bandwidth :: They use little.
+ They hold locks and old snapshots while doing nothing
- They encrypt tables :: They do not.
- They are always safe :: They are a common cause of stalls.
> Set a session timeout so they cannot sit forever.

Q: Why set lock_timeout on schema migrations?
- To make them faster :: It makes them fail faster.
+ So the migration fails quickly instead of queueing and blocking all other queries
- To skip locks :: It does not skip locking.
- To enable replication :: Unrelated.
> A failed migration can be retried. A blocked site cannot easily be recovered.
```

```cards
Atomicity :: A transaction applies fully or not at all
Isolation level :: Controls what concurrent transactions can see
Deadlock :: Two transactions waiting on each other's locks
idle in transaction :: A session holding a transaction open while idle
lock_timeout :: Fail if a lock cannot be obtained in time
```
