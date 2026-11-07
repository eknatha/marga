---
title: Worked design: a distributed key-value store
minutes: 19
summary: Partitioning, replication, quorum reads and writes, and failure handling, put together into one store.
---

A key-value store is the building block under many systems. Designing one forces you to combine ideas from earlier lessons: consistent hashing, replication, quorums and failure detection. The point is to be explicit about the guarantees you give and what each one costs in latency and availability.

## What you will learn

- Combine partitioning and replication in one design
- Choose quorum sizes for reads and writes
- Handle node failure with hinted handoff and repair
- State the consistency you provide and why

## 1. Clarify

Operations are get, put and delete by key, with values up to a few kilobytes. Latency target is a few milliseconds at the 99th percentile. The store must keep working when a node or an availability zone fails, and it can choose between strict and eventual consistency per request. Range scans are out of scope.

## 2. Estimate

Assume 10 TB of data, 200,000 operations a second at peak and 80 percent reads. With three replicas the raw storage is 30 TB. At 2 TB per node that is 15 nodes, and 25 to 30 with headroom for growth and rebalancing. Each node handles about 20,000 operations a second including replica traffic, well within a single machine.

## 3. Partitioning

Hash each key onto a ring and give each node many virtual positions. A key belongs to the first node clockwise and to the next two distinct nodes as replicas, placed in different zones. Adding a node moves only a small slice of keys. Virtual positions even out the load and let a stronger machine take more of the ring.

## 4. Replication and quorums

With N replicas, a write waits for W acknowledgements and a read asks R replicas. If R + W is greater than N, a read overlaps the latest write. For N = 3, W = 2 and R = 2 gives strong reads of recent writes. W = 1 and R = 1 is fast and may return stale data. Make this a per-request setting.

## 5. Failure handling

When a replica is down, a coordinator stores hints for it and replays them when it returns. A background anti-entropy process compares replicas using hash trees and repairs differences. Concurrent writes to one key need a rule: last write wins by timestamp is simple but can lose data, while version vectors keep both versions for the application to merge.

## 6. Failure modes

| Failure | Effect | Answer |
| --- | --- | --- |
| Node down | fewer replicas | hinted handoff, quorum still met |
| Zone down | one replica lost per key | replicas spread across zones |
| Network partition | two sides diverge | quorum blocks the minority for strict requests |
| Slow node | tail latency | hedged reads, drop slow replica from the quorum |
| Hot key | one node overloaded | cache, split the key, shed load |
| Clock skew | wrong last write wins | logical clocks or version vectors |

## 7. Trade-offs

Larger quorums give stronger reads and slower, less available operations. Last write wins is simple and can lose a write. Version vectors preserve conflicts but burden the application. State what you offer, such as read-your-writes within a session, and what you do not, such as global transactions.

## A table definition with quorum settings

```yaml
store: sessions
replicas: 3
placement: spread_across_zones
consistency:
  default_write: quorum   # W = 2
  default_read: quorum    # R = 2
  fast_read: one          # R = 1, may be stale
conflict_resolution: version_vector
repair:
  hinted_handoff_window: 3h
  anti_entropy_interval: 6h
```

With three replicas and quorum reads and writes, a read always overlaps the latest successful write. The fast read option trades freshness for speed on request.

## How it fails

A quorum cannot be met during a partition. Hints are lost when a node is down longer than the window. Last write wins hides a lost update. A hot key overloads its replicas. Rebalancing after adding nodes saturates the network.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Worked design: a distributed key-value store fits together
node: n1 | Clarify | 0 | 0 | Operations are get, put and delete by key, with values up to a few kilobytes. | Placing all replicas in one zone. | process
node: n2 | Estimate | 1 | 1 | Assume 10 TB of data, 200,000 operations a second at peak and 80 percent reads. | Choosing quorum sizes without thinking about R + W > N. | process
node: n3 | Replication and quorums | 2 | 0 | With N replicas, a write waits for W acknowledgements and a read asks R replicas. | Relying on wall clocks to decide the latest write. | process
node: n4 | Failure handling | 3 | 1 | When a replica is down, a coordinator stores hints for it and replays them when it returns. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | Trade-offs | 4 | 0 | Larger quorums give stronger reads and slower, less available operations. | State what you offer, such as read-your-writes within a session, and what you do not, such as global transactions. | process
node: n6 | A table definition with quorum | 5 | 1 | With three replicas and quorum reads and writes, a read always overlaps the latest successful write. | Rebalancing at full speed in production. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: Adding nodes during a busy hour

> **Incident:** A team added several nodes to the cluster at peak traffic. The data movement used so much network bandwidth that normal reads and writes slowed down, and some requests missed their quorum timeouts.

```console
$ kvctl rebalance status
moving: 41 partitions   rate: 1.9 Gbit/s   (limit: none)
$ kvctl latency --p99
reads 38 ms (normal 4 ms)   writes 55 ms (normal 6 ms)
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Rate-limiting rebalancing, moving a few partitions at a time and scheduling it outside peak hours keep growth from harming live traffic.

## Interview question

"Design a distributed key-value store." Use consistent hashing with virtual nodes, N=3 replicas across zones, quorum reads and writes with R + W > N, hinted handoff and anti-entropy, a conflict rule, and discuss failures and trade-offs.

## Common mistakes

- Choosing quorum sizes without thinking about R + W > N
- Placing all replicas in one zone
- Rebalancing at full speed in production
- Relying on wall clocks to decide the latest write

```quiz
Q: When does a read overlap the latest write?
+ When R + W is greater than N
- When R is 1 :: Not guaranteed.
- When N is 1 :: Trivial case.
- Always, without conditions :: Not true.
> Correct: When R + W is greater than N. Re-read the matching lesson section for the full reasoning.

Q: Why spread replicas across zones?
+ A zone failure should lose at most one replica of each key
- To save money :: Not the reason.
- To avoid hashing :: Hashing still used.
- To stop repairs :: Repairs still needed.
> Correct: A zone failure should lose at most one replica of each key. Re-read the matching lesson section for the full reasoning.

Q: What does hinted handoff do?
+ Holds writes for a down replica and replays them when it returns
- Deletes old data :: Not its job.
- Encrypts data :: Not its job.
- Elects a leader :: Different mechanism.
> Correct: Holds writes for a down replica and replays them when it returns. Re-read the matching lesson section for the full reasoning.

Q: Why avoid relying on clocks for last write wins?
+ Clock skew can pick the wrong write and lose data
- Clocks are always exact :: They drift.
- Clocks are too slow :: Not the issue.
- Timestamps are illegal :: Not the issue.
> Correct: Clock skew can pick the wrong write and lose data. Re-read the matching lesson section for the full reasoning.
```

```cards
quorum :: the number of replicas that must agree
virtual node :: one of many ring positions owned by a physical node
hinted handoff :: a stored write for a temporarily down replica
anti-entropy :: background comparison and repair of replicas
```
