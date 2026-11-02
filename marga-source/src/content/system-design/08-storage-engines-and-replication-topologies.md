---
title: Storage engines and replication topologies
minutes: 14
summary: How B-trees and LSM trees differ, what leader-follower, multi-leader and leaderless replication trade, and how data stores fail from the inside.
---

You do not need to write a database, but you must know what is underneath one, because capacity limits, latency spikes and recovery times come from it. This lesson covers the two main storage engine families and the three ways to replicate, with an eye on how each fails.

## What you will learn

- Compare B-tree and LSM tree storage engines
- Explain write-ahead logs, compaction and vacuum, and why they matter in operations
- Choose a replication topology and know its conflict risk
- Spot internal limits such as transaction ids and metadata growth

## Two storage engine families

**B-tree** engines (many relational databases) keep sorted pages on disk and update them in place. Reads are predictable and a point lookup touches a few pages. Writes modify pages, so each write costs random I/O, and a write-ahead log (WAL) records changes first so a crash can be recovered.

**LSM tree** engines (many key-value and wide-column stores) append writes to a memory table and a log, flush sorted files, and merge them in the background (**compaction**). Writes are fast and sequential. Reads may check several files, helped by Bloom filters, and compaction competes with foreground traffic for disk. A burst of writes can build a compaction backlog and push read latency up.

Rule of thumb: LSM favours write-heavy workloads and has to be watched for compaction debt; B-tree favours read-heavy, update-in-place workloads and has to be watched for index bloat and vacuum.

## Background work is part of the design

Both families clean up behind the scenes: vacuum and autovacuum, compaction, checkpointing, log truncation, metadata cleanup. When they fall behind, nothing fails at first, then something fails abruptly. Monitor their lag directly. In PostgreSQL, a table whose old row versions are not vacuumed can eventually exhaust transaction ids and the database stops accepting writes to protect itself. Sentry's database did this in 2015 and a Mandrill shard in 2019, with outages of most of a working day and about 40.5 hours respectively. See the case files.

## Replication topologies

- **Leader and followers:** one node takes writes and ships a log to followers. Simple and consistent. Failover needs a promotion and fencing, and asynchronous followers can lose recent writes.
- **Multi-leader:** several nodes accept writes, often one per region, and replicate to each other. Good for write latency and regional independence. The price is **conflicts**: two leaders change the same row. You need a rule (last write wins, merge, or application logic) and you must accept that some writes are altered or lost.
- **Leaderless (quorum):** any replica accepts writes; a write succeeds when W of N replicas acknowledge, a read asks R, and R + W > N gives overlap. High availability, tunable consistency, and repair work (read repair, anti-entropy) to converge.

## Synchronous and asynchronous

Synchronous replication waits for a follower before acknowledging: no loss on failover, but latency, and a dead follower can block writes. Asynchronous acknowledges at once: fast, but the last writes can be lost. A common middle path is one synchronous follower plus asynchronous ones.

## Metadata and hidden growth

Systems also keep metadata: segment lists, tiered storage indexes, file catalogues. If cleanup is not enabled, it grows quietly. In May 2024 Honeycomb found one Kafka broker reading far more from disk than its peers because tiered storage metadata had grown for years without cleanup; enabling the cleaner cut metadata by over 99 percent and broker start-up fell from over 20 minutes to under one minute. Track metadata size and start-up time as signals.

## Choosing

Ask about the access pattern (point lookups, scans, writes per second), the consistency each feature needs, the growth, and the operations your team can actually run. A familiar relational database with replicas and partitions solves more problems than a surprising number of teams expect.

```predict
Q: A write-heavy store on an LSM engine shows rising read latency and disk busy at 100 percent, with traffic unchanged. What is the likely cause?
???
Compaction has fallen behind, so reads check many files and compaction competes for disk. Throttle writes, add I/O capacity or tune compaction, and alert on pending compactions.
> Background debt shows up as foreground latency.
```

## How it fails

Vacuum or compaction lag. WAL or log segments filling a disk. A follower that falls so far behind it cannot catch up. Multi-leader conflicts resolved silently by last write wins. Metadata that grows until start-up takes an hour.

## Incident: A database that refused writes to protect itself

> **Incident:** A database stopped accepting writes because it was nearing a hard internal limit after cleanup had not kept up.

```console
ERROR:  database is not accepting commands to avoid wraparound data loss in database "app"
HINT:  Stop the postmaster and vacuum that database in single-user mode.
```

This is a simulated rendering of the pattern, not a quotation. The real incidents are Sentry on 20 July 2015 and Mandrill on 4 February 2019; the case files give sources and timelines. The design response is to monitor the distance to the limit, keep cleanup tuned and tested, and keep the ability to take a table out of service quickly.

## Interview question

"Why might a write-heavy workload prefer an LSM engine, and what do you watch?" Sequential writes and fast ingestion; watch compaction backlog, read amplification, space amplification and disk I/O.

## Common mistakes

- Treating background cleanup as optional
- Multi-leader replication with no conflict plan
- One synchronous replica that blocks all writes when it dies
- No alert on replica lag or metadata growth

```quiz
Q: What is compaction in an LSM engine?
+ Merging sorted files in the background to limit read cost
- Compressing the network traffic :: Not what it is.
- Deleting old replicas :: Not what it is.
- Encrypting data :: Not what it is.
> Correct: Merging sorted files in the background to limit read cost. Re-read the matching lesson section for the full reasoning.

Q: What is the main risk of multi-leader replication?
+ Write conflicts on the same data
- No writes are possible :: Writes are accepted.
- Reads are always stale :: Not the main risk.
- A single point of failure :: The opposite.
> Correct: Write conflicts on the same data. Re-read the matching lesson section for the full reasoning.

Q: In a leaderless quorum system, which condition ensures reads overlap writes?
+ R plus W greater than N
- R plus W equal to zero :: No overlap.
- W equal to 1 only :: Does not guarantee overlap.
- N equal to 1 :: No replication.
> Correct: R plus W greater than N. Re-read the matching lesson section for the full reasoning.

Q: What did Honeycomb find in 2024 with one Kafka broker?
+ Tiered storage metadata had grown for years without cleanup
- A network partition :: Not this case.
- An expired certificate :: Not this case.
- A DNS race :: Not this case.
> Correct: Tiered storage metadata had grown for years without cleanup. Re-read the matching lesson section for the full reasoning.
```

```cards
WAL :: write-ahead log recorded before a change
LSM tree :: append, flush, merge storage engine
compaction :: background merge of sorted files
vacuum :: cleanup of old row versions
multi-leader :: several nodes accept writes, conflicts possible
quorum :: R plus W greater than N for overlap
```
