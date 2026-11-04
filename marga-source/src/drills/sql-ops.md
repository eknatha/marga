## Seq scan on a big table
level: mid
A report query takes 14 seconds.

```text
EXPLAIN (ANALYZE) SELECT * FROM orders WHERE customer_id = 4821;
Seq Scan on orders  (cost=0.00..412345.00 rows=1 width=88) (actual time=0.02..13890.1 rows=1 loops=1)
  Filter: (customer_id = 4821)
  Rows Removed by Filter: 12000000
```
? What is the most likely fix?
+ Create an index on orders (customer_id)
- Add more memory to the application
- Use SELECT DISTINCT
- Restart the database
why: The query reads 12 million rows to return one. An index on the filter column lets the planner jump to it.

## Deadlock in the logs
level: senior
Two jobs sometimes fail with a deadlock error.

```text
ERROR: deadlock detected
DETAIL: Process 311 waits for ShareLock on transaction 9021; blocked by process 288.
Process 288 waits for ShareLock on transaction 9020; blocked by process 311.
```
? What is a standard fix?
+ Make all code update rows in the same order, keep transactions short, and retry on deadlock
- Increase max_connections
- Disable locking
- Use a bigger disk
why: A deadlock is a cycle in lock order. Consistent ordering removes the cycle and a retry covers the rare case.

## Replica lag grows
level: mid
A read replica is minutes behind during a big batch job.

```text
SELECT now() - pg_last_xact_replay_timestamp() AS lag;
 lag
------
 00:07:42
```
? What is a sensible first step?
+ Check whether replay is blocked by a long query on the replica or limited by I/O, and reduce the batch size
- Promote the replica now
- Drop the primary
- Turn off WAL
why: Lag comes from replay delays, such as conflicting queries or I/O. Find which, and throttle the writer.

## Table keeps growing
level: mid
A table with frequent updates has doubled in size but row count is stable.

```text
SELECT relname, n_live_tup, n_dead_tup FROM pg_stat_user_tables WHERE relname='sessions';
 sessions | 1200000 | 38000000
```
? What is happening?
+ Dead rows are piling up because vacuum cannot keep up or is blocked
- The table is compressed
- The index is too small
- The disk is encrypted
why: Updates leave dead row versions. Vacuum must clean them, and a long transaction or low settings can stop it.

## Long transaction blocks vacuum
level: senior
Vacuum runs but bloat does not shrink.

```text
SELECT pid, now()-xact_start AS age, state FROM pg_stat_activity WHERE xact_start IS NOT NULL ORDER BY age DESC LIMIT 1;
 2214 | 2 days 03:10:00 | idle in transaction
```
? What should you do?
+ Find who owns the old transaction, end it, and add a timeout so it cannot recur
- Run VACUUM FULL during business hours
- Delete the table
- Ignore it
why: The oldest open transaction stops vacuum from removing rows newer than it. Ending it lets cleanup proceed.

