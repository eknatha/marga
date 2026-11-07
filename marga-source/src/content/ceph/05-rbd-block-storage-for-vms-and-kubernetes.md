---
title: RBD block storage for VMs and Kubernetes
minutes: 13
summary: Create and use RBD images, snapshots and clones, connect Ceph to Kubernetes with ceph-csi, and replicate images between clusters.
---

Most Ceph users meet RBD first. It gives you thin provisioned, resizable disks with snapshots and clones, spread over every OSD so no single disk limits performance.

## What you will learn

- Creating and using images
- Snapshots, clones and layering
- Using RBD with Kubernetes and VMs
- Mirroring for disaster recovery

## Images

```bash
ceph osd pool create rbd 64
rbd pool init rbd
rbd create rbd/db1 --size 100G
rbd info rbd/db1
rbd map rbd/db1
rbd du rbd/db1
```

Images are thin provisioned: they use space only as data is written. They are striped over many objects, so reads and writes hit many OSDs in parallel. Resize with `rbd resize` and grow the file system afterwards.

## Snapshots and clones

A snapshot is a read-only point in time. A **clone** is a writable child of a protected snapshot that shares unchanged data. That makes VM provisioning fast: keep a golden image snapshot and clone it per VM. Flatten a clone to copy the data and remove the dependency on the parent.

```diagram
title: RBD in a Kubernetes cluster
node: pod | Pod or VM | 0 | 1 | Uses a PVC as a disk. | Heavy IO from one pod can affect others. | service
node: csi | ceph-csi | 1 | 0 | Creates, maps and mounts RBD images for PVCs. | Wrong credentials leave volumes Pending. | process
node: img | RBD image | 2 | 1 | Thin provisioned and striped across OSDs. | Unremoved snapshots grow the pool. | store
node: pool | Replicated pool | 3 | 0 | Holds the objects with three copies. | A full pool stops all images in it. | store
node: mirror | Mirror to site B | 3 | 2 | Copies images to another cluster. | Mirroring lag sets the data lost in a disaster. | external
edge: pod | csi
edge: csi | img
edge: img | pool
edge: img | mirror
```

## Kubernetes and VMs

A StorageClass using the `rbd.csi.ceph.com` provisioner turns a PVC into an RBD image. Use `volumeMode: Block` with `ReadWriteMany` for VMs that need live migration, and ext4 or XFS with ReadWriteOnce for databases. QEMU also talks to RBD directly through librbd.

## Mirroring

Journal based mirroring replicates every write; snapshot based mirroring copies at intervals. Choose by how much data loss you can accept, and test a promote of the secondary site.

## Incident: The pool that filled with snapshots

> **Incident:** A pool reached nearfull with little live data.

```console
$ rbd du rbd/db1
NAME           PROVISIONED  USED
db1@pre-up-1   100 GiB      18 GiB
db1@pre-up-2   100 GiB      21 GiB
db1            100 GiB      64 GiB
<TOTAL>        100 GiB      1.9 TiB
```

Upgrade snapshots had accumulated for a year and each pinned changed blocks. A cleanup job that deleted snapshots older than a week returned over a terabyte of space.

## Common mistakes

- Keeping snapshots forever
- Resizing the image without growing the file system
- Using one pool for everything
- Skipping a test of the mirror promote

```quiz
Q: What is an RBD clone?
+ A writable child of a snapshot
- A second monitor :: No.
- A pool :: No.
- A Service :: No.
> Clones share unchanged data.

Q: What does ceph-csi do?
+ Provides Ceph volumes to Kubernetes
- Deploys monitors :: No.
- Encrypts S3 :: No.
- Creates racks :: No.
> It is the CSI driver for Ceph.

Q: Why are RBD images fast?
+ They are striped across many OSDs
- They are on one disk :: No.
- They use NFS :: No.
- They avoid replication :: No.
> Many OSDs work in parallel.

Q: What does RBD mirroring give?
+ A copy in another cluster
- A faster disk :: No.
- A bigger image :: No.
- A new pool :: No.
> It supports disaster recovery.
```

```cards
Image :: An RBD block device stored in a pool
Clone :: A writable copy based on a snapshot
Flatten :: Copying a clone's data so it no longer needs its parent
ceph-csi :: The Kubernetes CSI driver for RBD and CephFS
Mirroring :: Replicating RBD images to another cluster
```
