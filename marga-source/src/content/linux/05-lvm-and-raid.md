---
title: LVM and software RAID
minutes: 16
summary: Grow storage without downtime using LVM, protect against disk failure with mdadm RAID, and know which problem each one solves.
---

Partitions are rigid. When /var fills up, a plain partition forces you to back up, repartition and restore. **LVM** (Logical Volume Manager) adds a flexible layer between disks and filesystems, and **software RAID** protects data against disk failure. Production Linux servers commonly use one or both.

## What you will learn

- The LVM layers: physical volumes, volume groups and logical volumes
- Creating, extending and snapshotting a logical volume
- RAID levels and when each is appropriate
- Replacing a failed disk in an mdadm array

## The three LVM layers

Think of LVM as a pool of storage you carve up. A **physical volume (PV)** is a disk or partition handed to LVM. A **volume group (VG)** pools one or more PVs together. A **logical volume (LV)** is a slice of the pool that you format and mount like a partition, but that can later grow or shrink.

```console
$ sudo pvcreate /dev/sdb /dev/sdc
$ sudo vgcreate data_vg /dev/sdb /dev/sdc
$ sudo lvcreate -n logs_lv -L 50G data_vg
$ sudo mkfs.ext4 /dev/data_vg/logs_lv
$ sudo mkdir -p /var/applogs
$ sudo mount /dev/data_vg/logs_lv /var/applogs
$ sudo pvs
$ sudo vgs
$ sudo lvs
```

Add a line to `/etc/fstab` using the device mapper path or the UUID from `blkid` so the volume mounts at boot. Use the `nofail` option for non-critical volumes so a missing disk does not stop the boot.

## Growing a volume online

This is why LVM exists. If the volume group has free space, extend the logical volume and the filesystem in one command:

```console
$ sudo vgs data_vg
$ sudo lvextend -r -L +20G /dev/data_vg/logs_lv
$ df -h /var/applogs
```

The `-r` flag resizes the filesystem too. If the group is full, add a new disk first with `pvcreate` and `vgextend data_vg /dev/sdd`. Growing is safe on a mounted ext4 or XFS filesystem. **Shrinking** is riskier: XFS cannot shrink at all, and ext4 must be unmounted and checked first.

## Snapshots

An LVM snapshot freezes a point-in-time view of a volume using copy-on-write, handy before a risky upgrade or for a consistent backup.

```console
$ sudo lvcreate -s -n logs_snap -L 5G /dev/data_vg/logs_lv
$ sudo mount -o ro /dev/data_vg/logs_snap /mnt/snap
$ sudo umount /mnt/snap && sudo lvremove -y /dev/data_vg/logs_snap
```

Snapshots are not backups. They live on the same disks, and a snapshot that fills its allocated space becomes invalid. Remove them when you are done.

## RAID in one table

| Level | Disks | Survives | Notes |
|-------|-------|----------|-------|
| RAID 0 | 2+ | Nothing | Speed only, any disk failure loses everything |
| RAID 1 | 2 | 1 disk | Mirror, simple and safe |
| RAID 5 | 3+ | 1 disk | Capacity of n-1, slow rebuilds on big disks |
| RAID 6 | 4+ | 2 disks | Safer for large disks |
| RAID 10 | 4+ | 1 per mirror | Fast and resilient, half the capacity |

RAID is about **availability**, not backup. It does not protect against deletion, corruption or ransomware.

```console
$ sudo mdadm --create /dev/md0 --level=1 --raid-devices=2 /dev/sdb /dev/sdc
$ cat /proc/mdstat
$ sudo mdadm --detail /dev/md0
$ sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf
```

## Replacing a failed disk

```console
$ sudo mdadm --manage /dev/md0 --fail /dev/sdc
$ sudo mdadm --manage /dev/md0 --remove /dev/sdc
$ sudo mdadm --manage /dev/md0 --add /dev/sdd
$ watch cat /proc/mdstat
```

The array resynchronises in the background. Until it finishes you have no redundancy, so watch the progress and avoid heavy jobs.

## Incident: /var is full and the disk is not

> **Incident:** The database host stops writing because /var is 100% full. The server has a free 200 GB disk, but /var is a plain partition on a different disk, and the team plans a maintenance window to repartition.

If /var had been an LVM volume, the fix would take a minute. The team can still reduce risk: stop the writer, move the data directory to a new LVM volume built on the free disk, and mount it in place. Going forward, put growth-prone paths such as /var, /var/lib/docker and /data on logical volumes and leave 10 to 20 percent of each volume group unallocated for emergencies.

```console
$ sudo vgs
  VG      #PV #LV #SN Attr   VSize   VFree
  data_vg   2   2   0 wz--n- 400.00g 120.00g
$ sudo lvextend -r -L +50G /dev/data_vg/db_lv
```

## Common mistakes

- Treating RAID as a backup
- Using up all free extents so you cannot extend or snapshot later
- Forgetting to update fstab or mdadm.conf, so volumes vanish after a reboot
- Letting a snapshot fill up and become invalid
- Trying to shrink XFS

```quiz
Q: What is a logical volume?
- A physical disk
+ A slice of a volume group that is formatted and mounted like a partition but can be resized
- A RAID level
- A kind of snapshot
> Logical volumes are carved from the pooled storage of a volume group.

Q: Which command grows a logical volume and its filesystem together?
- lvcreate -r
+ lvextend -r -L +20G
- vgreduce -r
- mkfs -r
> The -r flag resizes the filesystem after extending the volume.

Q: Which statement about RAID is true?
- RAID replaces backups
+ RAID improves availability but does not protect against deletion or corruption
- RAID 0 survives one disk failure
- RAID 1 needs four disks
> A backup protects against mistakes; RAID only keeps running through a disk failure.

Q: Why keep some free space in a volume group?
- LVM refuses to work when full
+ You can extend volumes or take snapshots during an emergency
- It improves read speed
- It is required by fstab
> Free extents are your emergency capacity.
```

```cards
PV, VG, LV? :: Physical volume, volume group (pool), logical volume (slice you mount)
Which filesystem cannot shrink? :: XFS
What does RAID 1 do? :: Mirrors data across two disks so one can fail
Where do you watch a RAID rebuild? :: /proc/mdstat or mdadm --detail
```
