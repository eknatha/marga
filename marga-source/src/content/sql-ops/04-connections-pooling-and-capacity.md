---
title: Connections, pooling and capacity
minutes: 14
summary: Understand why too many connections hurt, how a pooler such as PgBouncer helps, and how to size memory and limits.
---

A database does not slow down smoothly when it is overloaded. It runs fine, then it runs out of connections or memory, and fails quickly. The usual cause is that every application instance opens its own pool of connections.

## What you will learn

- Why PostgreSQL connections are expensive
- Connection pool maths for an application fleet
- PgBouncer and its pooling modes
- Memory settings: shared_buffers, work_mem and their traps

## Why connections cost

PostgreSQL starts a separate process for each client connection. Each one uses memory and a slot in shared structures, and having hundreds of active sessions makes the CPUs spend time switching between them. A server with 16 cores often performs best with a few dozen running queries, not several hundred.

```console
$ psql -c "SHOW max_connections;"
 max_connections
-----------------
 200
$ psql -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"
 state                | count
----------------------+-------
 active               |    14
 idle                 |   171
 idle in transaction  |     9
```

Most of the 194 sessions are idle. They are still using memory and taking slots. When the limit is reached, new clients get:

```console
FATAL:  sorry, too many clients already
```

## Pool maths

Each application process has its own pool. With 40 pods and a pool of 10 connections each, the application can open 400 connections, which is more than the database allows. Add a second deployment, a cron job and a reporting tool and the limit is crossed with no one noticing, until a deploy restarts all pods at once and every pod reconnects together.

Work out the total: **instances × pool size** across every client, and keep it below `max_connections` minus the reserved slots for administrators (`superuser_reserved_connections`, 3 by default).

## PgBouncer

A **pooler** sits between applications and the database. Applications connect to it by the thousands, and it keeps a small number of real connections.

- **Session pooling**: a server connection is assigned for the life of the client connection. Safe, but saves little if clients stay connected.
- **Transaction pooling**: a server connection is assigned only during a transaction. This is the most useful mode, and it limits what the application may use: session-level features such as `SET`, advisory locks, `LISTEN` and (in older versions) prepared statements may not behave as expected.
- **Statement pooling**: one statement at a time. Rarely usable, as it forbids multi-statement transactions.

```text
[databases]
shop = host=10.0.2.10 port=5432 dbname=shop

[pgbouncer]
pool_mode = transaction
max_client_conn = 2000
default_pool_size = 20
```

With these settings 2 000 clients can connect and at most 20 server connections per database and user pair are used.

## Memory settings

- **shared_buffers**: the shared cache. A common starting point is about a quarter of RAM on a dedicated server.
- **work_mem**: memory for **each** sort or hash step in **each** query. It is not per connection but per operation, so a complex query can use several times this value, and 200 connections doing so can add up to many gigabytes. Raising it globally is risky; raise it per role or per session for the reporting job.
- **maintenance_work_mem**: used by vacuum and index builds.
- **effective_cache_size**: tells the planner how much the OS is likely to cache. It allocates nothing.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Connections, pooling and capacity fits together
node: n1 | Why connections cost | 0 | 0 | PostgreSQL starts a separate process for each client connection. | Using transaction pooling with an application that depends on session state. | process
node: n2 | Pool maths | 1 | 1 | Each application process has its own pool. | Not leaving reserved connections for administrators. | process
node: n3 | PgBouncer | 2 | 0 | A pooler sits between applications and the database. | Raising max_connections instead of fixing the pool sizes. | process
node: n4 | Memory settings | 3 | 1 | shared_buffers: the shared cache. A common starting point is about a quarter of RAM on a dedicated server. | Setting work_mem very high globally. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Everyone reconnected at once

> **Incident:** After a deploy the database stopped accepting connections for ten minutes.

```console
FATAL:  sorry, too many clients already
$ psql -c "SELECT count(*) FROM pg_stat_activity;"
 count
-------
   200
$ psql -c "SELECT application_name, count(*) FROM pg_stat_activity GROUP BY 1 ORDER BY 2 DESC LIMIT 2;"
 shop-api     | 170
 shop-worker  |  26
```

The API had 17 pods with a pool of 10 connections each, and a rolling deploy started new pods before closing the old ones, so for a while there were twice as many. The pool fills with failed connection attempts, requests retry, and the load made recovery slower. The team added PgBouncer in transaction mode, set the pool per pod to 5, and limited the surge during deploys.

```wrongpath
@goal The database is out of connections, so raise max_connections to 5000.
@wrong
ALTER SYSTEM SET max_connections = 5000;
@result
(after restart)
$ free -m
Memory used 98%
latency up, OOM killer ran
@why Each connection is a process with its own memory, and many active connections cause contention. Raising the limit hides the problem until the server runs out of memory.
@right
# keep max_connections modest and add a pooler
pool_mode = transaction
default_pool_size = 20
max_client_conn = 2000
@after Use a pooler so a few server connections serve many clients, and find the leak or idle in transaction sessions.
```

## Common mistakes

- Raising max_connections instead of fixing the pool sizes
- Setting work_mem very high globally
- Using transaction pooling with an application that depends on session state
- Not leaving reserved connections for administrators

```quiz
Q: Why are many idle PostgreSQL connections a problem?
+ Each one uses a process, memory and a connection slot
- Idle connections use all the CPU :: They use little CPU.
- They corrupt data :: No.
- They block vacuum always :: Not by being idle.
> The limit can be reached while most sessions do nothing.

Q: 40 pods each with a pool of 10 connect to a database. How many connections can they open?
+ Up to 400
- 10 :: That is one pod.
- 40 :: That is the pod count.
- Exactly 1 :: No.
> Instances times pool size.

Q: Which PgBouncer mode gives the best reuse of server connections for most web applications?
+ Transaction pooling
- Session pooling :: It saves less.
- Statement pooling :: It forbids multi-statement transactions.
- No pooling :: That is the problem.
> A server connection is used only during a transaction.

Q: What is work_mem?
+ Memory for each sort or hash step in each query
- Total memory for the server :: No.
- Memory per database :: No.
- Disk space for logs :: No.
> It can multiply across steps and connections.
```

```cards
max_connections :: limit on client connections
Pooler :: program that shares few server connections
Transaction pooling :: server connection held only during a transaction
shared_buffers :: database page cache
work_mem :: memory per sort or hash step
FATAL too many clients :: connection limit reached
```
