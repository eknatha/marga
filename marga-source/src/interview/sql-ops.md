## How do you find out why a query is slow?
level: junior
I find the statement from the slow query log or pg_stat_statements, then run EXPLAIN with ANALYZE to see the real plan, row counts and time per node. I look for sequential scans on big tables, large gaps between estimated and actual rows, sorts that spill to disk and loops that repeat too often. Then I change one thing and measure again.

## When does an index help and when does it hurt?
level: junior
An index helps queries that filter, join or sort on its columns and return a small part of the table. It costs disk space and slows inserts, updates and deletes, because every index must be maintained. An index the planner never uses is pure cost, so I check usage statistics and remove ones that do nothing.

## What does idle in transaction mean and why is it a problem?
level: junior
It is a session that opened a transaction and is waiting without finishing it. It holds a connection, may hold locks, and can stop vacuum from cleaning dead rows. Typical causes are application code that does slow work inside a transaction, or missing commit and rollback. I fix the code and set a timeout.

## How do you add an index to a busy production table safely?
level: mid
I use the concurrent build option so writes are not blocked, schedule it outside peak, check disk and I/O headroom first, and verify afterwards that the planner uses it and that the index is valid. A failed concurrent build leaves an invalid index that I drop and retry. I also test the query plan on realistic data size before production.

## How do you size connections and a pool?
level: mid
More connections do not mean more throughput; past a point they add contention and memory use. I count active work with the number of cores and I/O capacity, put a pooler such as PgBouncer in front, keep the server connection count modest, and let many clients share it. I watch wait time for a free connection as the signal, not only the count.

## How would you run a replicated database with confidence on day two?
level: senior
I define recovery point and recovery time targets, monitor replication lag, WAL growth and disk, and practise failover and restores on a schedule. I keep long transactions and vacuum health under watch, plan schema changes as backwards-compatible steps and test major upgrades on a copy. Runbooks are short, current and rehearsed, because a calm failover comes from repetition.
