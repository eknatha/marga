---
title: Consistency and availability in practice
minutes: 15
summary: What CAP and PACELC mean for real choices, and how to pick a consistency level per piece of data.
---

When a network splits or a replica lags, a system must choose: answer with possibly stale data, or refuse. CAP names that choice. In daily work the sharper question is the trade between consistency and latency when nothing is broken. This lesson turns the theory into per-feature decisions.

## What you will learn

- State CAP and PACELC without the myths
- Describe strong, eventual, read-your-writes and causal consistency
- Choose a level per feature, not per system
- Spot replication lag as a source of user-visible bugs

## CAP, stated carefully

During a network **partition**, a system cannot both stay **consistent** (every read sees the latest write) and stay **available** (every request gets a non-error answer). Partitions happen, so the real choice is what to give up while one is in progress. It is not a menu of any two of three at all times.

**PACELC** adds the everyday case: if there is a Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Even with a healthy network, waiting for replicas to confirm a write costs time. Most systems pay that cost somewhere.

## Levels you will meet

- **Strong (linearizable):** reads see the latest completed write. Costs latency and availability.
- **Eventual:** replicas converge given time; reads may be stale. Cheap and fast.
- **Read-your-writes:** you see your own writes, others may lag. Fixes the most visible user bug.
- **Monotonic reads:** you never see time go backwards between reads.
- **Causal:** if B depends on A, everyone sees A first.

## Choose per feature

A shopping site can use different levels at once. The cart: read-your-writes is enough. Stock count at checkout: strong, or reserve with a check at commit. The product description: eventual, cache freely. A bank balance after a transfer: strong. Ask for each piece of data: what is the cost of a wrong or stale answer, and what is the cost of an error or delay?

## Replication lag

Read replicas lag. A user saves a profile, the page reloads from a replica, and the old profile shows. They save again, worse. Fixes: read from the primary for a short time after a write, route a user's reads to the same replica, or carry a version or timestamp token and wait until the replica has reached it. Measure lag and alert on it; lag also decides how much data a failover can lose.

## Failover and what it sacrifices

Asynchronous replication keeps writes fast but a primary failure can lose the last writes. Synchronous replication avoids that loss but halts writes if the replica is unreachable. Many teams use one synchronous replica as the failover target. The GoCardless case in 2017 shows a design that had this intent but whose automatic promotion did not trigger, so the outage lasted until engineers promoted a node by hand.

```predict
Q: A user updates their email and the next page still shows the old one, though the database has the new value. What is the likely cause and a cheap fix?
???
The read went to a lagging replica. Read from the primary briefly after a write, or use a version token (read-your-writes).
> The data is fine; the read path is stale.
```

## How it fails

Eventual consistency fails as confusing, not as down: duplicated actions, lost updates when two writers race, double spends. Strong consistency fails as unavailable: writes block during a partition. Name which failure the feature can tolerate.

## Incident: The failover that did not fail over

> **Incident:** The primary database lost its disk array. The synchronous replica was healthy, but the cluster manager did not promote it.

```console
$ crm status | head -5
Online: [ db-a db-b ]
db-a  (ocf::heartbeat:pgsql)  FAILED
db-b  (ocf::heartbeat:pgsql)  Started (not promoted)
$ crm resource promote ms_pgsql
```

This block is a simulated illustration of the pattern. In the real GoCardless incident on 10 October 2017, the API and dashboard were down about 1 hour 50 minutes until a manual promotion. The lesson for design: automatic failover is a feature to be tested on a schedule, not trusted because it exists. See the case file for sourced detail.

## Interview question

"Users see their old data right after saving. Walk me through it." Replication lag or a cache; prove which by reading from the primary and checking cache keys; then pick read-your-writes.

## Common mistakes

- Choosing one consistency level for the whole system
- Reading from replicas right after a write with no lag handling
- Never testing failover
- Treating CAP as three independent switches

```quiz
Q: During a partition, CAP says a system must choose between what?
+ Consistency and availability
- Speed and cost :: Not what CAP covers.
- Security and privacy :: Not CAP.
- Reads and writes :: Not the trade.
> Partitions happen; the choice is made then.

Q: What does PACELC add?
+ The latency versus consistency trade when there is no partition
- A third network type :: No.
- A storage format :: No.
- A security rule :: No.
> Correct: The latency versus consistency trade when there is no partition. Re-read the matching lesson section for the full reasoning.

Q: Which level fixes a user not seeing their own just-saved change?
+ Read-your-writes
- Eventual only :: Eventual alone can show stale data.
- Write-back :: Not a consistency level.
- Sharding :: Unrelated.
> Correct: Read-your-writes. Re-read the matching lesson section for the full reasoning.

Q: Why alert on replication lag?
+ It shows stale reads now and the data you could lose on failover
- It measures CPU :: No.
- It sizes disks :: No.
- It counts users :: No.
> Correct: It shows stale reads now and the data you could lose on failover. Re-read the matching lesson section for the full reasoning.
```

```cards
partition :: network split between nodes
linearizable :: reads see the latest completed write
eventual :: replicas converge over time
read-your-writes :: you see your own changes
replication lag :: delay before a replica has a write
PACELC :: without a partition, trade latency for consistency
```
