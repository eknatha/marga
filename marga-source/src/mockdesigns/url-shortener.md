# Model answer: a URL shortener
prompt: url-shortener
summary: A read-heavy service that maps short codes to long URLs, with a unique code generator and a cache.

## The answer in one minute

Writes are rare and reads are huge, so keep the code to URL mapping in a replicated key-value store, put a cache and a CDN in front, and generate codes with a counter that is encoded in base 62. Redirect with a 301 or 302 and record clicks asynchronously.

## The design

```diagram
title: URL shortener design
node: cl | Client | 0 | 1 | Browser asking for a short link. | Bots can hammer one link.
node: cdn | CDN and edge cache | 1 | 1 | Answers popular codes without touching the origin. | Stale entries after a link is disabled.
node: api | Redirect and create API | 2 | 1 | Looks up the code and returns a redirect, or creates a new code. | A slow lookup delays every click.
node: cache | Cache (Redis) | 3 | 0 | Holds hot code to URL pairs. | A cold cache sends a burst to the database.
node: db | Key-value store | 3 | 2 | Durable mapping with replicas. | Losing it loses every link.
node: gen | Code generator | 2 | 2 | Hands out unique numbers in ranges to each server. | A single counter becomes a bottleneck.
node: q | Click queue and analytics | 4 | 1 | Counts clicks off the request path. | Backlog delays reports but not redirects.
edge: cl | cdn
edge: cdn | api
edge: api | cache
edge: cache | db
edge: api | gen
edge: api | q
```

## Every component, explained

### Code generator

Each API server takes a block of numbers, for example one million, from a coordinator, and turns each number into a base 62 string. No two servers ever hand out the same number.

Example: The counter value 125 becomes the code 21 in base 62, and seven characters give about 3.5 trillion codes.

### Key-value store

A table keyed by code that stores the long URL, owner, creation time and expiry. It is replicated across zones and read mostly.

Example: Looking up code 8fZ3kQ returns https://example.com/some/long/path in one read.

### Cache

A memory store with a least-recently-used rule keeps the hot few percent of codes. Most clicks never reach the database.

Example: A viral link gets 50000 clicks a second and every one is answered from cache.

### CDN

Redirect responses with a short time to live are cached at the edge near users. It cuts latency and origin load.

Example: A user in Singapore gets the redirect from a nearby edge in 20 ms instead of crossing an ocean.

### Click queue

The API puts a click event on a queue and returns the redirect at once. A worker updates counters later.

Example: A burst of a million clicks fills the queue for a minute, reports lag a little, and redirects stay fast.

## Numbers to say out loud

- 100 million new links a month is about 40 writes a second on average.
- If reads are 100 times writes, that is about 4000 reads a second, with peaks ten times higher.
- At 500 bytes per record, 5 years of links need about 3 TB.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Counter service down | No new links | Each server holds a block in memory, so it keeps creating for a while |
| Cache empty after restart | Database spike | Warm the cache and rate-limit misses |
| Abuse of links | Phishing links spread | Reputation checks and report handling |
| Hot key | One node overloaded | Edge caching and replicated cache |
| Expired links removed | Dead links returned | Soft delete and a clear 410 response |

## Follow-up questions to expect

- How would you support custom aliases?
- Would you use 301 or 302 and why?
- How do you delete a link everywhere quickly?
