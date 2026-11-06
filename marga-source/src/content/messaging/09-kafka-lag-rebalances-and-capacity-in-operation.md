---
title: Kafka in operation: lag, rebalances and capacity
minutes: 14
summary: Monitor consumer lag, under-replicated partitions and request latency, size a cluster, and respond to common production problems.
---

A Kafka cluster that works on day one needs watching on day 100. The same few signals reveal almost every trouble: consumers behind, replicas out of sync, disks filling, and a controller that keeps changing.

## What you will learn

- Consumer lag as records and as time
- Broker health metrics that matter
- A decision path for lag and rebalance incidents
- Capacity planning and safe rolling changes

## Consumer lag

**Lag** is the difference between the newest offset in a partition and the consumer's committed offset.

```console
$ kafka-consumer-groups.sh --bootstrap-server b1:9092 --describe --group invoicer
TOPIC   PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG    CONSUMER-ID
orders  0          1,200,000       1,200,040       40     c-1
orders  1          900,000         1,250,000       350000 c-2
```

One partition far behind points to a slow or stuck consumer or a hot key; all partitions behind points to a consumer group that is too slow overall or a producer burst. Convert lag to time: lag divided by the consumption rate. "12 minutes behind" is easier to alert on than "350,000".

## Broker signals

| Metric | Healthy | Problem when |
|---|---|---|
| Under-replicated partitions | 0 | Above 0 for minutes |
| Offline partitions | 0 | Above 0 |
| Active controller count | 1 | 0 or changing often |
| ISR shrinks and expands | Rare | Frequent: slow disks or network |
| Request latency (produce, fetch) | Low and steady | Rising |
| Disk used, network utilisation | Well below limits | Near limits |

## Deciding what to do

1. **Consumers alive?** Check the group state and logs. A crashed consumer or a rebalance loop is more common than a cluster problem.
2. **Processing slow?** Look at the downstream database or API the consumer calls.
3. **Hot partition?** Check key distribution.
4. **Under capacity?** Add consumers up to the partition count; add partitions only with a plan for the key change.
5. **Broker trouble?** Check disks, network and ISR changes.

```diagram
title: Lag incident decision path
node: alert | Lag alert | 0 | 0 | Time behind is above the limit and rising. | A static record-count threshold misleads when traffic changes.
node: alive | Are consumers alive | 1 | 0 | Check group state, errors and rebalances. | A rebalance loop looks like lag but is a configuration problem.
node: slow | Is processing slow | 2 | 0 | Look at downstream calls and per-record time. | Adding consumers does not help if the database is the limit.
node: hot | Hot partition or broker | 3 | 0 | Check key spread, disk and network on brokers. | One broker with a slow disk drags all its partitions. | store
node: act | Scale or fix | 3 | 1 | Scale consumers, fix code, rebalance keys or add brokers. | Changing partitions mid-incident can break ordering.
edge: alert | alive
edge: alive | slow
edge: slow | hot
edge: hot | act
```

## Capacity and change

Keep disks below about 70 percent, network below 60, and enough headroom to lose one broker and still serve. Roll changes one broker at a time, waiting for under-replicated partitions to reach zero. Test the full restart procedure in a staging cluster.

## Incident: The rebalance loop

> **Incident:** A consumer group rebalanced every few minutes and lag grew, though the cluster was healthy.

```console
consumer: Member c-2 sending LeaveGroup request: consumer poll timeout has expired
coordinator: Preparing to rebalance group invoicer (generation 412)
lag (time behind): 18 minutes and growing
```

Batches had grown and took longer than max.poll.interval.ms, so the coordinator removed the consumer each time. Lowering max.poll.records and raising the interval ended the loop, and the alert now shows minutes behind.

## Common mistakes

- Alerting on a fixed lag number
- Adding partitions before checking whether consumers are alive
- Letting disks run above 80 percent
- Restarting brokers quickly without waiting for replicas to catch up

```quiz
Q: What does lag measure?
+ How far a consumer is behind the end of a partition
- Message size :: No.
- Disk age :: No.
- Number of topics :: No.
> Latest offset minus committed offset.

Q: One partition has huge lag and others none. What is likely?
+ A slow consumer or hot key on that partition
- A cluster-wide failure :: No.
- An expired certificate :: No.
- A wrong topic name :: No.
> Skewed load or a stuck consumer.

Q: What should active controller count be?
+ One
- Zero :: No.
- Two :: No.
- Equal to partitions :: No.
> Exactly one controller runs at a time.

Q: Why express lag as time?
+ It is easier to understand and alert on
- It uses less disk :: No.
- It removes duplicates :: No.
- It encrypts data :: No.
> Minutes behind is meaningful to people.
```

```cards
Consumer lag :: Messages a consumer has not yet processed
Under-replicated partition :: A partition missing in-sync replicas
Hot partition :: A partition receiving a disproportionate share of traffic
Controller :: The broker role that manages leaders and metadata
Rolling restart :: Restarting brokers one at a time
```
