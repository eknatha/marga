---
title: Quorums, leaders and split brain
minutes: 15
summary: How groups of machines agree, why odd numbers matter, and how fencing stops two leaders from corrupting data.
---

Some jobs must have exactly one owner at a time: the database primary, the holder of a lock, the node that assigns work. Getting machines to agree on who that is, when messages are delayed and nodes pause, is the core problem of distributed systems. You will rarely implement consensus, but you must know how to use and operate it.

## What you will learn

- Explain quorum, majority and why clusters use odd sizes
- Describe leader election at the level of Raft style systems
- Define split brain and use fencing to prevent damage
- Know what happens when a consensus store is unhealthy

## Quorum

A **quorum** is a majority: more than half. If writes need acknowledgement from a majority, any two majorities share at least one node, so a later read of a majority sees the latest write. With 3 nodes the quorum is 2 and one failure is tolerated. With 5 the quorum is 3 and two are tolerated. 4 nodes tolerate one failure, the same as 3, so use odd sizes. More nodes add fault tolerance but also latency, since more must acknowledge.

## Leader election

Consensus systems such as etcd, ZooKeeper and Consul (using Raft or similar protocols) elect one leader. All writes go through it and are replicated to followers; a write is committed once a majority has it. If the leader stops sending heartbeats, followers wait a randomised timeout, one becomes a candidate, and wins with a majority of votes. Each leader period has a number called a term or epoch; messages from an old term are rejected.

Consequence: without a majority, the cluster cannot commit writes. A 3-node cluster that loses 2 nodes stops writing, by design. It chooses consistency over availability.

## Split brain

Split brain is two nodes both acting as leader. It happens when a network partition, or a long pause, makes the old leader unaware it was replaced. A frozen process (garbage collection, a VM pause) wakes up and still believes it holds the lock. Two leaders write to the same data and corrupt it.

## Fencing

The remedy is **fencing**: the resource itself refuses stale leaders. Give every leadership a monotonically increasing **fencing token**; the storage layer rejects any write whose token is lower than one it has already seen. Other forms: power off the old node (STONITH), revoke its network access, or use leases that expire and a store that checks them. A lease alone is not safe, because a paused process can outlive its lease; the token check is.

## Operating consensus stores

Treat etcd, ZooKeeper or Consul as critical infrastructure: run 3 or 5 members across failure domains, keep disks fast (they sync to disk on every commit), monitor leader changes and commit latency, take and test snapshots, and keep their load small. A flood of requests to the consensus store can make the whole platform stall. The 2021 Roblox outage involved a Consul cluster under heavy load and a streaming feature; see the case file for the sourced account.

```predict
Q: A 5-node cluster loses 3 nodes in one zone. Can it commit writes?
???
No. It has 2 of 5, which is not a majority. It stops accepting writes until a majority is restored, preferring consistency.
> Quorum is more than half of the configured members.
```

## How it fails

Two leaders after a pause. A quorum lost because all members shared one zone. Slow disks causing constant re-elections. A cluster whose members were replaced faster than they could catch up.

## Incident: The leader that did not know

> **Incident:** A paused primary resumed after failover and kept writing, while the new primary also accepted writes.

```console
$ psql -h old-primary -c "select pg_is_in_recovery()"
 pg_is_in_recovery
-------------------
 f
$ psql -h new-primary -c "select pg_is_in_recovery()"
 pg_is_in_recovery
-------------------
 f
```

This is a simulated illustration of split brain, not one named outage. Both nodes report they are writable. The team had no fencing: the load balancer still sent some traffic to the old primary. They added a fencing step that cuts the old node off before promotion, and a check that only one writable primary exists.

## Interview question

"How do you stop two instances of a job both running?" Use a lease from a consensus store plus a fencing token checked by the thing the job writes to; a lease alone cannot stop a paused process.

## Common mistakes

- Even-sized or single-zone consensus clusters
- Trusting a lock lease without a fencing token
- Putting heavy application traffic on the consensus store
- Never practising a member replacement

```quiz
Q: A 5-node consensus cluster tolerates how many failures?
+ 2
- 1 :: That is 3 nodes.
- 3 :: Then no majority remains.
- 5 :: None would be left.
> Majority of 5 is 3.

Q: What is split brain?
+ Two nodes both acting as the leader
- A database split into shards :: That is sharding.
- A slow replica :: That is lag.
- A DNS mismatch :: Different problem.
> Correct: Two nodes both acting as the leader. Re-read the matching lesson section for the full reasoning.

Q: What makes fencing tokens work?
+ The resource rejects writes carrying a lower token than it has seen
- The client promises to stop :: Clients can be paused.
- Leases are long enough :: A paused process outlives a lease.
- Using more replicas :: Unrelated.
> Correct: The resource rejects writes carrying a lower token than it has seen. Re-read the matching lesson section for the full reasoning.

Q: Why use odd cluster sizes?
+ An extra even node adds no failure tolerance
- Odd numbers are faster :: Not the reason.
- Vendors require it :: Not the reason.
- It saves disk :: Not the reason.
> Correct: An extra even node adds no failure tolerance. Re-read the matching lesson section for the full reasoning.
```

```cards
quorum :: a majority of members
term :: number identifying one leadership period
split brain :: two leaders at once
fencing token :: increasing number the resource checks
lease :: time-limited ownership
STONITH :: power off the old node to stop it
```
