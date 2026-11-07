---
title: Replication, erasure coding and durability
minutes: 13
summary: Compare replicated and erasure coded pools, work out the capacity overhead and failure tolerance of each, and choose a layout that fits the workload.
---

Capacity and durability pull in different directions. Ceph lets you pick per pool, so you can match the protection to what the data is worth and how it is accessed.

## What you will learn

- Replicated pools
- Erasure coding with k and m
- Capacity overhead and tolerance
- Choosing a layout for the workload

## Replication

Replicated pools keep `size` full copies on different failure domains. They are simple and fast, repair quickly by copying one replica, and handle small random writes well. The cost is raw space: three copies use three times the data size.

## Erasure coding

An EC profile splits each object into **k** data chunks and **m** coding chunks placed on different failure domains. Any k of the k+m chunks can rebuild the object, so the pool survives m failures.

| Layout | Raw space per usable | Survives | Notes |
|--------|---------------------|----------|-------|
| Replicated size 3 | 3.0x | 2 lost copies | Fast, simple |
| EC 4+2 | 1.5x | 2 lost chunks | Needs at least 6 hosts |
| EC 8+3 | 1.375x | 3 lost chunks | Needs at least 11 hosts |

```bash
ceph osd erasure-code-profile set ec42 k=4 m=2 crush-failure-domain=host
ceph osd pool create archive 64 64 erasure ec42
ceph osd pool set archive allow_ec_overwrites true
```

```diagram
title: Three copies versus four plus two
node: data | 12 TB of data | 0 | 1 | The amount users store. | Plan raw capacity from this number. | store
node: rep | Replicated size 3 | 1 | 0 | 36 TB raw, fast and simple. | Expensive for large cold data. | store
node: ec | Erasure coded 4+2 | 1 | 2 | 18 TB raw with two parity chunks. | Slower small writes and heavier recovery. | store
node: fail | Two failures | 2 | 1 | Both layouts survive losing two failure domains. | A third loss in either layout means data loss. | observe
edge: data | rep
edge: data | ec
edge: rep | fail
edge: ec | fail
```

## Choosing

Use replicated pools for RBD databases, VM disks and CephFS metadata. Use erasure coding for RGW data, backups and archives, where objects are large and written once. Block devices on EC need `allow_ec_overwrites` and a replicated pool for metadata, and still suit sequential rather than random IO.

## Durability is more than copies

Durability also depends on failure domains, how fast recovery runs, scrubbing that finds bit rot, and spare capacity to rebuild into. A cluster 95 percent full cannot recover from a failure.

## Incident: Not enough hosts for the profile

> **Incident:** Creating an EC pool left PGs stuck.

```console
$ ceph health detail
HEALTH_WARN Reduced data availability: 64 pgs inactive
pg 7.3 is creating+incomplete, acting [4,9,NONE,14,2,NONE]
$ ceph osd tree | grep -c host
5
```

A 4+2 profile with host failure domain needs six hosts. With five hosts, two chunks of each PG had nowhere to go. The team added a sixth host, and the PGs became active.

## Common mistakes

- Using EC for small random write workloads
- Choosing k and m with fewer hosts than k+m
- Counting raw space instead of usable space
- Running above 80 percent full and expecting to recover

```quiz
Q: How much raw space does size 3 replication use?
+ Three times the data
- 1.5 times :: No.
- Equal to the data :: No.
- Half :: No.
> Three full copies are stored.

Q: What does EC 4+2 tolerate?
+ Two lost chunks
- Four lost chunks :: No.
- One lost chunk :: No.
- None :: No.
> m coding chunks give m failures.

Q: Where does EC fit best?
+ Large, write-once objects
- Small random database writes :: No.
- Monitors :: No.
- The manager :: No.
> It saves space for cold data.

Q: Why keep free capacity?
+ Recovery needs room to rebuild
- Monitors need it :: No.
- It speeds DNS :: No.
- It lowers CPU :: No.
> Full clusters cannot heal.
```

```cards
Replicated pool :: A pool that stores full copies of each object
Erasure coding :: Splitting data into chunks with parity for space-efficient protection
k and m :: Data chunks and coding chunks in an EC profile
Scrubbing :: Background checks that find damaged data
Durability :: The probability that data survives over time
```
