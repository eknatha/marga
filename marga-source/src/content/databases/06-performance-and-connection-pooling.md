---
title: Database performance, memory and connection pooling
minutes: 15
summary: Find slow queries with statistics, understand memory and cache behaviour, size connections with a pooler, and spot bloat and vacuum problems.
---

When a service slows down, the database is often involved, but guessing wastes hours. A few views and settings tell you whether the problem is bad queries, too many connections, memory pressure or maintenance falling behind.

## What you will learn

- Finding the most expensive queries
- Cache hit ratio and memory settings
- Why connections are expensive, and what a pooler does
- Vacuum, bloat and statistics

## Find the worst queries

Enable the `pg_stat_statements` extension. It records time and calls per normalised query.

```sql
SELECT calls, round(total_exec_time::numeric, 0) AS total_ms,
       round(mean_exec_time::numeric, 2) AS mean_ms, left(query, 70) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

Sort by **total** time first. A query that takes 5 ms but runs 10 million times costs more than one that takes 2 seconds once a day. MySQL has the slow query log and the Performance Schema for the same job. Take the worst few to `EXPLAIN ANALYZE`.

## Memory and cache

Databases are fast when working data fits in memory.

```sql
SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_pct
FROM pg_stat_database;
```

A persistently low hit ratio on an OLTP database suggests too little memory or queries that scan too much. Key PostgreSQL settings:

- `shared_buffers`: the database's own cache, commonly around a quarter of RAM
- `work_mem`: memory per sort or hash **per operation**, so a large value times many sessions can exhaust RAM
- `effective_cache_size`: a hint about how much memory the OS cache provides

Treat default settings as a starting point and change one thing at a time with measurements.

## Connections are expensive

Each PostgreSQL connection is a separate process that uses memory. Hundreds of idle connections from many application instances waste resources and make the server slow. A **connection pooler** such as PgBouncer sits in front and shares a small number of real connections among many clients.

```text
[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
```

- `transaction` mode returns a server connection to the pool after each transaction, which gives the best sharing but breaks features that rely on session state
- Size the pool near the number of CPU cores times two or so, not the number of clients
- Check also the connection pool in your application framework. Many pools times many instances can still overload the database.

```sql
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
SHOW max_connections;
```

## Vacuum and bloat

PostgreSQL does not overwrite rows. Updates and deletes leave old row versions that **autovacuum** removes later. If vacuum falls behind, tables and indexes grow (**bloat**) and queries slow. Long transactions prevent cleanup, which is another reason to keep them short.

```sql
SELECT relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC LIMIT 5;
```

Vacuum also freezes old transaction IDs. If that is blocked for too long, the database can stop accepting writes to avoid wraparound, a failure that has hit well-known services.

## Quick triage order

1. CPU, memory, disk latency and disk space on the server
2. Connection count and waiting sessions
3. Top queries by total time
4. Locks and long transactions
5. Replication lag and vacuum progress

```predict
Q: Latency rises and max_connections is nearly reached, but CPU is low. Most sessions are idle. What is the likely fix?
???
Too many connections held by application instances. Add a pooler such as PgBouncer or reduce the per-instance pool size, rather than raising max_connections.
> More connections means more memory and context switching, not more throughput.
```

```diagram
title: Slow database triage
node: host | Host resources | 0 | 1 | CPU, memory, disk latency, free space. | A full or slow disk makes every query slow.
node: conn | Connections | 1 | 0 | Count, state and waiting sessions. | Exhausted connections cause timeouts with low CPU.
node: query | Top queries | 1 | 2 | pg_stat_statements sorted by total time. | Fixing a rare slow query ignores the frequent cheap one.
node: maint | Locks and vacuum | 2 | 1 | Long transactions, blocked sessions, dead rows. | Bloat grows quietly until it hurts.
node: act | Change one thing | 3 | 1 | Add an index, pool, tune or rewrite, then measure. | Several changes at once hide what worked.
edge: host | conn
edge: host | query
edge: conn | maint
edge: query | maint
edge: maint | act
```

## Incident: the connection storm

> **Incident:** After a deploy, forty new application instances each opened a pool of fifty connections. The database ran out of memory and every service using it slowed down.

```console
$ psql -c "SELECT count(*) FROM pg_stat_activity"
 count
-------
  1987
```

The team reduced each pool to five connections, placed PgBouncer in front and added an alert on connection use. They also made the deploy tool compute pool sizes from a shared connection budget.

## Common mistakes

- Raising max_connections instead of pooling
- Setting work_mem huge for all sessions
- Looking only at the slowest single query
- Ignoring autovacuum warnings

```quiz
Q: Why sort pg_stat_statements by total time first?
- It is alphabetical :: It is not about names.
+ Frequent cheap queries can cost more overall than one slow query
- It shows errors :: It shows timings.
- It resets statistics :: It does not.
> Total time shows where the server actually spends its effort.

Q: What does a connection pooler do?
- Encrypts traffic :: It is a different feature.
+ Shares a small number of database connections among many clients
- Creates backups :: Unrelated.
- Adds replicas :: Unrelated.
> Fewer real connections means less memory and contention.

Q: Why can a large work_mem be dangerous?
- It slows disks :: It is memory.
+ It applies per operation per session, so many sessions can exhaust RAM
- It disables caching :: It does not.
- It breaks replication :: It does not.
> Multiply it by concurrent sorts and sessions.

Q: What does bloat mean?
- Too many indexes :: That is over-indexing.
+ Tables and indexes holding dead row versions because vacuum has not kept up
- Large backups :: Unrelated.
- High CPU :: May be a side effect, not the definition.
> Vacuum frees dead rows. Long transactions block it.
```

```cards
pg_stat_statements :: Extension that records time and calls per query
PgBouncer :: A connection pooler for PostgreSQL
shared_buffers :: The database's own memory cache
Autovacuum :: Background cleanup of dead row versions
Bloat :: Wasted space from uncollected dead rows
```
