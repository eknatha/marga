---
title: Kafka: replication, ISR and durability
minutes: 13
summary: Understand leader election, in-sync replicas, min.insync.replicas and unclean elections so you can reason about what Kafka loses when brokers fail.
---

Durability in Kafka is not one switch but a combination of replication factor, acknowledgement level and minimum in-sync replicas. Knowing how they interact tells you exactly what a given failure costs.

## What you will learn

- Leaders, followers and the in-sync set
- replication.factor, min.insync.replicas and acks together
- Unclean leader election and its trade-off
- Rack awareness and safe maintenance

## Leaders, followers and the ISR

Producers write to the partition **leader**; followers fetch from it. A follower that keeps up stays in the **ISR**. If the leader fails, the controller picks a new leader from the ISR, so no acknowledged record is lost. A follower that falls behind drops out of the ISR.

## The three settings

| Setting | Meaning | Common value |
|---|---|---|
| `replication.factor` | Copies of each partition | 3 |
| `min.insync.replicas` | Minimum ISR size to accept `acks=all` writes | 2 |
| producer `acks` | How many acknowledgements to wait for | `all` |

With 3 copies, `min.insync.replicas=2` and `acks=all`, one broker can fail with no data loss and no downtime. If a second fails, the ISR drops below 2 and writes are refused (the partition favours safety over availability). With `acks=1` a leader crash before followers copy can lose acknowledged records.

## Unclean election

If every ISR member is gone, the choices are to wait for one to return, or enable `unclean.leader.election.enable=true` and elect an out-of-sync replica. The second restores service quickly but **discards records** the replica never copied. Leave it off for data you cannot lose.

## Failure domains and maintenance

Set `broker.rack` so replicas land in different racks or zones. For restarts use controlled shutdown, and roll one broker at a time, waiting until under-replicated partitions return to zero before moving on.

```diagram
title: What replication protects
node: prod | Producer acks=all | 0 | 0 | Waits until enough replicas have the record. | acks=1 can lose a record if the leader dies at once.
node: lead | Leader | 1 | 0 | Accepts writes and serves reads for the partition. | If it fails, the controller elects a new one from the ISR.
node: f1 | Follower in ISR | 2 | 0 | Caught up and eligible to become leader. | Falling behind removes it from the ISR. | store
node: f2 | Follower out of sync | 2 | 1 | Lagging copy, not safe to elect. | Electing it (unclean) loses the missing records. | store
node: ctrl | Controller | 1 | 1 | Chooses leaders and tracks the ISR. | A controller election pauses leadership changes briefly.
edge: prod | lead
edge: lead | f1
edge: lead | f2
edge: ctrl | lead
```

## Incident: Two brokers in one rack

> **Incident:** A rack lost power and took two of three replicas of several partitions.

```console
$ kafka-topics.sh --describe --under-min-isr-partitions
Topic: orders Partition: 3 Leader: 2 Replicas: 1,2,3 Isr: 2
producer: NotEnoughReplicasException: Messages are rejected since there are fewer in-sync replicas than required
```

The producers stopped rather than lose data, which was the intended behaviour. After power returned the followers caught up. The team added broker.rack so replicas would spread across racks, and tested a rack failure in a game day.

## Common mistakes

- Replication factor 1 on important topics
- acks=1 combined with a belief that data is safe
- Enabling unclean election without understanding the loss
- Restarting several brokers at once

```quiz
Q: With RF 3, min ISR 2 and acks=all, how many broker failures keep writes working?
+ One
- Two :: No.
- Three :: No.
- None :: No.
> Two failures drop the ISR below the minimum.

Q: What does unclean leader election risk?
+ Losing records the replica never copied
- Slower reads :: No.
- TLS failure :: No.
- Larger logs :: No.
> An out-of-sync replica lacks recent data.

Q: What does broker.rack help with?
+ Spreading replicas across failure domains
- Faster compression :: No.
- Topic names :: No.
- Client IDs :: No.
> Replicas land in different racks.

Q: Before restarting the next broker, what should be zero?
+ Under-replicated partitions
- Consumers :: No.
- Topics :: No.
- Producers :: No.
> Wait for replicas to catch up.
```

```cards
Replication factor :: Number of copies of each partition
min.insync.replicas :: Minimum caught-up replicas needed to accept a write
Unclean election :: Choosing an out-of-sync replica as leader
Under-replicated :: A partition with fewer in-sync replicas than it should have
Controlled shutdown :: Moving leaders away before a broker stops
```
