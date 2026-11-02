---
title: NoSQL, caches and choosing the right data store
minutes: 15
summary: Compare relational, key-value, document, wide-column and search stores, understand caches such as Redis and their failure modes, and choose with trade-offs in mind.
---

Relational databases are the right default, but not the only tool. Operators meet caches, queues, document stores and managed key-value services, and each has distinct failure modes. Choosing well starts from the access pattern, not from fashion.

## What you will learn

- The main families of data stores
- The CAP trade-off and eventual consistency in plain terms
- Caching patterns and cache failure modes
- Operating Redis safely
- A checklist for choosing

## Families

| Family | Examples | Good at | Watch out for |
|--------|----------|---------|---------------|
| Relational | PostgreSQL, MySQL | Joins, constraints, transactions | Scaling writes beyond one node |
| Key-value | Redis, DynamoDB | Fast lookups by key, huge scale | Limited queries |
| Document | MongoDB | Flexible records, nested data | Consistency across documents |
| Wide-column | Cassandra | High write rates across regions | Query design must come first |
| Search | Elasticsearch, OpenSearch | Full text and filtering | Not a primary source of truth |
| Time series | Prometheus, TimescaleDB | Metrics over time | High cardinality cost |

## Consistency in plain terms

When data is spread over several machines, a network partition forces a choice: keep answering (**availability**) and risk stale answers, or refuse some requests to stay correct (**consistency**). This is the idea behind CAP. Many stores offer **eventual consistency**: replicas converge shortly after a write, but a read right away may be stale. Some let you pick per request, for instance strongly consistent reads at higher cost.

## Caching

A cache keeps copies of expensive results in fast memory. Common patterns:

- **Cache-aside**: the application checks the cache, on a miss reads the database and writes the result back with an expiry (TTL)
- **Write-through**: writes go to the cache and the database together
- **Invalidate on change**: delete or update the cached item when the source changes

Failure modes to plan for:

- **Cold cache**: after a restart every request misses and hits the database at once
- **Stampede**: a popular key expires and thousands of requests rebuild it together. Add jitter to TTLs and let only one request rebuild.
- **Stale data**: choose TTLs deliberately and invalidate on writes
- **Cache as the only copy**: if you cannot rebuild it, it is a database and needs backups and persistence

## Operating Redis safely

```bash
redis-cli INFO memory | grep -E "used_memory_human|maxmemory_human"
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|evicted_keys"
redis-cli --scan --pattern 'session:*' | head
redis-cli SLOWLOG GET 5
```

```text
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
```

- Set `maxmemory` and an eviction policy, or Redis will grow until the host runs out of memory
- Never run `KEYS *` on production, because it blocks the single-threaded server. Use `SCAN`.
- Persistence (`appendonly`, snapshots) is optional for a pure cache and important for queues or sessions
- Do not expose Redis to the internet. Use a private network, authentication and TLS.

## How to choose

Ask in order:

1. What are the main queries and how often? Start from reads and writes.
2. Do you need transactions and joins across entities? Pick relational.
3. How much data and what write rate in a year? Does one node suffice?
4. What consistency can users tolerate?
5. Who will operate it, and do you have backups, monitoring and skills for it?
6. Is a managed service available?

A boring relational database plus a cache covers a very large share of real systems. Adding another store adds a new thing to back up, secure, monitor and patch.

```predict
Q: A popular product page is cached for 60 seconds. At the moment it expires, 5,000 requests arrive. What can happen and how do you reduce it?
???
All 5,000 miss at once and hit the database to rebuild the same page, a cache stampede. Use a lock so one request rebuilds, serve slightly stale data while refreshing, and add random jitter to TTLs.
> A cache protects the database only while it is warm.
```

```diagram
title: Cache-aside read path
node: app | Application | 0 | 1 | Asks the cache first. | A cache outage must not take the app down.
node: cache | Cache | 1 | 0 | Returns a hit, or a miss on absent or expired keys. | Eviction and expiry cause sudden misses.
node: db | Database | 1 | 2 | Source of truth for a miss. | A mass miss can overload it.
node: fill | Store with TTL | 2 | 1 | The result is written back with an expiry. | A long TTL serves stale data.
edge: app | cache
edge: app | db
edge: db | fill
edge: fill | cache
```

## Incident: the restart that melted the database

> **Incident:** During maintenance a team restarted its Redis cache. Every request missed, the database received the full traffic it normally never saw, and it fell over within a minute.

```console
$ redis-cli INFO stats | grep keyspace
keyspace_hits:0
keyspace_misses:482113
```

They added gradual cache warming, rate-limited the rebuilds, replicas for the cache, and load tested the database with the cache turned off to learn its real limits.

## Common mistakes

- Choosing a store because it is popular
- Treating a cache as durable storage
- Running KEYS on production
- No memory limit or eviction policy

```quiz
Q: What is cache-aside?
- The cache writes to the database itself :: That is write-through or write-behind.
+ The application checks the cache, and on a miss loads from the database and fills the cache
- The database replicates to the cache :: Unrelated.
- The cache holds backups :: Unrelated.
> The application controls reads and fills.

Q: What is a cache stampede?
- A cache that is too large :: Unrelated.
+ Many requests rebuilding the same expired key at once
- A network partition :: Unrelated.
- An encrypted cache :: Unrelated.
> Locking, jittered TTLs or serving stale data reduce it.

Q: Why avoid KEYS * on production Redis?
- It deletes keys :: It only lists them.
+ It scans the whole keyspace in one blocking call that stalls other clients
- It costs money :: Unrelated.
- It needs a password :: Unrelated.
> Use SCAN, which iterates in small steps.

Q: What does eventual consistency mean?
- Data is lost eventually :: It is not loss.
+ Replicas converge after a short delay, so a read right after a write may be stale
- Reads are always correct :: That is strong consistency.
- Writes are rejected :: Unrelated.
> It trades immediate agreement for availability and speed.
```

```cards
Cache-aside :: App checks the cache first and fills it on a miss
TTL :: Time after which a cached item expires
Cache stampede :: Many requests rebuild an expired key at the same time
Eventual consistency :: Replicas converge shortly after a write
maxmemory-policy :: Redis rule for which keys to evict when full
```
