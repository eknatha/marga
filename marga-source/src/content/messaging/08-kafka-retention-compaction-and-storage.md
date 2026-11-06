---
title: Kafka: retention, compaction and storage
minutes: 12
summary: Decide how long Kafka keeps data, when to use log compaction, and how segments, disks and tiered storage affect cost and recovery time.
---

Kafka's cost is mostly disk. Retention is the lever: how many days of history, or how many bytes, to keep. Compaction is a different mode that turns a topic into a table of latest values. Choosing well saves money and avoids a full disk.

## What you will learn

- Time and size retention, and how segments are deleted
- Log compaction, keys and tombstones
- Estimating disk needs
- Tiered storage and long-term data

## Deletion retention

```console
$ kafka-configs.sh --bootstrap-server b1:9092 --alter --entity-type topics --entity-name orders \
    --add-config retention.ms=604800000,retention.bytes=107374182400
```

Kafka deletes data a **segment** at a time, not record by record. A segment is closed when it reaches `segment.bytes` or `segment.ms`; it becomes eligible for deletion when its newest record is older than `retention.ms`. The active segment is never deleted, so data can live longer than the setting suggests. `retention.bytes` applies per partition, not per topic.

## Compaction

With `cleanup.policy=compact`, Kafka keeps at least the latest record for every key and removes older ones in the background. The topic becomes a changelog of current state: user profiles, configuration, the latest price per product. A record with a key and a null value is a **tombstone** that deletes that key after `delete.retention.ms`. Compaction does not remove records from the active segment or guarantee a time, and consumers can still see older duplicates until cleaning runs.

## Estimating disk

Disk per broker is roughly: write rate × retention × replication factor ÷ number of brokers, plus 30 percent or more headroom. For 20 MB/s, 7 days and RF 3 across 6 brokers: 20 × 604,800 × 3 ÷ 6 ≈ 6 TB per broker before headroom.

## Tiered storage

Newer Kafka versions can move old segments to cheaper object storage while keeping recent data on local disks, so you can keep long history without huge broker disks. Reads of old data are slower.

```diagram
title: How Kafka frees disk
node: write | Producers write | 0 | 0 | Records append to the active segment. | A bug that doubles traffic doubles disk growth.
node: seg | Closed segments | 1 | 0 | A segment closes at its size or age limit. | The active segment is never deleted. | store
node: ret | Retention check | 2 | 0 | Deletes segments older than retention.ms or beyond retention.bytes. | Size limit above the free disk allows a full disk.
node: comp | Compaction | 2 | 1 | Keeps the latest record per key for compact topics. | Tombstones delete a key; do not use null for other things.
node: alert | Disk alert | 1 | 1 | Fires when free space is low. | Alerting at 95 percent leaves no time to react. | observe
edge: write | seg
edge: seg | ret
edge: seg | comp
edge: seg | alert
```

## Incident: The full disk on Sunday

> **Incident:** A producer bug doubled traffic, and retention kept more than the disks could hold.

```console
$ df -h /var/lib/kafka
/dev/nvme1n1  4.0T  4.0T  0  100%
kafka: java.io.IOException: No space left on device
kafka: Shutting down because log directory failed
```

After they freed space by lowering retention on the noisy topic, brokers recovered. The team set retention from real rates, added a disk alert at 70 percent and a quota on the misbehaving producer.

## Common mistakes

- Setting retention.bytes without noticing it is per partition
- Expecting compaction to run immediately
- No disk alert or producer quota
- Using a compacted topic for events that should all be kept

```quiz
Q: How does Kafka delete data under time retention?
+ Whole segments at a time
- Record by record :: No.
- By consumer request :: No.
- Only at restart :: No.
> Segments are the deletion unit.

Q: What does log compaction keep?
+ The latest record for each key
- The first record only :: No.
- Nothing :: No.
- Every record forever :: No.
> It makes the topic a table of current state.

Q: What is a tombstone?
+ A record with a key and null value that deletes the key
- A failed broker :: No.
- A topic name :: No.
- A lost partition :: No.
> It marks deletion in compacted topics.

Q: What is a safe disk planning step?
+ Add headroom for bugs and growth
- Fill disks to 95 percent :: No.
- Ignore replication :: No.
- Use one broker :: No.
> Plan for more than normal traffic.
```

```cards
Segment :: A file chunk of a partition log; the unit of deletion
Retention :: How long or how much data Kafka keeps
Compaction :: Keeping the latest record per key
Tombstone :: A null-value record that deletes a key
Tiered storage :: Moving old segments to cheaper object storage
```
