## DELETE with no WHERE
level: junior
A cleanup was run in a production console.

```text
$ psql shop -c "DELETE FROM customers"
DELETE 1840223
```
? What should have prevented this and what do you do now?
+ Use a transaction with a row count check beforehand, and restore from point-in-time recovery to just before the delete
- Run VACUUM
- Restart the database
- Drop the table and recreate it
why: A transaction would have allowed ROLLBACK. Now the data needs a backup restore or PITR, and read-only consoles by default stop it recurring.

## Sequential scan on a big table
level: junior
A frequent query is slow.

```text
Seq Scan on orders  (cost=0.00..412345 rows=12)
  Filter: (customer_id = 42)
Execution Time: 2310 ms
```
? What is the likely fix?
+ Create an index on orders (customer_id), concurrently on a live system
- Add more connections
- Run ANALYZE only
- Rewrite using SELECT *
why: A filter on an unindexed column forces a full scan. CREATE INDEX CONCURRENTLY avoids blocking writes.

## Estimated rows far from actual
level: mid
A plan looks wrong.

```text
Nested Loop (rows=10) (actual rows=480000)
```
? What does the gap suggest?
+ Stale statistics, so run ANALYZE and check the predicate
- The disk is failing
- The index is corrupt
- The cache is too large
why: The planner chooses plans from estimates. A big gap points at statistics or correlated columns.

## Migration queued behind a transaction
level: senior
The site hangs right after an ALTER TABLE started.

```text
pid 4123  idle in transaction  41 min
pid 5120  ALTER TABLE orders ...  waiting
(new queries: waiting)
```
? What do you do first?
+ Cancel the queued ALTER so queries flow, then deal with the long transaction and retry with lock_timeout
- Kill all application connections
- Restart the database
- Wait, it will finish soon
why: The queued ALTER blocks everything behind it. Cancelling it frees the queue immediately, and lock_timeout stops it recurring.

## Disk full from WAL
level: senior
The primary's disk is 98 percent full.

```text
slot_name   | active | retained
replica_old | f      | 400 GB
```
? What is the safe action?
+ Confirm the slot is abandoned, drop it with pg_drop_replication_slot, and alert on slot lag
- Delete files in pg_wal by hand
- Run VACUUM FULL
- Truncate the largest table
why: An unused slot makes the primary keep all logs. Never delete WAL files manually.

## Connections exhausted
level: mid
Latency is high and CPU is low.

```text
FATAL: sorry, too many clients already
active: 12  idle: 1960
```
? What is the best fix?
+ Add a pooler such as PgBouncer and reduce per-instance pool sizes
- Raise max_connections to 10000
- Add more CPU
- Restart every hour
why: Connections cost memory. Pool them rather than raising the limit.

## Reading from a replica after write
level: mid
Users do not see data they just saved.

```text
write at 10:00:00.0 on primary
read  at 10:00:00.2 from replica -> old row
```
? What is happening and how do you fix it?
+ Replication lag. Read from the primary right after a write or wait for the replica to catch up
- The write failed
- The cache is full
- The index is missing
why: Asynchronous replicas can be slightly behind, so read-your-own-writes needs the primary or a position check.

## Backup file is empty
level: junior
The nightly job reports success.

```text
-rw-r--r-- 1 postgres postgres 0 Jan 13 02:00 shop.dump
```
? What is wrong with the monitoring?
+ It checks the exit code only. Alert on backup size and age, and run regular restore tests
- Nothing, exit code 0 means success
- Backups should be larger than the disk
- Delete older backups
why: A zero-byte file is not a backup. Only a restore proves usability.

## Cache restart meltdown
level: senior
The database fell over after a cache restart.

```text
keyspace_hits:0
keyspace_misses:482113
```
? How do you prevent a repeat?
+ Warm the cache gradually, rate-limit rebuilds, and load test the database without the cache
- Never restart the cache
- Disable expiry
- Add more cache keys
why: A cold cache sends full traffic to the database. Plan for it before maintenance.
