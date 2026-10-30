---
title: Worked design: a URL shortener
minutes: 16
summary: The classic read-heavy design, taken from estimates to key generation, caching, hot links, abuse and failure modes.
---

A URL shortener looks trivial and is a good test of method: it is read-heavy, needs unique short keys without collisions, has a few extremely hot links, and attracts abuse. The goal here is not the shortest answer; it is a design you can defend with numbers and failure modes.

## What you will learn

- Run the six steps on a read-heavy service
- Compare key generation strategies and their failure modes
- Design the cache, the store and the redirect path for hot links
- Add abuse controls and an availability story

## 1. Clarify

Create a short link for a long URL; redirect on request. Optional custom aliases, expiry and click counts. Redirects must be fast (under 100 ms at the edge) and highly available, because every shared link depends on them. Creation can be slower and can fail briefly. Links must not collide, and a redirect must never go to the wrong target. SLO: 99.95 percent of redirects succeed within 300 ms.

## 2. Estimate

Assume 100 million new links a month and 100 reads per write. Writes: 100 million divided by about 2.6 million seconds in a month is about 40 per second. Reads: 4,000 per second on average, about 12,000 at a 3x peak. Storage: 100 million links a month at roughly 500 bytes each is 50 GB a month, 600 GB a year, a few TB over five years with replication. The write path is small; the read path and its availability are the design.

A 7 character key in base 62 gives 62 to the power 7, about 3.5 trillion keys, far more than the roughly 6 billion links in five years. Six characters (56 billion) would also do.

## 3. Sketch

Clients, a CDN or edge cache, redirect service (stateless), a cache, a key-value store partitioned by short key, and a separate create service with a key generator. Redirects return HTTP 301 or 302: 301 is cached by browsers (fewer requests, harder to change or count), 302 is not cached (more requests, easier to control). Pick on purpose: 302 if you count clicks or allow edits.

## 4. Deep-dive

**Key generation.** Options: hash the URL and truncate (collisions possible, same URL gives same key, needs collision handling); a counter encoded in base 62 (no collisions, predictable keys, needs a safe distributed counter); pre-generated random keys handed out in blocks from a key service (no collisions, no coordination on the hot path). A common safe choice is each create server leasing a block of ids from a central allocator, then encoding with a keyed permutation so keys are not guessable. If the allocator is down, servers continue until their block runs out; make blocks large enough to outlast an outage.

**Store.** Lookup by short key only, so a partitioned key-value store with hashed keys fits, with three replicas. Reads dominate and are single-key. Writes are idempotent with a client token so a retry does not create a second link.

**Cache.** Most traffic goes to a small set of links. A cache in front of the store, plus the CDN for very hot links, takes most reads. Use jittered TTLs, request coalescing and negative caching for missing keys, so a scanner guessing keys does not hit the store. Plan for a viral link: a single key may carry a large share of traffic, so replicate hot keys across cache nodes or serve them at the edge.

**Counts.** Counting clicks on the redirect path would slow it. Emit an event to a queue and aggregate asynchronously, accepting that counts lag by seconds.

**Abuse.** Short links hide destinations, which attackers use. Scan targets against block lists at creation and periodically afterwards, rate limit creation per account and address, offer a preview page for suspicious links, and provide takedown that works through every cache layer.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Cache node lost | misses rise | replicas, coalescing, store sized for cold cache |
| Store partition down | some keys fail | replicas in other zones, retries with budget |
| Allocator down | creation stops after block | large blocks, fallback allocator, alert on remaining ids |
| Viral link | one key hot | edge cache, key replication, per-key shedding |
| Regional outage | redirects fail | multi-region read replicas, DNS failover, static fallback for hottest links |
| Bad deploy | wrong redirects | staged rollout, per-version error and redirect checks |
| Abuse wave | cost and reputation | creation limits, scanning, takedown path |

## 6. Trade-offs

Random keys avoid guessing but lose sortability. 302 costs more traffic but keeps control. Asynchronous counts are cheap but slightly stale. Multi-region replicas cost money and need a plan for writes (one home region for creates, reads everywhere). Say what you chose and what you would revisit at 10x scale.

```predict
Q: A link goes viral and one short key receives 40 percent of all redirects. What breaks first, and what helps?
???
The single cache or store partition that holds that key becomes a hot spot. Serve it from the CDN or replicate the key across cache nodes, and shed or rate limit per key if needed.
> Hashing spreads keys, not the traffic to one key.
```

## How it fails

Collisions that send users to the wrong target. A counter that two servers share without coordination. A hot key that overloads one node. A takedown that does not purge the CDN. A cache that was sized for the warm case.

## Incident: Traffic fifty times the plan

> **Incident:** A launch brought far more traffic than anyone had planned for, and the backend scaled only because it could add machines quickly.

```console
$ kubectl get hpa redirect
NAME       REFERENCE             TARGETS    MINPODS   MAXPODS   REPLICAS
redirect   Deployment/redirect   95%/60%    10        10        10
```

The console output is a simulated illustration of autoscaling pinned at its maximum. The real related case is the Pokemon GO launch in 2016, where traffic reached 50 times the initial target and ten times the worst case estimate; see the case file. For the shortener, the lesson is to set maximums from the worst case, keep the CDN absorbing hot links, and test scale-up.

## Interview question

"Design a URL shortener for 100 million links a month." Use the numbers above, choose block-leased random keys, a partitioned key-value store, a cache and CDN, asynchronous counts, abuse controls and multi-region reads, then walk the failure table.

## Common mistakes

- Spending the interview on key encoding and none on availability
- A single counter that is a single point of failure
- 301 without understanding browser caching
- No story for a viral key

```quiz
Q: With 100 reads per write and 100 million links a month, which path dominates?
+ Reads, about 4,000 per second on average
- Writes, about 40,000 per second :: Writes are about 40 per second.
- Neither matters :: Reads drive the design.
- Storage only :: Storage is small.
> Correct: Reads, about 4,000 per second on average. Re-read the matching lesson section for the full reasoning.

Q: Why use 302 instead of 301 when counting clicks?
+ Browsers do not cache 302, so each click reaches you
- 302 is faster :: Not the reason.
- 301 cannot redirect :: It can.
- 302 is encrypted :: No.
> Correct: Browsers do not cache 302, so each click reaches you. Re-read the matching lesson section for the full reasoning.

Q: How can create servers avoid a single point of failure for ids?
+ Lease large blocks of ids so they keep working during an allocator outage
- Ask the allocator for every id :: Makes it a hot dependency.
- Use the same id on all servers :: Collisions.
- Stop creating links :: Not a design.
> Correct: Lease large blocks of ids so they keep working during an allocator outage. Re-read the matching lesson section for the full reasoning.

Q: What helps a single hot key?
+ Edge cache or replicating the key, plus per-key limits
- More database partitions :: One key stays on one partition.
- A longer TTL only :: Does not remove the hot node.
- A bigger key :: Irrelevant.
> Correct: Edge cache or replicating the key, plus per-key limits. Re-read the matching lesson section for the full reasoning.
```

```cards
301 :: permanent redirect, cacheable by browsers
302 :: temporary redirect, not cached
block lease :: allocating a range of ids to a server
negative cache :: remember that a key does not exist
hot key :: key with a large share of traffic
takedown :: removing a link through every cache layer
```
