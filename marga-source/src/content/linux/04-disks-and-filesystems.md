---
title: Disks and filesystems
minutes: 15
summary: Measure disk and inode usage, find what is eating space, and diagnose the "disk full but nothing to delete" mystery.
---

At 03:40 your database refuses writes with `No space left on device`. You run `df -h` and the root filesystem is 100% full. You add up the large directories and they total less than half the disk. Somebody has deleted a file that is still using space. This lesson gives you the tools to find it.

## What you will learn

- How block devices, partitions, filesystems and mount points relate
- How to measure space and inodes
- How to find the largest directories quickly
- How a deleted-but-open file keeps consuming space

## From device to directory

A disk appears as a **block device**, such as `/dev/sda` or `/dev/nvme0n1`. You split it into partitions, put a **filesystem** (ext4 or XFS are common) on each, and **mount** it at a directory.

```console
$ lsblk
NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
sda      8:0    0   50G  0 disk
├─sda1   8:1    0   49G  0 part /
└─sda15  8:15   0  1.0G  0 part /boot/efi
sdb      8:16   0  200G  0 disk
└─sdb1   8:17   0  200G  0 part /var/lib/postgresql
```

This is sample output. `lsblk` shows the device tree, and `findmnt` shows what is mounted where. Permanent mounts are listed in `/etc/fstab`.

```bash
# /etc/fstab: device, mount point, type, options, dump, fsck order
UUID=3f5a1c0e-9c1e-4a77-8e0a-0c5d7a1b2c11  /var/lib/postgresql  ext4  defaults,noatime  0  2
```

> **Warning:** A typo in `/etc/fstab` can stop a server from booting. Test new lines with `sudo mount -a` before you reboot, and consider the `nofail` option for non-critical mounts.

## Measuring space

```console
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G   49G     0 100% /
$ df -i /
Filesystem      Inodes   IUsed   IFree IUse% Mounted on
/dev/sda1      3276800  412887 2863913   13% /
```

`df -h` reports blocks used. `df -i` reports **inodes**, the records that describe each file. A filesystem can run out of inodes, for example from millions of tiny files, while having free blocks. Either one produces `No space left on device`.

To find what is large, limit `du` to one filesystem and sort:

```console
$ sudo du -xh --max-depth=1 /var | sort -h | tail -4
312M	/var/cache
1.2G	/var/lib
3.4G	/var/log
5.1G	/var
```

`-x` stays on one filesystem, and `sort -h` understands sizes like `1.2G`. Drill down level by level with the same command.

## Incident: df says full, du disagrees

> **Incident:** `df` reports 49 GB used on `/`, but the largest directories add up to about 12 GB.

Compare the two numbers. `df` asks the filesystem how many blocks are allocated. `du` adds up files it can see. The gap is space held by files that were **deleted while a process still has them open**. The name is gone, but the data stays until the last process closes it. A common cause is deleting a log file instead of rotating it.

```console
$ sudo lsof +L1
COMMAND  PID   USER FD TYPE DEVICE  SIZE/OFF NLINK   NODE NAME
java    1432    app  5w  REG  253,0 37580963840     0 131075 /var/log/app/app.log (deleted)
```

`+L1` lists open files with fewer than one link, meaning deleted. Here process 1432 still holds a 35 GB log. Two ways to recover:

```console
$ sudo systemctl restart app            # preferred: releases the file cleanly
$ sudo sh -c ': > /proc/1432/fd/5'      # truncate in place if you cannot restart yet
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        49G   13G   34G  28% /
```

The fix is half the job. Prevent a repeat by rotating logs with `logrotate` (using `copytruncate` or a reload signal) so nobody has to delete live logs by hand, and alert at 80% disk usage so you act before 100%.

## Creating and growing storage

For a new disk, the sequence is: partition, create a filesystem, mount, persist in `fstab`. Always check the device name twice, because formatting the wrong disk destroys data.

```bash
sudo parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/sdc1
sudo mkdir -p /data && sudo mount /dev/sdc1 /data
sudo blkid /dev/sdc1          # copy the UUID into /etc/fstab
```

Many servers use **LVM** so volumes can grow without repartitioning. Growing is a two-step process: extend the logical volume, then grow the filesystem (for ext4, `resize2fs`).

## Common mistakes

- Looking only at `df -h` and forgetting `df -i`
- Deleting a live log instead of truncating or rotating it
- Running `du` on `/` without `-x`, which crosses into other mounts and `/proc`
- Editing `/etc/fstab` without testing `mount -a`

```quiz
Q: df -h shows plenty of free space but writes fail with "No space left on device". What should you check next?
- The CPU temperature
+ Inode usage with df -i
- The system clock
- The SSH configuration
> A filesystem can run out of inodes even with free blocks. df -i shows inode usage.

Q: What does lsof +L1 list?
- Files larger than 1 GB
- Files owned by user 1
+ Open files that have been deleted, which still hold disk space
- Files modified in the last day
> +L1 selects open files with a link count below one, meaning they have been unlinked but are still in use.

Q: Why use du -x when scanning /var?
- It makes du faster by skipping hidden files
+ It stays on one filesystem and does not cross into other mounts
- It shows inode counts
- It deletes empty directories
> -x restricts du to the starting filesystem, which keeps results accurate when other disks are mounted below it.

Q: What should you do before rebooting after editing /etc/fstab?
- Nothing, the system will repair it
+ Run sudo mount -a to confirm every entry mounts without error
- Remove all other entries
- Format the disk again
> mount -a attempts every entry now, so a mistake appears while you can still fix it.
```

```cards
df vs du? :: df asks the filesystem for allocated space; du adds up the files it can see. A gap suggests deleted-but-open files.
Command to check inode usage? :: df -i
How to list deleted files still held open? :: lsof +L1
Why does /etc/fstab need care? :: A bad entry can stop the server booting; test with mount -a
```
