## What is the difference between a primary key and a foreign key?
level: junior
A primary key uniquely identifies each row in a table. A foreign key is a column that must match a primary key (or unique key) in another table, so the database enforces that the relationship is valid and prevents orphaned rows.

## What does an index do and what does it cost?
level: junior
An index is a sorted structure, usually a B-tree, that lets the database find rows without scanning the whole table. It speeds reads on the indexed columns but takes space and slows inserts, updates and deletes because every index must be maintained. Index what your queries need and remove unused indexes.

## What does ACID stand for?
level: junior
Atomicity (a transaction applies fully or not at all), Consistency (constraints hold), Isolation (concurrent transactions do not see each other's partial work) and Durability (committed data survives a crash, typically through the write-ahead log).

## A query is slow. What do you do?
level: mid
Find out whether it is the query or the system. Check host resources, connections and locks, then take the query to EXPLAIN ANALYZE and look for sequential scans on big tables, large gaps between estimated and actual rows, sorts spilling to disk and nested loops over huge sets. Fix with an index, a rewrite or fresh statistics, and measure before and after.

## What is a deadlock and how do you reduce them?
level: mid
Two transactions each hold a lock the other needs, so neither can proceed. The database detects it and aborts one. Reduce them by updating rows in a consistent order, keeping transactions short, locking only what you need, and having the application retry the aborted transaction.

## Why is a replica not a backup?
level: mid
A replica copies every change almost immediately, including a mistaken delete or a dropped table. It protects against hardware failure, not against bad changes or corruption. A backup is an independent, point-in-time copy, ideally with archived logs for point-in-time recovery, stored elsewhere and tested by restoring.

## How do you add a NOT NULL column or index to a huge table without downtime?
level: senior
Use online methods: create indexes concurrently, add the column nullable, backfill in small batches while watching replica lag, add a CHECK constraint as NOT VALID and validate it separately, and set lock_timeout so the migration fails fast rather than queueing behind a long transaction. Rehearse on production-sized data and use expand and contract so old and new code both work.

## Describe a safe database failover.
level: senior
Decide the primary is down using a quorum rather than one health check, fence the old primary so it cannot accept writes, promote the most up-to-date replica, redirect clients with a proxy, virtual IP or DNS, and rebuild the old primary as a replica. Rehearse it regularly, and check how connection pools and application retries behave, because they decide what users experience. The risk to prevent is split brain.
