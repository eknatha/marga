---
title: Vault high availability, Raft and disaster recovery
minutes: 13
summary: Run Vault with integrated Raft storage across three or five nodes, understand active and standby nodes, take snapshots, and plan for replication and recovery.
---

Because everything depends on Vault, its availability sets the availability of every application and pipeline that reads secrets.

## What you will learn

- Active and standby nodes
- Running a Raft cluster
- Snapshots and restore
- Replication and disaster recovery options

## Active and standby

In a cluster one node is **active** and handles all writes. Standby nodes forward requests to it or redirect clients. If the active node fails, the standbys elect a new leader within seconds. Clients should use a load balancer or an address that follows the active node, with health checks on `/v1/sys/health`.

## Raft

```bash
vault operator raft list-peers
vault operator raft join https://vault-1.internal:8200
vault operator raft snapshot save backup.snap
vault operator raft snapshot restore backup.snap
```

Raft needs a majority to commit: three nodes survive one failure, five survive two. Spread nodes over three zones. Use fast local disks and a low latency network, since each write is replicated before it is acknowledged.

```diagram
title: A three node Vault cluster
node: lb | Load balancer | 0 | 1 | Sends clients to a healthy node. | Needs a health check on the active node. | edge
node: act | Active node | 1 | 0 | Handles writes and replicates them. | Losing it triggers an election. | security
node: s1 | Standby 1 | 2 | 1 | Replicates data and can become active. | Needs the same unseal method. | security
node: s2 | Standby 2 | 1 | 2 | Replicates data and can become active. | Zone loss with a bad layout loses quorum. | security
node: snap | Snapshot storage | 3 | 0 | Encrypted snapshots in another location. | Untested snapshots may not restore. | store
edge: lb | act
edge: act | s1
edge: act | s2
edge: act | snap
```

## Snapshots and restore

Automatic snapshots (Enterprise) or a scheduled job produce files you copy to another place. Snapshots contain encrypted data, so you also need the unseal key or KMS access in the recovery site. Practise a restore into an empty cluster regularly.

## Replication

Vault Enterprise offers **performance replication** (secondary clusters serve reads close to users) and **disaster recovery replication** (a warm standby cluster promoted if the primary fails). In the community edition, rely on snapshots and a documented rebuild procedure.

## Maintenance

Upgrade standbys first, then step down the active node to move leadership, then upgrade it. Watch `vault.raft.leader.lastContact` and apply latency.

## Incident: Lost quorum in a bad layout

> **Incident:** Both standby nodes were in the same zone as the failed active node.

```console
$ vault operator raft list-peers
Node     Address               State     Voter
vault-1  10.0.1.11:8201        follower  true
vault-2  10.0.1.12:8201        (unreachable)
vault-3  10.0.1.13:8201        (unreachable)
```

All three nodes had been placed in one availability zone to save cross zone traffic cost. When the zone failed, the cluster lost quorum. The team spread the nodes over three zones and tested a zone failure.

## Common mistakes

- Putting all nodes in one failure domain
- Taking snapshots but never testing a restore
- Using two nodes
- Upgrading the active node first

```quiz
Q: How many failures can a five node Raft cluster tolerate?
+ Two
- Four :: No.
- One :: No.
- None :: No.
> A majority of three is needed.

Q: What does a standby node do?
+ Forwards requests and can take over
- Stores nothing :: No.
- Accepts all writes :: No.
- Seals the cluster :: No.
> It follows the active node.

Q: What does a Raft snapshot contain?
+ Encrypted Vault data
- Plaintext secrets :: No.
- Only tokens :: No.
- Only policies :: No.
> You still need unseal access.

Q: Where should nodes be placed?
+ Across failure zones
- In one rack :: No.
- On one VM host :: No.
- In one region only :: No.
> Spread to survive a zone loss.
```

```cards
Active node :: The Vault node that handles writes
Standby :: A node that follows the active node and can take over
Raft snapshot :: A point in time backup of Vault data
Performance replication :: Enterprise feature that serves reads from secondary clusters
DR replication :: Enterprise feature that keeps a standby cluster for failover
```
