---
title: Performance, backups and troubleshooting
minutes: 15
summary: Find why a disk is slow or full, understand df versus du, and design backups that you have actually restored.
---

Storage faults come in a few shapes: the disk is full, the disk is slow, the disk is gone. This lesson gives you a method for each and ends with the part that matters most: backups you have tested.

## What you will learn

- Reading iostat and iowait
- Finding what fills a disk, including deleted files that are still open
- Backup types, the 3-2-1 rule, and restore tests
- A short troubleshooting order

## A slow disk

```console
$ iostat -x 2 2
Device   r/s    w/s   rkB/s   wkB/s  await  aqu-sz  %util
sda      12.0  480.0  96.0   30720.0  85.3   41.2   100.0
$ top -bn1 | grep Cpu
%Cpu(s):  3.0 us,  2.0 sy,  0.0 ni, 12.0 id, 83.0 wa
```

- **await** is the average wait per request in milliseconds. High await with high `%util` means the device is saturated.
- **aqu-sz** (queue size) shows how many requests are waiting.
- **iowait** (`wa`) is CPU time spent idle while waiting for disk. A CPU that is 83 percent iowait is not busy; it is waiting.

Next, find who is doing the I/O: `iotop` or `pidstat -d 2` name the process. Then decide whether to slow the writer, move it, or move to faster storage.

## A full disk

```console
$ df -h /var
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3        50G   50G     0 100% /var
$ sudo du -xh /var --max-depth=2 | sort -h | tail -4
1.2G    /var/lib
2.5G    /var/cache
4.1G    /var/log/app
8.0G    /var/log
```

`du` adds up the files it can see, `df` reports what the filesystem has allocated. Here `du` finds only 8 GB of 50 GB. The difference is often **a deleted file that a process still holds open**. The name is gone, so `du` does not see it, but the space is not freed until the process closes it.

```console
$ sudo lsof +L1 | head -3
COMMAND  PID USER  FD  TYPE  SIZE/OFF NLINK NAME
java    1822 app   7w  REG   40G       0     /var/log/app/old.log (deleted)
```

`NLINK 0` and `(deleted)` identify the culprit. Restarting the process frees the space. If you cannot restart it, truncating through the file descriptor (`: > /proc/1822/fd/7`) frees the space without a restart, but know what you are discarding. The lasting fix is log rotation that signals the program to reopen its log.

Also check inodes with `df -i`, and file systems mounted over a directory that hides files beneath it.

## Backups

- A **full** backup copies everything. An **incremental** copies changes since the last backup of any kind, and a **differential** copies changes since the last full one.
- **3-2-1 rule**: three copies, on two kinds of media, one off-site.
- **Snapshots** are fast and local; they complement backups but do not replace them.
- **Immutable** or write-once backups protect against ransomware that deletes the backups it can reach.
- Define **RPO** (how much data you can lose) and **RTO** (how long you can be down). They set how often you back up and how fast you must restore.

A backup you have not restored is a hope. Schedule a restore test, restore to a scratch machine, and check that the application starts and data looks right.

## Troubleshooting order

1. Is the device present and healthy? `lsblk`, `dmesg`, SMART data.
2. Is it mounted as expected? `findmnt`, `mount`.
3. Is there space and are there inodes? `df -h`, `df -i`.
4. Is it slow? `iostat -x`, then find the process.
5. Is a network dependency hanging? Look for `D` state processes on NFS mounts.

## Incident: The log that ate the disk

> **Incident:** A disk alert fired at 100 percent, but the team could not find the files using the space.

```console
$ sudo du -sh /var/log
3.4G    /var/log
$ df -h /var/log
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda3        50G   50G     0 100% /var/log
$ sudo lsof +L1 | grep deleted
java  1822 app  7w  REG  44G  0  /var/log/app/app.log (deleted)
```

A logrotate job had removed `app.log` while the Java process kept writing to it. The 44 GB file had no name but still took the space. Restarting the service released the space and a `copytruncate` option was added to the rotation. The team had spent an hour looking for files that no longer existed by name.

## Common mistakes

- Trusting `du` alone when `df` disagrees
- Deleting random files to free space instead of finding the cause
- Backups with no restore test, or stored on the same disk
- Reading iowait as CPU load

```quiz
Q: df shows 100 percent used but du finds only a small total. What is a likely cause?
+ A deleted file still held open by a process
- The disk is broken :: Not the usual reason.
- du counts compressed files :: No.
- The CPU is slow :: No.
> lsof +L1 shows deleted files that are still open.

Q: What does high iowait mean?
+ The CPU is idle while waiting for disk requests
- The CPU is overheating :: No.
- The network is down :: No.
- The disk is empty :: No.
> The system is waiting on storage.

Q: What does the 3-2-1 backup rule say?
+ Three copies, on two kinds of media, one off-site
- Three disks, two RAID levels, one spare :: No.
- Three snapshots a day :: No.
- Two copies in one rack :: No.
> It limits shared failure.

Q: Why test restores?
+ A backup that has not been restored is unproven
- To make backups faster :: No.
- To use less space :: No.
- Because the law requires it everywhere :: Not the reason.
> Restore tests find broken backups early.
```

```cards
await :: average wait per I/O in milliseconds
iowait :: CPU idle time spent waiting for disk
lsof +L1 :: lists deleted files still open
RPO :: how much data loss is acceptable
RTO :: how long recovery may take
3-2-1 :: three copies, two media, one off-site
```
