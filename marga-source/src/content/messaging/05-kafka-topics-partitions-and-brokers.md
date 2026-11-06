---
title: Kafka: topics, partitions and brokers
minutes: 13
summary: Learn Kafka's model of topics split into partitions, brokers that store them, offsets and keys, and how partitioning shapes ordering and scale.
---

Kafka is a distributed commit log. Producers append records, consumers read at their own pace, and the data stays for a chosen time. Everything about scale and ordering comes from one idea, the partition, so it is the first thing to understand.

## What you will learn

- Topics, partitions, offsets and records
- Brokers, replicas and the controller
- Keys and how they choose a partition
- Choosing a partition count

## Topics and partitions

A **topic** is a named stream. It is divided into **partitions**; each partition is an ordered, append-only file split into segments on disk. Each record in a partition gets an **offset**: 0, 1, 2 and so on. There is no global order across partitions, only within one.

```console
$ kafka-topics.sh --bootstrap-server b1:9092 --create --topic orders --partitions 6 --replication-factor 3
$ kafka-topics.sh --bootstrap-server b1:9092 --describe --topic orders
Topic: orders  PartitionCount: 6  ReplicationFactor: 3
  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1
```

## Brokers and replicas

A **broker** is a Kafka server. Each partition has one **leader** broker that handles reads and writes, and **followers** that copy it. The set of followers that are caught up is the **ISR** (in-sync replicas). Modern clusters run in **KRaft** mode, where Kafka brokers manage cluster metadata themselves with a Raft quorum instead of using ZooKeeper.

## Keys

A producer may attach a **key**. Records with the same key hash to the same partition, so they stay in order. With no key, records are spread across partitions. Use the entity id (order id, user id) as the key when order per entity matters.

## How many partitions

Partitions set the maximum parallelism of a **consumer group**: with 6 partitions at most 6 consumers read in parallel. More partitions give more throughput and more files, open handles and recovery time. Adding partitions later is possible but changes which partition a key maps to; reducing is not supported. Plan for the growth you expect, then add headroom.

```diagram
title: A Kafka topic across brokers
node: prod | Producers | 0 | 0 | Append records, choosing a partition by key. | A hot key sends all load to one partition.
node: b1 | Broker 1 | 1 | 0 | Leader for some partitions, follower for others. | Losing it moves leadership to followers in the ISR.
node: b2 | Broker 2 | 1 | 1 | Holds replicas and leaders too. | A slow disk here slows its leader partitions. | store
node: b3 | Broker 3 | 1 | 2 | Third copy for fault tolerance. | Two brokers down with replication 3 can stop writes. | store
node: cons | Consumer group | 2 | 1 | Each partition is read by one consumer in the group. | More consumers than partitions leaves some idle.
edge: prod | b1
edge: prod | b2
edge: b1 | b3
edge: b2 | cons
```

## Incident: Three partitions, twenty consumers

> **Incident:** A service needed to scale to twenty consumers but the topic had only three partitions.

```console
$ kafka-consumer-groups.sh --bootstrap-server b1:9092 --describe --group invoicer
GROUP     TOPIC   PARTITION  LAG
invoicer  orders  0          1,401,000
invoicer  orders  1          1,380,000
invoicer  orders  2          1,352,000
17 members have no partition assigned
```

Adding consumers did nothing. The team created a new topic with 24 partitions, copied the old data and cut over producers, because adding partitions to the old topic would have broken key ordering for existing data.

## Common mistakes

- Choosing too few partitions to save effort
- Using a low-cardinality key that makes one hot partition
- Expecting order across partitions
- Adding partitions without understanding the key mapping change

```quiz
Q: Where does Kafka guarantee order?
+ Within a partition
- Across a whole topic :: No.
- Across brokers :: No.
- Nowhere :: No.
> Order is per partition.

Q: What does the ISR contain?
+ Replicas that are caught up with the leader
- All topics :: No.
- Only consumers :: No.
- Offline brokers :: No.
> In-sync replicas. The lesson section above explains why.

Q: What limits parallel consumers in a group?
+ The number of partitions
- The key size :: No.
- The retention time :: No.
- The TLS version :: No.
> One partition goes to one consumer in a group.

Q: Why choose a record key?
+ Records with the same key stay in order
- It encrypts data :: No.
- It speeds up disks :: No.
- It deletes old records :: No.
> Same key means same partition.
```

```cards
Topic :: A named stream of records split into partitions
Partition :: An ordered, append-only log that is the unit of parallelism
Offset :: The position of a record within a partition
ISR :: The set of replicas that are in sync with the leader
KRaft :: Kafka's built-in Raft-based metadata quorum
```
