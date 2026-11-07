---
title: CRUSH, pools and placement groups
minutes: 13
summary: Learn how Ceph decides where data lives using CRUSH, pools and placement groups, and how failure domains protect against losing a whole server or rack.
---

CRUSH is why Ceph scales. Clients compute where data lives instead of asking a central server, so there is no lookup bottleneck. The price is that you must understand failure domains.

## What you will learn

- The path from object to OSD
- Failure domains and CRUSH rules
- Pools, replica count and min_size
- Placement group counts and the autoscaler

## From object to OSD

1. An object is written into a **pool** under a name.
2. Its name is hashed to a **placement group** within the pool.
3. **CRUSH** maps that placement group to a list of OSDs, honouring the rule's failure domain.
4. The first OSD in the list is the primary; it forwards writes to the others.

Because CRUSH is a calculation over the cluster map, any client can do it and no one stores a per object table.

```diagram
title: Where does an object go?
node: obj | Object | 0 | 1 | Has a name and data. | Very large objects can slow recovery. | store
node: pool | Pool | 1 | 0 | Sets replica count, rule and PG number. | Wrong settings are costly to change later. | process
node: pg | Placement group | 2 | 1 | A bucket of objects that moves as a unit. | Too few PGs gives uneven data spread. | process
node: crush | CRUSH rule | 3 | 0 | Picks OSDs in different failure domains. | A rule on the wrong domain risks correlated loss. | security
node: osds | OSDs on hosts | 3 | 2 | The disks that hold the copies. | Unequal weights cause hot spots. | store
edge: obj | pool
edge: pool | pg
edge: pg | crush
edge: crush | osds
```

## Failure domains

A CRUSH rule says "choose N distinct buckets of type host" or rack, room or datacenter. With three replicas and host failure domain, each copy is on a different server. With rack, each is in a different rack and a whole rack can fail. You need enough buckets: three racks for three copies by rack.

## Pools

```bash
ceph osd pool create vms 128
ceph osd pool set vms size 3
ceph osd pool set vms min_size 2
ceph osd pool application enable vms rbd
```

`size` is the number of copies. `min_size` is how many must be available to accept IO. With size 3 and min_size 2, the pool keeps working with one copy missing and stops at two missing, protecting against writing data that exists only once.

## Placement groups

Each OSD should carry about 100 PGs. Too few makes data uneven; too many wastes memory. Leave the **PG autoscaler** on, and set a `target_size_ratio` for pools you know will grow.

## Incident: Two copies on one host

> **Incident:** Losing a server took some data offline.

```console
$ ceph osd crush rule dump replicated_rule | grep type
                "type": "osd"
$ ceph health detail
HEALTH_ERR 12 pgs inactive; 12 pgs stuck
```

The pool used a rule with an OSD failure domain, so two of three copies of some PGs shared a server. When that server failed, the PGs dropped below min_size. A host failure domain rule fixed the placement and data moved apart.

## Common mistakes

- Leaving the default rule without checking its failure domain
- Setting min_size to 1
- Creating pools with a fixed PG count and never revisiting it
- Using a rack failure domain with fewer racks than copies

```quiz
Q: What decides which OSDs hold a placement group?
+ CRUSH
- DNS :: No.
- The client library only :: No.
- A central table :: No.
> CRUSH computes placement from the map.

Q: What does min_size control?
+ How many copies must be up to accept IO
- The object size :: No.
- The PG count :: No.
- The network speed :: No.
> It protects against single copy writes.

Q: Why choose host as the failure domain?
+ Copies land on different servers
- It saves disk :: No.
- It speeds CPU :: No.
- It removes monitors :: No.
> Losing one server loses at most one copy.

Q: What does the PG autoscaler do?
+ Adjusts PG counts as pools grow
- Adds OSDs :: No.
- Creates users :: No.
- Sets quorum :: No.
> It keeps PG numbers sensible.
```

```cards
CRUSH :: The algorithm that computes data placement
Pool :: A logical group of objects with shared settings
Placement group :: A unit of data placement that maps to a set of OSDs
Failure domain :: The kind of failure copies are spread across
min_size :: The minimum copies needed to accept IO
```
