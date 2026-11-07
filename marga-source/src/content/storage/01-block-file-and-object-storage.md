---
title: Block, file and object storage
minutes: 13
summary: Tell the three kinds of storage apart, and learn the numbers that matter: capacity, IOPS, throughput and latency.
---

Everything an application saves ends up on some kind of storage. The kind decides what you can do with it, how fast it is, and what breaks when it fills up.

## What you will learn

- Block, file and object storage and when to use each
- IOPS, throughput and latency, and how they differ
- The main device types: HDD, SSD and NVMe
- How to measure a disk from the command line

## Three kinds

| Kind | You see | Examples | Good for |
|---|---|---|---|
| Block | A raw disk you format yourself | Local disk, SAN LUN, AWS EBS, Azure managed disk | Databases, boot disks, virtual machines |
| File | Folders and files shared over a network | NFS, SMB, AWS EFS, Azure Files | Shared content, home folders |
| Object | Whole objects with keys, over HTTP | AWS S3, Azure Blob, Ceph RGW | Backups, media, logs, data lakes |

A block device has no idea what is in it. A **filesystem** on top gives it names and folders. Object storage has no folders, only keys that may contain slashes, and objects are replaced as a whole, not edited in place.

## The numbers

- **Capacity**: how much it holds.
- **IOPS**: input and output operations per second. Many small reads and writes, such as a database, are IOPS limited.
- **Throughput**: megabytes per second. Large sequential copies, such as backups, are throughput limited.
- **Latency**: the time for one operation. A database commit waits for it.

A disk that does 100 000 IOPS with 4 KB operations moves only about 400 MB per second. The same disk copying large blocks may move 2 000 MB per second. Always ask which number a workload needs.

## Device types

- **HDD** (spinning): cheap per terabyte, a few hundred IOPS, milliseconds of latency.
- **SSD (SATA or SAS)**: tens of thousands of IOPS, latency well under a millisecond.
- **NVMe**: flash on the PCIe bus, hundreds of thousands of IOPS and very low latency.

Cloud disks add limits of their own: a volume may have a baseline and a burst. When the burst credit is spent, it slows to the baseline.

## Measuring

```console
$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda      8:0    0  100G  0 disk
|-sda1   8:1    0    1G  0 part /boot
`-sda2   8:2    0   99G  0 part /
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2        98G   71G   22G  77% /
$ fio --name=randread --rw=randread --bs=4k --size=1G --runtime=10 --time_based --iodepth=16
  read: IOPS=21.4k, BW=83.7MiB/s
```

`fio` is the standard tool for testing, and it should be run on a test disk, never on a disk with live data in a way that writes over files you need.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Block, file and object storage fits together
node: n1 | Three kinds | 0 | 0 | A block device has no idea what is in it. | Treating object storage like a filesystem that supports small in-place edits. | process
node: n2 | The numbers | 1 | 1 | Capacity: how much it holds. | Testing with fio on a path that has a cache and getting numbers that are too good. | process
node: n3 | Device types | 2 | 0 | HDD (spinning): cheap per terabyte, a few hundred IOPS, milliseconds of latency. | Choosing a volume by price per terabyte without checking IOPS. | process
node: n4 | Measuring | 3 | 1 | fio is the standard tool for testing, and it should be run on a test disk, never on a disk with live data in a way that writes over files you need. | Measuring fio is the standard tool for testing, and it should be run on a test disk, never on a disk with live data in a way that writes... | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The cheap disk that made the database slow

> **Incident:** A report job that took ten minutes on the old server took two hours after migration to a cheaper volume type.

```console
$ iostat -x 5 2 | grep -E 'Device|nvme|sda'
Device   r/s    w/s   rkB/s  await  %util
sda      95.0   12.0  1520   42.10  99.80
```

The new volume was a throughput-oriented HDD type. The database made many small random reads, so the disk was at 99.8 percent busy and each read waited 42 ms. The old disk was SSD. Moving the data to an SSD volume brought the report back to ten minutes. Capacity and price were not the issue; the access pattern was.

## Common mistakes

- Choosing a volume by price per terabyte without checking IOPS
- Treating object storage like a filesystem that supports small in-place edits
- Testing with fio on a path that has a cache and getting numbers that are too good
- Ignoring cloud burst limits until a busy hour

```quiz
Q: Which kind of storage is a raw disk that you format yourself?
+ Block storage
- Object storage :: Object storage uses keys.
- File storage :: File storage already has folders.
- Cache :: Not a storage kind here.
> Block gives raw capacity.

Q: A workload does many small random reads. Which number matters most?
+ IOPS
- Capacity :: Not the limit for small reads.
- Throughput alone :: Large copies need that.
- Colour of the cable :: No.
> Small operations are IOPS bound.

Q: What does a filesystem add on top of a block device?
+ Names, folders and file metadata
- Faster flash :: It does not change the device.
- Replication :: Not by itself.
- Network access :: Not by itself.
> Block devices know nothing about files.

Q: Why can a cloud volume slow down after a busy period?
+ Its burst allowance is used up and it falls to the baseline
- The cloud deletes data :: No.
- The disk shrinks :: No.
- The CPU is stolen :: That is a compute matter.
> Baseline and burst limits apply.
```

```cards
Block storage :: raw disk formatted by you
File storage :: shared folders over a network
Object storage :: whole objects with keys over HTTP
IOPS :: operations per second
Throughput :: megabytes per second
Latency :: time for one operation
```
