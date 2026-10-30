---
title: Partitioning, sharding and consistent hashing
minutes: 15
summary: Split data across nodes before one node runs out, choose a partition key, and avoid hot keys and painful reshuffles.
---

One node always has a ceiling: disk size, write throughput, memory, a file system limit. Partitioning splits data across nodes so each holds a share. It is the main way storage scales, and it is hard to change later, so the choices you make early (the key, the scheme, the number of partitions) matter more than the technology.

## What you will learn

- Choose between range, hash and directory partitioning
- Pick a partition key and spot hot keys and skew
- Explain consistent hashing and why it limits data movement
- Plan resharding and cross-partition queries

## Why partition

Reasons are size (data no longer fits), write rate (one primary cannot take the writes) and blast radius (a fault should reach only one partition). Replication copies the same data to more nodes for availability and read scale; it does not help writes or size. Partitioning divides data; replication copies it. Real systems do both: each partition has its own replicas.

## Schemes

- **Range:** keys A to F on node 1, G to M on node 2. Range scans are cheap, but sequential keys (timestamps, auto-increment ids) pile all new writes on the last range, a hot spot.
- **Hash:** hash the key and take it modulo N, or map it to a range of hash values. Spreads load evenly; range scans must visit every partition.
- **Directory (lookup):** a table says which partition owns each key or tenant. Flexible, and the directory becomes a critical dependency to cache and protect.

## Choosing the key

A good key has many distinct values, spreads reads and writes evenly, and keeps data that is used together on the same partition. A tenant id keeps one customer's data together, which suits a cell design, but one very large tenant becomes a hot partition. A user id spreads well. A country code does not (a few huge values). Ask: what is the biggest value of this key, and what fraction of traffic does it carry?

## Hot keys and skew

Even with a hash, one key can dominate: a celebrity account, a viral item, a default value used by millions. Remedies: add a random suffix to spread one key over several (and read all of them), cache the hot key in front, split the hot entity into smaller pieces, or give large tenants their own partitions. Monitor per-partition load, not only the average.

## Modulo is a trap, consistent hashing is the fix

With `hash(key) mod N`, changing N from 10 to 11 moves about 90 percent of keys to different nodes, a storm of data movement and cache misses. **Consistent hashing** places nodes and keys on a ring; a key belongs to the next node clockwise. Adding or removing one node moves only about 1/N of the keys. To even out load, each physical node takes many positions on the ring (virtual nodes). Many caches and distributed stores use it.

Another approach is a fixed, large number of logical partitions (for example 1,024) mapped to nodes. Moving a partition moves a whole unit, and the partition count never changes.

## Cross-partition work

Queries that span partitions (joins, global secondary indexes, uniqueness checks, transactions) are slow or hard. Design so the common case touches one partition. Use a local index per partition and scatter-gather for rare global queries, accept eventual consistency for global indexes, and use sagas or outbox patterns rather than distributed transactions where you can.

## Resharding

Plan it before you need it: choose a scheme that splits without downtime (split a partition in two while it serves traffic), copy data in the background, switch with a version of the directory, verify, then delete. Waiting until the node is full leaves no room to copy.

```predict
Q: A table is partitioned by creation timestamp ranges, one range per day. Writes are all for today. What happens, and what would you change?
???
Today's partition takes every write while older ones sit idle, a hot spot. Hash a high-cardinality key (such as user id) for writes, or add a hashed prefix, and keep time ranges for archival or scans only.
> Sequential keys concentrate load at one end.
```

## How it fails

A partition key chosen for convenience that skews. A modulo scheme that makes growth an outage. A directory that is a single point. A rebalance that saturates the network and slows production. A limit nobody watched until the single node hit it.

## Incident: A table that hit a size limit

> **Incident:** A single database table on one node grew until it reached a file size limit, and the service stopped.

```console
$ ls -lh /var/lib/mysql/shop/bookmarks.ibd
-rw-rw---- 1 mysql mysql 2.0T bookmarks.ibd
mysql> insert into bookmarks values (...);
ERROR 1114 (HY000): The table 'bookmarks' is full
```

The console lines are a simulated illustration. In the real Instapaper incident on 9 February 2017, a MySQL table on Amazon RDS reached a 2 TB file size limit; the service was down for about 31 hours and archive access was limited for about five days. The design lesson is to track the distance to every single-node limit, and to partition or archive while there is room to copy. See the case file.

## Interview question

"Design the storage for a service that will hold 50 TB of user events." Estimate rate and growth, choose a hashed user id as the key with a large fixed partition count, replicate each partition, handle hot users, and describe how you would add nodes without moving most of the data.

## Common mistakes

- Sequential partition keys
- `hash mod N` with no plan for growth
- Ignoring one huge tenant or key
- No alert on distance to a node limit

```quiz
Q: What does replication give you that partitioning does not?
+ Availability and read scale from copies of the same data
- More total data capacity :: Copies do not add capacity.
- Faster writes :: Writes still go to each copy.
- Smaller indexes :: Not its purpose.
> Correct: Availability and read scale from copies of the same data. Re-read the matching lesson section for the full reasoning.

Q: Why is hash mod N a problem when N changes?
+ Most keys move to different nodes
- It produces collisions :: Not the main issue.
- It cannot be computed quickly :: It is fast.
- It needs a directory :: No.
> Correct: Most keys move to different nodes. Re-read the matching lesson section for the full reasoning.

Q: What does consistent hashing limit?
+ The share of keys that move when a node is added or removed
- Network latency :: Not its job.
- Disk size :: Not its job.
- Replication lag :: Not its job.
> Correct: The share of keys that move when a node is added or removed. Re-read the matching lesson section for the full reasoning.

Q: Which key is most likely to create a hot partition?
+ An auto-increment id used with range partitioning
- A random user id with hash partitioning :: Spreads well.
- A hashed order id :: Spreads well.
- A uuid with hash partitioning :: Spreads well.
> Correct: An auto-increment id used with range partitioning. Re-read the matching lesson section for the full reasoning.
```

```cards
partition key :: field that decides which partition owns a row
hot key :: one key with a large share of traffic
consistent hashing :: ring that moves about 1/N keys on change
virtual node :: many ring positions per physical node
scatter-gather :: ask every partition and merge results
resharding :: moving data to a new partition layout
```
