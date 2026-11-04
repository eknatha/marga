---
title: Locks, deadlocks and long transactions
minutes: 15
summary: Find what is blocking what, understand idle-in-transaction sessions and deadlocks, and set timeouts that protect the database.
---

A query can be slow because it is working, or because it is waiting. Locks are the usual reason for waiting, and one forgotten transaction can stop a whole application.

## What you will learn

- Row locks, table locks and how they conflict
- Finding the blocker with pg_stat_activity and pg_blocking_pids
- Idle in transaction and why it is dangerous
- Deadlocks and the timeouts that limit damage

## Locks in short

When a transaction updates a row, it holds a lock on it until the transaction ends. Other writers to that row wait. Readers are not blocked, because PostgreSQL keeps old row versions for them (MVCC). Statements such as `ALTER TABLE` take stronger table-level locks, and those can queue behind a long reader and then block everyone behind them.

The key sentence: **locks are held until COMMIT or ROLLBACK**, not until the statement ends.

## Find the blocker

```console
$ psql -c "SELECT pid, state, wait_event_type, wait_event, now()-xact_start AS tx_age, left(query,50) AS query FROM pg_stat_activity WHERE datname='shop' ORDER BY xact_start;"
 pid  | state               | wait_event_type | wait_event    | tx_age   | query
------+---------------------+-----------------+---------------+----------+------------------------------------------------
 2210 | idle in transaction |                 |               | 03:12:44 | UPDATE accounts SET balance = balance - 10 WHERE
 2488 | active              | Lock            | transactionid | 00:41:02 | UPDATE accounts SET balance = balance + 10 WHERE
$ psql -c "SELECT pid, pg_blocking_pids(pid) AS blocked_by FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;"
 pid  | blocked_by
------+------------
 2488 | {2210}
```

Process 2488 waits for a lock held by 2210. Process 2210 is **idle in transaction**: it started a transaction, did an update, and then did nothing for three hours. The client opened a transaction and never finished it, often because of a bug, a crashed worker, or someone's session left open in a terminal.

You can stop the blocker with `SELECT pg_terminate_backend(2210);`. That rolls back its work, so ask who owns it if the data matters. `pg_cancel_backend(pid)` cancels only the running statement and is gentler.

## Long transactions hurt in other ways

A transaction that stays open holds back the cleanup of old row versions across the database, so tables grow and vacuum cannot remove dead rows. It also holds locks and may keep a replica in conflict. Keep transactions short, and never keep one open while waiting for a person or a slow outside call.

## Deadlocks

A **deadlock** happens when two transactions each hold a lock the other needs. PostgreSQL detects it after `deadlock_timeout` (1 second by default), aborts one of them with an error, and lets the other continue.

```console
ERROR:  deadlock detected
DETAIL:  Process 2210 waits for ShareLock on transaction 8841; blocked by process 2488.
         Process 2488 waits for ShareLock on transaction 8839; blocked by process 2210.
HINT:  See server log for query details.
```

The cure is in the application: touch rows in the same order everywhere (for example, always update the account with the lower id first), keep transactions short, and retry the failed transaction.

## Timeouts that protect you

- `lock_timeout`: how long a statement waits for a lock before giving up. Set it for migrations, so an `ALTER TABLE` that cannot get its lock fails quickly instead of queueing behind a reader and freezing the table.
- `idle_in_transaction_session_timeout`: ends sessions that sit in a transaction doing nothing.
- `statement_timeout`: caps how long a single statement may run.

```text
ALTER ROLE app SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE app SET statement_timeout = '30s';
```

## Incident: The migration that froze checkout

> **Incident:** A one-line schema change brought checkout to a halt for four minutes.

```console
$ psql -c "SELECT pid, state, wait_event_type, now()-query_start AS age, left(query,45) FROM pg_stat_activity WHERE state <> 'idle' ORDER BY query_start LIMIT 3;"
 pid  | state  | wait_event_type | age      | left
------+--------+-----------------+----------+---------------------------------------------
 1190 | active |                 | 00:04:10 | SELECT count(*) FROM orders  -- report
 1304 | active | Lock            | 00:03:55 | ALTER TABLE orders ADD COLUMN note text
 1350 | active | Lock            | 00:03:50 | INSERT INTO orders (customer_id, total)
```

A long report held a weak lock on `orders`. The `ALTER TABLE` needed a strong lock and queued behind it. Every new insert then queued behind the `ALTER`, so checkout stopped even though the report only read data. Setting `lock_timeout = '3s'` for the migration lets it fail fast and be retried in a quiet moment, and the report was moved to a replica.

## Common mistakes

- Running migrations with no lock_timeout
- Leaving transactions open while waiting for user input or HTTP calls
- Killing the victim instead of the blocker
- Ignoring deadlock errors instead of fixing lock order and retrying

```quiz
Q: How long does a row lock last?
+ Until the transaction commits or rolls back
- Until the statement ends :: Locks last to the end of the transaction.
- One second :: No.
- Until the next vacuum :: No.
> Keep transactions short.

Q: What does pg_blocking_pids(pid) return?
+ The processes that are blocking the given process
- The pids of replicas :: No.
- The pids of vacuum workers :: No.
- The pids the process will start :: No.
> It helps find the root blocker.

Q: Why is idle in transaction dangerous?
+ It holds locks and old row versions while doing nothing
- It uses all CPU :: It uses almost none.
- It deletes tables :: No.
- It disables indexes :: No.
> Set idle_in_transaction_session_timeout.

Q: Why set lock_timeout for a schema migration?
+ So it fails fast instead of queueing and blocking all other writers
- To make the change faster :: It does not speed it.
- To skip the lock :: It still needs the lock.
- To keep data private :: No.
> A queued strong lock blocks everyone behind it.
```

```cards
MVCC :: readers see old row versions and do not block writers
Idle in transaction :: open transaction doing nothing
Deadlock :: two transactions each wait for the other
lock_timeout :: limit on waiting for a lock
statement_timeout :: limit on statement run time
pg_terminate_backend :: ends a session and rolls it back
```
