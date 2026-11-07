---
title: Capacity planning, upgrades and operating Ceph
minutes: 13
summary: Plan raw and usable capacity with headroom for recovery, upgrade a cluster safely in the right order, expand it, and build a day-two routine with monitoring and runbooks.
---

The first deployment is the easy part. Day two is capacity forecasts, upgrades, hardware replacement and the habits that keep a storage cluster boring.

## What you will learn

- Raw, usable and safe capacity
- Upgrading in the right order
- Expanding the cluster
- Monitoring and a day-two routine

## Capacity

Usable capacity is raw capacity divided by the replication overhead, minus headroom. For three-way replication, 300 TB raw gives at most 100 TB usable. The cluster must also survive losing a failure domain: if one host of ten fails, the other nine must absorb its data. That means staying well below 90 percent. A common target is 70 to 75 percent used, with alerts at 65 and 75.

```bash
ceph df
ceph osd df tree
ceph osd pool autoscale-status
```

Watch uneven OSD usage in `ceph osd df`. The **balancer** module moves PGs to even it out.

## Upgrades

```bash
ceph orch upgrade start --ceph-version 18.2.4
ceph orch upgrade status
```

cephadm upgrades monitors first, then managers, then OSDs, then MDS and RGW, one at a time, waiting for the cluster to be healthy between steps. Read the release notes, upgrade one major version at a time, and rehearse in a test cluster.

```diagram
title: A safe change routine
node: check | Check health | 0 | 1 | Cluster is HEALTH_OK before you start. | Starting on a warning hides new problems. | observe
node: change | Make one change | 1 | 0 | An upgrade step, a new host or a disk swap. | Several changes at once make faults hard to trace. | process
node: watch | Watch recovery | 2 | 1 | PGs return to active+clean. | Client latency may rise during rebalancing. | observe
node: next | Next change | 3 | 0 | Only after everything is clean. | Skipping the wait is how outages start. | process
node: cap | Capacity forecast | 1 | 2 | Tracks growth and the failure headroom. | Buying hardware late forces rushed changes. | store
edge: check | change
edge: change | watch
edge: watch | next
edge: cap | change
```

## Expanding

Add hosts and OSDs in steps. New OSDs trigger rebalancing, so add capacity before the cluster is full, and consider setting the upmap balancer so data moves gradually. Replacing old hardware follows the same path: add new, drain old, wait for clean.

## Routine

Alerts on health state, capacity thresholds, slow ops, scrub errors, OSD flapping and clock skew. A written runbook for each. Quarterly: test a restore, a disk swap and an upgrade in a test cluster.

## Incident: Full because a host failed

> **Incident:** Writes stopped after a hardware failure.

```console
$ ceph df
--- RAW STORAGE ---
TOTAL  300 TiB  34 TiB  266 TiB   88.7
$ ceph health
HEALTH_ERR 3 full osd(s); pool(s) full
```

At 82 percent used the cluster had no room to rebuild a lost host. Recovery filled the surviving OSDs and writes stopped. The team added hosts, then set capacity alerts at 65 and 75 percent.

## Common mistakes

- Planning capacity for the healthy day only
- Upgrading several components at once
- Adding hardware only when the cluster is nearly full
- No alerts on capacity trends

```quiz
Q: How much usable space does 300 TB raw give at size 3?
+ About 100 TB
- About 300 TB :: No.
- About 900 TB :: No.
- About 150 TB :: No.
> Divide raw by three.

Q: What upgrades first with cephadm?
+ Monitors
- Clients :: No.
- RGW :: No.
- Dashboards :: No.
> The supported order starts with MON.

Q: Why keep headroom?
+ A failed host's data must be rebuilt
- To avoid monitors :: No.
- To lower CPU :: No.
- To shorten names :: No.
> Recovery needs free space.

Q: What does the balancer do?
+ Evens out PG placement
- Adds OSDs :: No.
- Creates pools :: No.
- Encrypts data :: No.
> It moves PGs between OSDs.
```

```cards
Headroom :: Free capacity kept to survive failures
Balancer :: A module that evens out data across OSDs
Upgrade order :: The supported sequence of daemon types to update
Usable capacity :: Space available after replication overhead
Runbook :: Written steps for handling a known problem
```
