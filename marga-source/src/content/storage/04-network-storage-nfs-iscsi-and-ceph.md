---
title: Network storage: NFS, iSCSI and Ceph
minutes: 14
summary: See how storage is shared over a network with NFS and iSCSI, and what a distributed system such as Ceph adds.
---

When many servers need the same data, or a server's disk must outlive the server, storage moves onto the network.

## What you will learn

- NAS and SAN, and how NFS and iSCSI fit
- Mounting NFS and the options that matter
- iSCSI initiators and targets
- What Ceph is and how it keeps copies

## NAS and SAN

- **NAS** (network attached storage) shares **files**. Clients see folders. NFS and SMB are NAS protocols.
- **SAN** (storage area network) shares **blocks**. Clients see a disk and format it. iSCSI and Fibre Channel are SAN protocols.

## NFS

NFS lets a server export a folder that clients mount like a local one.

```console
$ showmount -e nas01
Export list for nas01:
/exports/media 10.0.0.0/24
$ sudo mount -t nfs4 -o rw,hard,timeo=600 nas01:/exports/media /mnt/media
$ findmnt /mnt/media
TARGET     SOURCE            FSTYPE OPTIONS
/mnt/media nas01:/exports/media nfs4  rw,relatime,hard,timeo=600
```

Options worth knowing:

- **hard** keeps retrying when the server is unreachable, so applications wait instead of getting errors that corrupt data. **soft** gives up and returns an error, which can silently lose writes.
- File ownership uses numbers (UID and GID). If the user is 1001 on the client and 1002 on the server, permissions look wrong. Either keep IDs in sync or use a central directory.
- A client that cannot reach the server may freeze commands such as `ls` or `df` on that mount. Applications that hang in uninterruptible sleep (state `D`) are a common sign.

## iSCSI

iSCSI carries SCSI commands over ordinary IP. The server that offers a disk is the **target**, and the client is the **initiator**.

```console
$ sudo iscsiadm -m discovery -t sendtargets -p 10.0.1.20
10.0.1.20:3260,1 iqn.2026-01.example:storage.lun1
$ sudo iscsiadm -m node -T iqn.2026-01.example:storage.lun1 -p 10.0.1.20 --login
$ lsblk | grep sdc
sdc      8:32   0  200G  0 disk
```

The new disk is raw; you create a filesystem on it. Use a separate network or VLAN for iSCSI, and **multipath** (two paths to the storage) so one switch failure does not remove the disk.

## Ceph

**Ceph** is a distributed storage system that runs on ordinary servers. It offers block (RBD), file (CephFS) and object (RGW, S3 compatible) storage on the same cluster.

- **OSDs** store the data, one per disk.
- **Monitors** keep the cluster map and need a majority to agree.
- Data is split into objects placed by an algorithm called **CRUSH**, so no central table is needed.
- Each object has copies on different hosts (commonly 3), or is spread with **erasure coding**, which uses less space but costs CPU and repair work.

```console
$ sudo ceph -s
  cluster:
    health: HEALTH_WARN
            1 osds down
  data:
    pools:   3 pools, 128 pgs
    usage:   4.1 TiB used, 18 TiB / 22 TiB avail
    pgs:     128 active+undersized+degraded
```

A down OSD leaves data with fewer copies than intended, shown as **degraded**. Ceph rebuilds copies on other disks automatically. Replacing the disk quickly keeps the cluster safe, and a full cluster is a serious failure: Ceph stops writes at about 95 percent full to protect itself.

## Incident: The share that froze every server

> **Incident:** One NFS server was rebooted, and thirty application servers hung within a minute.

```console
$ ps -eo pid,stat,wchan:20,cmd | grep ' D '
2231 D    nfs_wait_bit_killable  /opt/app/report-worker
2240 D    nfs_wait_bit_killable  df -h
```

The applications were mounted with `hard`, so they waited for the server, which is the safe choice for data but blocks everything. Because even `df -h` touched the mount, monitoring checks hung too. The NFS server came back after 12 minutes and everything resumed. The fix was to make the exports highly available, and to stop monitoring scripts calling `df` on network mounts without a timeout.

## Common mistakes

- Using soft mounts for data that matters
- Different user IDs on client and server
- iSCSI on the same network as general traffic, with no multipath
- Letting a Ceph cluster fill past 85 percent

```quiz
Q: Which is a SAN protocol?
+ iSCSI
- NFS :: NFS shares files.
- SMB :: SMB shares files.
- HTTP :: It is not a block protocol.
> SAN shares blocks.

Q: What does a hard NFS mount do when the server is unreachable?
+ It keeps retrying so applications wait instead of getting errors
- It unmounts at once :: No.
- It returns an error immediately :: That is soft.
- It switches to local disk :: No.
> Hard protects data but can hang applications.

Q: In iSCSI, what is the target?
+ The server that offers the disk
- The client :: That is the initiator.
- The cable :: No.
- The filesystem :: No.
> The initiator logs in to a target.

Q: What does a degraded Ceph placement group mean?
+ It has fewer copies than intended
- It is encrypted :: No.
- It is deleted :: No.
- It is read only forever :: No.
> Recovery rebuilds the missing copies.
```

```cards
NAS :: shares files over a network
SAN :: shares blocks over a network
NFS :: file sharing protocol, common on Linux
iSCSI :: SCSI disks over IP
Multipath :: two or more paths to the same disk
Ceph :: distributed block, file and object storage
```
