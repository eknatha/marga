---
title: What Ceph is: RADOS and the architecture
minutes: 13
summary: Understand Ceph as one distributed object store, RADOS, with block, file and object services on top, and learn what each daemon does.
---

Software-defined storage means the intelligence lives in software that runs on ordinary servers, not in a proprietary array. Ceph is the best known open source example, and it powers many OpenStack and Kubernetes clusters.

## What you will learn

- What software-defined storage means
- RADOS and the three services on top
- The daemons and their jobs
- When Ceph is a good fit and when it is not

## Software-defined storage

A traditional array puts disks, controllers and software in one box. A software-defined system runs on standard servers, keeps several copies of data across them, and heals itself when a disk or server fails. You scale by adding servers, and there is no single controller to fail.

## RADOS and the services

**RADOS** is the reliable distributed object store at the bottom. Everything is stored as objects placed by an algorithm, not by a central table. Three services sit on top:

| Service | What you get | Typical use |
|---------|--------------|-------------|
| **RBD** | Block devices | VM disks, Kubernetes volumes, databases |
| **CephFS** | A POSIX shared file system | Home directories, shared data, RWX volumes |
| **RGW** | S3 and Swift object storage | Backups, artifacts, media |

## The daemons

| Daemon | Count | Job |
|--------|-------|-----|
| **MON** | 3 or 5 | Keep the cluster map and agree on it by quorum |
| **MGR** | 2 or more | Metrics, dashboard and orchestration modules |
| **OSD** | One per disk | Store data, replicate, recover |
| **MDS** | 2 or more per file system | Serve CephFS metadata |
| **RGW** | 2 or more | Serve the S3 and Swift APIs |

```diagram
title: Ceph services on one object store
node: rbd | RBD block | 0 | 0 | Block devices for VMs and containers. | One slow OSD can slow many images. | service
node: fs | CephFS | 0 | 1 | A shared POSIX file system. | An overloaded MDS stalls metadata operations. | service
node: rgw | RGW S3 | 0 | 2 | An S3 compatible object gateway. | Large buckets need index sharding. | service
node: rados | RADOS | 1 | 1 | The object store that places and protects data. | Everything above depends on it being healthy. | store
node: mon | Monitors | 2 | 0 | Hold the cluster map and form a quorum. | Losing quorum stops the cluster. | security
node: osd | OSDs on disks | 2 | 2 | Store objects and repair each other. | Too many down at once makes data unavailable. | store
edge: rbd | rados
edge: fs | rados
edge: rgw | rados
edge: rados | mon
edge: rados | osd
```

## Fit

Ceph suits clusters of at least three nodes (preferably more) where you want one platform for several storage types and can operate it. It is a poor fit for a single server, a very small team with no time to learn it, or workloads that need the lowest possible latency from one local disk.

## Incident: Three storage teams, one bill

> **Incident:** A company paid for three separate storage systems.

```console
$ ceph -s
  cluster:
    health: HEALTH_OK
  services:
    mon: 3 daemons, quorum a,b,c
    osd: 36 osds: 36 up, 36 in
    rgw: 2 daemons active
```

The consolidated cluster served VM disks, shared files and S3 buckets from 12 servers. The team learned one platform, added capacity by adding servers, and retired the old arrays as support contracts ended.

## Common mistakes

- Running Ceph on a single node and calling it highly available
- Treating it as a drop in replacement for a local disk
- Ignoring the network, which carries all replication traffic
- Starting without anyone who will operate it

```quiz
Q: What is RADOS?
+ The object store under all Ceph services
- A Kubernetes operator :: No.
- A backup tool :: No.
- A DNS server :: No.
> RBD, CephFS and RGW all use it.

Q: Which daemon stores data?
+ OSD
- MON :: No.
- MGR :: No.
- MDS :: No.
> One OSD runs per disk.

Q: What do monitors provide?
+ The cluster map and quorum
- S3 access :: No.
- File metadata :: No.
- Backups :: No.
> They agree on cluster state.

Q: Which service gives block devices?
+ RBD
- RGW :: No.
- MDS :: No.
- MGR :: No.
> RBD images back VMs and volumes.
```

```cards
RADOS :: The distributed object store at the base of Ceph
OSD :: A daemon that stores data on one disk
MON :: A monitor that keeps the cluster map
RBD :: Ceph block devices
Software-defined storage :: Storage intelligence in software on standard servers
```
