# Model answer: a replicated key-value store
prompt: kv-store
summary: Partition keys with consistent hashing, replicate each partition, and choose quorum settings to trade consistency for availability.

## The answer in one minute

Hash keys to partitions on a ring, store each partition on three nodes, write to a quorum, and repair differences in the background. Say clearly whether the system favours consistency or availability when the network splits.

## The design

```diagram
title: Replicated key-value store design
node: cl | Client | 0 | 1 | Reads and writes by key. | A client with an old ring map goes to the wrong node.
node: co | Coordinator node | 1 | 1 | Any node can coordinate a request. | Slow coordinators add latency.
node: ring | Hash ring and partitions | 2 | 0 | Maps keys to nodes. | Uneven ranges create hot nodes.
node: rep | Replica nodes | 3 | 1 | Three copies of each partition. | Losing two copies loses availability or data.
node: wal | Log and storage engine | 4 | 0 | Commit log plus sorted files (LSM). | Compaction spikes hurt latency.
node: rpr | Anti-entropy repair | 4 | 2 | Compares replicas and fixes drift. | Repair traffic competes with clients.
node: mem | Membership and gossip | 2 | 2 | Detects failed nodes. | False failures cause churn.
edge: cl | co
edge: co | ring
edge: ring | rep
edge: rep | wal
edge: rep | rpr
edge: mem | ring
```

## Every component, explained

### Consistent hashing

Keys and nodes are placed on a ring and each key belongs to the next nodes clockwise. Adding a node moves only a slice of keys.

Example: Adding a fourth node moves about a quarter of the data instead of reshuffling everything.

### Replication factor and quorum

With N=3 copies, writing to W=2 and reading from R=2 guarantees that reads see the latest write because W + R > N.

Example: A write is acknowledged after 2 of 3 replicas store it, and a read asks 2 and takes the newest.

### Conflict handling

If replicas accept different writes during a split, a rule picks the winner: last write wins by timestamp, or version vectors keep both for the app to merge.

Example: Two clients set the same key during a partition and the store keeps both versions until read repair.

### Storage engine

Writes go to a commit log and an in-memory table, then flush to sorted files that are merged by compaction. This makes writes fast.

Example: A write is on disk in the log in under a millisecond and in memory for reads.

### Failure detection and repair

Gossip spreads membership. Hinted handoff holds writes for a down node, and anti-entropy compares hashes of ranges to repair.

Example: Node C is down for 10 minutes; its writes are stored as hints and replayed when it returns.

## Numbers to say out loud

- 10 TB of data with replication 3 is 30 TB of disk, about 10 nodes of 3 TB.
- Per node 20000 operations a second gives 200000 a second for 10 nodes.
- Aim for 50 to 70 percent disk use for compaction and recovery.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Network partition | Divergent writes | Quorum rules and conflict resolution |
| Hot key | One node saturated | Cache, key splitting |
| Compaction storms | Latency spikes | Throttle, schedule, size disks |
| Clock skew | Wrong last-write-wins | Logical clocks or versions |
| Node loss | Reduced redundancy | Fast re-replication and alerts |

## Follow-up questions to expect

- What changes for strong consistency?
- How would you do transactions?
- How do you rebalance without downtime?
