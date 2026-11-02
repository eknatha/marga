---
title: Caching without stampedes
minutes: 14
summary: Where caches help, how invalidation and TTLs go wrong, and how to stop a cold cache from crushing the database behind it.
---

A cache trades freshness for speed and load. It is the cheapest way to make a read-heavy system fast, and the commonest way to make a recovery fail: when a cache goes cold, every request lands on the store it was protecting. Design the cache and the cold-cache case together.

## What you will learn

- Choose a caching pattern: cache-aside, read-through, write-through, write-back
- Set TTLs and invalidate without serving wrong data for long
- Recognise and prevent stampedes, hot keys and cold starts
- Decide when not to cache

## Patterns

**Cache-aside:** the app reads the cache; on a miss it reads the database and fills the cache. Simple and common. **Read-through:** the cache itself loads on a miss. **Write-through:** writes go to cache and store together; reads are fresh, writes are slower. **Write-back:** writes go to the cache and flush later; fast, but data can be lost if the cache dies before flushing. Use write-back only when losing recent writes is acceptable.

## TTL and invalidation

A TTL bounds how stale data can be. It is also a promise: "a user may see data up to this old". Pick it from the business rule, not from habit. Explicit invalidation (delete the key when the source changes) is fresher but fails in subtle ways: a delete that is lost leaves stale data until the TTL, so keep a TTL as a safety net even with invalidation.

A classic race: reader A misses and reads old data from the database; writer updates the database and deletes the key; reader A then fills the cache with the old data. The cache is now stale until the TTL. Short TTLs on mutable data, or versioned keys, limit this.

## The stampede

A popular key expires. Within milliseconds, thousands of requests miss together and all query the database for the same row. The database slows, so the refill takes longer, so more requests pile in. Defences:

- **Request coalescing:** one request refills, the others wait for it.
- **Jittered TTLs:** add random spread so keys do not expire together.
- **Serve stale while refreshing:** return the old value and refresh in the background.
- **Early refresh:** refresh a little before expiry for hot keys.

## The cold start

After a deploy, a cache restart or a failover, the cache is empty. If the database can only handle 10 percent of full traffic, a cold cache at full traffic is an outage. Plan for it: warm the cache before shifting traffic, ramp traffic slowly, and size the database for the miss rate you can reach, not only the steady state.

## Hot keys and negative caching

One key getting a large share of traffic overloads the single cache node that holds it. Replicate hot keys or keep a short local in-process cache in front. Also cache "not found" answers briefly, or a missing item will hit the database every time.

## When not to cache

Skip a cache when data must be exactly current (account balances shown for payment), when the hit rate would be low, or when the store is fast enough. A cache you cannot explain is another failure point.

```predict
Q: A cache with a 60 second TTL on 10,000 popular keys is filled all at once at startup. What happens at the 60 second mark?
???
All keys expire together, a burst of misses reaches the database at the same moment. Jitter the TTLs and coalesce refills.
> Synchronised expiry is the stampede recipe.
```

## How it fails

Silently. Stale data appears wrong only to the user who saw it. A stampede shows as a database spike right after a cache event. Alert on hit rate, miss rate and database load together; a hit rate that drops while database load rises is the signal.

## Incident: Recovery that needed a warm cache

> **Incident:** After a restart the cache was empty and the database fell over under the full read load.

```console
$ redis-cli info stats | grep keyspace
keyspace_hits:0
keyspace_misses:482113
$ psql -c "select count(*) from pg_stat_activity where state='active'"
 count
-------
   398
```

This output is a simulated illustration of a common pattern, not one named outage. The database was sized for a 95 percent hit rate, so after the cache went empty it saw twenty times its normal read load. The team added request coalescing, warmed the cache from a replica before cutover, and ramped traffic in steps.

## Interview question

"Your product page is cached for five minutes and a price change must show within seconds. What do you do?" Invalidate on write, keep the TTL as a backstop, and consider versioned keys so a late fill cannot overwrite a newer value.

## Common mistakes

- No jitter on TTLs
- A database sized only for the warm-cache case
- Using write-back for data you cannot lose
- No cache hit-rate alert

```quiz
Q: What is a cache stampede?
+ Many requests miss at once and all hit the store for the same data
- A cache that grows too large :: That is eviction pressure.
- A network loop :: Not a cache event.
- Expired TLS certificates :: Unrelated.
> Coalescing, jitter and serve-stale prevent it.

Q: Which defence spreads out expiry?
+ Adding random jitter to TTLs
- Making every TTL identical :: That synchronises expiry.
- Removing the TTL :: Stale data would live forever.
- Doubling the database :: Costly and does not remove the burst.
> Correct: Adding random jitter to TTLs. Re-read the matching lesson section for the full reasoning.

Q: Why keep a TTL even when you invalidate on write?
+ A lost or raced delete would otherwise leave stale data forever
- TTLs are faster than deletes :: Not the reason.
- Caches require a TTL to start :: Not true.
- To save memory :: A side effect only.
> Correct: A lost or raced delete would otherwise leave stale data forever. Re-read the matching lesson section for the full reasoning.

Q: What is the risk of write-back caching?
+ Recent writes are lost if the cache fails before flushing
- Reads become slower :: Reads are fast.
- Writes cannot be batched :: They can.
- It needs two databases :: No.
> Correct: Recent writes are lost if the cache fails before flushing. Re-read the matching lesson section for the full reasoning.
```

```cards
cache-aside :: app reads cache, fills on a miss
write-through :: write to cache and store together
write-back :: flush later, risk of loss
stampede :: simultaneous misses on one key
jitter :: random spread on TTLs
negative cache :: briefly cache not-found
```
