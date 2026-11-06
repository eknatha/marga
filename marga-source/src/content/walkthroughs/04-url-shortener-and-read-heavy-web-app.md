# A read-heavy web app with cache and replicas
level: Beginner
modules: networking, databases, docker
lessons: databases/nosql-caches-and-choosing, databases/performance-and-connection-pooling, networking/latency-mtu-and-network-performance
summary: A short-link service that shows the classic pattern of load balancer, stateless app, cache, primary database and read replicas.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Create a short link for a long address
- Redirect visitors in a few milliseconds
- Handle one hundred reads for every write
- Keep links working for years

## The big picture

```diagram
title: Read-heavy web app reference design
node: user | Visitor | 0 | 1 | Opens a short link in a browser. | Slow redirects make people leave.
node: dns | DNS and CDN | 1 | 0 | Resolves the name and may answer popular redirects at the edge. | A wrong DNS record sends everyone nowhere.
node: lb | Load balancer | 1 | 1 | Spreads requests over healthy app instances. | A single load balancer is a single point of failure unless it is managed or paired.
node: app | Stateless app instances | 2 | 1 | Look up the code and answer with an HTTP redirect. | State kept in memory is lost when an instance is replaced.
node: cache | Cache | 3 | 0 | Holds code to address pairs in memory. | A cold cache sends all traffic to the database.
node: primary | Primary database | 3 | 1 | Accepts new links. | The only writer, so it must be protected and backed up.
node: replica | Read replicas | 4 | 2 | Serve lookups that miss the cache. | Lag can make a brand new link return not found.
edge: user | dns
edge: user | lb
edge: lb | app
edge: app | cache
edge: app | primary
edge: app | replica
edge: primary | replica
```

## A redirect, step by step

1. The browser resolves the name and connects to the load balancer over HTTPS.
2. The balancer picks a healthy app instance.
3. The app looks the short code up in the cache. A hit returns the target immediately.
4. On a miss it queries a read replica, stores the answer in the cache with an expiry and returns the redirect.
5. For a new link, the app writes to the primary. It also puts the result in the cache so the creator can use the link at once.

## Why the design looks like this

- **Stateless instances** can be added, removed and replaced freely, which is what makes autoscaling and rolling deploys safe.
- A **cache** absorbs the majority of reads. The database sees only the misses.
- **Read replicas** add read capacity, while one primary keeps writes simple and consistent.
- Short codes are **keys with unique constraints** in the database. Collisions are rejected by the database, not just the app.

## Scaling decisions

1. Start with one app instance and one database. Measure.
2. Add a second instance and a load balancer for availability.
3. Add a cache when database reads dominate.
4. Add replicas when cache misses still overload the database.
5. Only then consider partitioning the data by key.

Connection pooling keeps many instances from opening too many database connections.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Cache restart | Database receives the full load | Warm gradually, rate-limit rebuilds |
| Replica lag | A new link returns not found | Read from the primary or cache for new links |
| Primary fails | No new links | Tested failover, backups with point-in-time recovery |
| One viral link | One cache key gets all traffic | Edge caching and local in-process caches |
| Abuse and spam | Malicious targets | Rate limits, scanning, reporting |
| Code reuse after deletion | Old links point to new content | Never reuse codes quickly |

## Trade-offs

- A longer cache lifetime lowers cost but delays link edits and takedowns.
- Permanent redirects (301) are cached by browsers and reduce load, but you lose control. Temporary redirects (302) keep control and cost more requests.
- Random short codes spread load well. Sequential codes are guessable.

```predict
Q: You create a link and immediately open it, but it returns not found for a second or two. What is a likely cause?
???
The lookup went to a read replica that had not yet applied the new row (replication lag). Writing the new link into the cache, or reading from the primary right after a write, avoids it.
> Read-your-own-writes needs care when reads and writes use different servers.
```
