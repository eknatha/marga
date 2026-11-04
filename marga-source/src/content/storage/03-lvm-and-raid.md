---
title: LVM and RAID
minutes: 15
summary: Grow volumes online with LVM, understand RAID levels and their trade-offs, and handle a failed disk calmly.
---

A server's data will outgrow its disk. LVM lets you add space without moving data, and RAID lets a disk fail without losing it. They solve different problems and are often used together.

## What you will learn

- Physical volumes, volume groups and logical volumes
- Growing a volume and its filesystem online
- RAID 0, 1, 5, 6 and 10 and when each fits
- What to do when a disk fails

## LVM

**LVM** (logical volume manager) adds a layer between disks and filesystems.

- A **physical volume (PV)** is a disk or partition given to LVM.
- A **volume group (VG)** is a pool made of one or more PVs.
- A **logical volume (LV)** is a slice of the pool that you format and mount.

```console
$ sudo pvs
  PV         VG   Fmt  Attr PSize   PFree
  /dev/sdb   vg0  lvm2 a--  500.00g 120.00g
$ sudo vgs
  VG   #PV #LV #SN Attr   VSize   VFree
  vg0    1   2   0 wz--n- 500.00g 120.00g
$ sudo lvs
  LV   VG  Attr       LSize
  data vg0 -wi-ao---- 300.00g
  logs vg0 -wi-ao---- 80.00g
```

To grow the `data` volume by 50 GB, the pool needs free space (here 120 GB is free) and the filesystem must grow too:

```console
$ sudo lvextend -r -L +50G /dev/vg0/data
  Size of logical volume vg0/data changed from 300.00 GiB to 350.00 GiB.
  Logical volume vg0/data successfully resized.
```

The `-r` option resizes the filesystem as well. Without it the volume is larger but `df` shows the old size, because the filesystem still thinks it has 300 GiB. In that case run `resize2fs` (ext4) or `xfs_growfs` (XFS). If the pool has no free space, add a new disk with `pvcreate` and `vgextend` first. XFS can grow but not shrink.

## RAID

**RAID** combines disks for speed, safety or both. It protects against disk failure, not against deletion, corruption or fire. It is not a backup.

| Level | Disks | Survives | Notes |
|---|---|---|---|
| 0 | 2+ | Nothing | Speed only: one failure loses everything |
| 1 | 2 | One disk | Mirror, half the capacity |
| 5 | 3+ | One disk | Parity, slow to rebuild on big disks |
| 6 | 4+ | Two disks | Double parity, better for large disks |
| 10 | 4+ | One per mirror | Mirrors striped, fast and safe |

Rebuilding a large disk takes many hours, and the surviving disks work hard the whole time. With RAID 5 on big disks the chance of a second failure during rebuild is real, which is why RAID 6 or RAID 10 is preferred for large arrays.

```console
$ cat /proc/mdstat
md0 : active raid1 sdb1[0] sdc1[1](F)
      976630336 blocks [2/1] [U_]
$ sudo mdadm --detail /dev/md0 | grep -E 'State|Failed'
          State : clean, degraded
 Failed Devices : 1
```

`[U_]` shows one of two members is missing: the array is **degraded** but working.

## Incident: Two failures, one night

> **Incident:** A RAID 5 array lost a second disk while rebuilding the first.

```console
$ cat /proc/mdstat
md0 : active raid5 sde1[4](S) sdd1[3](F) sdc1[2] sdb1[1](F) sda1[0]
      [5/3] [U_U__]
```

One disk had failed a week before, the alert went to an unmonitored mailbox, and the rebuild began only after a second disk showed errors. With two members gone the array stopped. The team restored from last night's backup and rebuilt the array as RAID 6 with working alerts. RAID kept the first failure harmless; nothing in the design covered a second one that nobody knew about.

```wrongpath
@goal RAID 5 on large disks is cheap redundancy, so use it everywhere.
@wrong
mdadm --create /dev/md0 --level=5 --raid-devices=6 /dev/sd[b-g]1  # 16 TB disks
@result
(works)
# a disk fails, rebuild takes 3 days
second disk reports read errors during rebuild
md0: array failed
@why With very large disks the rebuild takes days, and during that time a second failure or an unreadable sector loses the array. Redundancy is only as good as the rebuild window.
@right
mdadm --create /dev/md0 --level=6 --raid-devices=6 /dev/sd[b-g]1
# and tested backups
mdadm --detail /dev/md0
@after Use RAID 6 or mirrors for big disks, monitor rebuilds, and keep backups because RAID is not a backup.
```

## Common mistakes

- Treating RAID as a backup
- Extending an LV and forgetting to grow the filesystem
- No alert on a degraded array
- RAID 5 on very large disks with no spare

```quiz
Q: What does lvextend -r do?
+ Grows the logical volume and its filesystem together
- Removes the volume :: No.
- Replaces a disk :: No.
- Creates a snapshot :: No.
> Without -r the filesystem stays the old size.

Q: Which RAID level survives two disk failures?
+ RAID 6
- RAID 0 :: It survives none.
- RAID 1 with two disks :: It survives one.
- RAID 5 :: It survives one.
> RAID 6 keeps two parity blocks per stripe, so any two disks can fail without losing data.

Q: Why is RAID not a backup?
+ It does not protect against deletion, corruption or site loss
- It is too slow :: Not the reason.
- It needs a licence :: No.
- It cannot be mounted :: It can.
> A deleted file is deleted on every mirror.

Q: What does [U_] in /proc/mdstat show?
+ One member of a two-disk mirror is missing
- The array is faster :: No.
- The array is encrypted :: No.
- The array is empty :: No.
> The array is degraded but still working.
```

```cards
PV :: disk or partition given to LVM
VG :: pool made of physical volumes
LV :: slice of a pool, formatted and mounted
RAID 1 :: mirror of two disks
RAID 6 :: double parity, two failures
Degraded :: array running with a missing disk
```
