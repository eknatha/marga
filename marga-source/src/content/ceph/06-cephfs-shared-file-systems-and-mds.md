---
title: CephFS: shared file systems and the MDS
minutes: 12
summary: Run CephFS for shared POSIX storage, understand how metadata servers work, mount it from clients and Kubernetes, and set quotas and snapshots.
---

CephFS fills the gap between block and object: a POSIX file system many hosts can mount at the same time. It is built on the same RADOS, with metadata servers added.

## What you will learn

- Data and metadata pools
- Active and standby MDS
- Mounting, subvolumes and quotas
- Using CephFS for Kubernetes ReadWriteMany

## Data and metadata

File contents are stored as objects in a **data pool**. Directory structure and file attributes live in a **metadata pool**, served from memory by **MDS** daemons. Keep the metadata pool on fast media.

```bash
ceph fs volume create shared
ceph fs status shared
ceph fs subvolume create shared proj-a --size 107374182400
```

## Active and standby MDS

An active MDS holds part of the namespace in cache. Standby MDS daemons take over if it fails, usually in seconds. With multiple active MDS (`max_mds`), directories are split between them to spread load. The MDS cache size (`mds_cache_memory_limit`) decides how many files it can keep hot.

```diagram
title: How a CephFS client reads a file
node: cli | Client mount | 0 | 1 | A kernel or FUSE mount of the file system. | Old client kernels may lack features. | client
node: mds | Active MDS | 1 | 0 | Answers path, permission and layout questions. | A cold or small cache makes ls slow. | service
node: sb | Standby MDS | 1 | 2 | Waits to take over a failed MDS. | A slow takeover stalls clients. | service
node: meta | Metadata pool | 2 | 0 | Stores directory and inode data. | Place it on SSD or NVMe. | store
node: data | Data pool | 3 | 1 | Stores file contents as objects. | Wrong replication here risks data. | store
edge: cli | mds
edge: mds | meta
edge: cli | data
edge: sb | mds
```

The client asks the MDS where a file's data is, then reads and writes the data pool directly. File data does not pass through the MDS.

## Mounting and quotas

```bash
mount -t ceph 10.0.0.11:6789:/ /mnt/shared -o name=app,secretfile=/etc/ceph/app.secret
```

Subvolumes isolate projects, carry quotas and can be snapshotted. Create one per tenant or application and mount only that path with its own key.

## Kubernetes

ceph-csi provisions CephFS subvolumes as ReadWriteMany PVCs, handy for shared uploads and content. For databases, prefer RBD.

## Incident: Slow ls in a huge directory

> **Incident:** Listing a directory with millions of files took minutes.

```console
$ ceph fs status shared
RANK  STATE   MDS    ACTIVITY     DNS   INOS
 0    active  mds.a  Reqs: 9800/s 4.1M  4.1M
$ ceph tell mds.a perf dump | grep cache
    "mds_mem.ino": 4100000
```

One active MDS handled every metadata request and had a cache too small for four million files. The team raised max_mds, increased the cache limit, and changed the application to spread files over subdirectories.

## Common mistakes

- Putting the metadata pool on slow disks
- Using CephFS for databases
- One huge shared directory for all users
- Mounting the whole file system for every application

```quiz
Q: What does the MDS serve?
+ File system metadata
- S3 requests :: No.
- Block devices :: No.
- Monitor maps :: No.
> It handles paths and attributes.

Q: Where is CephFS file data stored?
+ In a data pool
- In the MDS :: No.
- On the monitors :: No.
- In the manager :: No.
> Clients read the data pool directly.

Q: What takes over when an MDS fails?
+ A standby MDS
- A monitor :: No.
- A client :: No.
- An OSD :: No.
> Standbys are ready to replace it.

Q: What is a subvolume for?
+ Isolating a project with a quota
- Creating a monitor :: No.
- Adding an OSD :: No.
- Changing DNS :: No.
> It is a managed directory.
```

```cards
MDS :: Metadata server for CephFS
Subvolume :: A managed directory with its own quota
Standby MDS :: A spare metadata server ready to take over
max_mds :: The number of active metadata servers
Data pool :: The pool that stores file contents
```
