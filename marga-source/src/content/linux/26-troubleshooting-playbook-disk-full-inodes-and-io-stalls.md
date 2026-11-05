---
title: Troubleshooting playbook: disk full, inodes and I/O stalls
minutes: 12
summary: Find what fills a filesystem, including inodes and deleted-but-open files, and read iostat to separate a busy disk from a slow one.
---

A full disk stops databases, breaks logins and silently corrupts nothing but still takes services down. Slow disks cause the opposite symptom: everything works but crawls. Both have short checklists.

## What you will learn

- Find the space hog with `df` and `du`
- Recognize inode exhaustion and deleted files still held open
- Read `iostat` columns: `await`, queue size and `%util`
- Limit the damage of noisy jobs with `ionice` and quotas

## Where did the space go?

```console
$ df -hT
$ df -i
$ sudo du -xh --max-depth=1 /var | sort -h | tail
$ sudo ncdu -x /var
```

Use `df -h` for space and **`df -i` for inodes**. A filesystem can have free blocks but no free inodes when it holds millions of tiny files (mail queues, session files, cache directories). The symptom is `No space left on device` while `df -h` shows space available. The `-x` flag keeps `du` on one filesystem so it does not wander into other mounts.

## Space that du cannot see

If `df` says 100 percent but `du` finds far less, a process may still hold a **deleted file open**. The name is gone, but the blocks stay allocated until the process closes the file.

```console
$ sudo lsof +L1 | head
$ sudo ls -l /proc/2210/fd | grep deleted
$ sudo truncate -s 0 /proc/2210/fd/7
```

Restarting the process releases the space. Truncating through `/proc/PID/fd/N` frees it without a restart. The root fix is proper log rotation that signals or reopens the file (`copytruncate` or a reload hook).

## Slow disks

```console
$ iostat -xz 1 3
Device  r/s  w/s  rkB/s  wkB/s  aqu-sz  await  %util
nvme0n1 120  900  4800   52000  18.4    22.1   98.0
```

`await` is the average time a request waits and is served, in milliseconds. `aqu-sz` is the average queue length. `%util` near 100 on a single spinning disk means saturated, but on modern NVMe or arrays it can reach 100 while still serving more, so judge by `await` and queue length against what is normal for that device. Use `pidstat -d` or `iotop -o` to see which process does the I/O.

## Protect production from heavy jobs

Run backups, compression and index builds with `ionice -c3 nice -n19 command` so they use only idle I/O. Put logs and data on separate filesystems, set quotas for user and cache directories, and alert when a filesystem passes 80 percent or when its growth rate predicts it will fill within a day.

```predict
Q: df -h shows 100 percent used, but du -sh / adds up to half of that. What do you check?
???
Files that were deleted while a process still has them open. Use lsof +L1, then restart or truncate through /proc.
> Deleted-but-open files hold space.
```

## Incident: Full disk with nothing in it

> **Incident:** A database host reported "no space left on device", yet the data directory was only 40 percent of the disk.

```console
$ df -h /var
/dev/sdb1  200G  200G  0  100% /var
$ sudo lsof +L1 | head -3
java  2210  app  7w  REG  8,17  96000000000  0  /var/log/app/debug.log (deleted)
```

Someone had deleted a 90 GB debug log to free space, but the application still had it open and kept writing. The space was not released until the process was restarted. The team restarted it in a quiet window, set log rotation with a size limit and a reload hook, and added a filesystem alert at 80 percent.

## Common mistakes

- Running `du` across mounts and chasing the wrong directory
- Forgetting inodes when space looks free
- Deleting a log that a process still holds open
- Judging an SSD only by `%util` instead of `await` and queue depth

```quiz
Q: A write fails with "No space left on device", but df -h shows free space. What next?
+ Check df -i for inode exhaustion
- Reboot the host :: Does not address the cause.
- Delete /var :: Destructive and unrelated.
- Reinstall the OS :: Far too drastic.
> Inodes can run out before blocks.

Q: How do you find deleted files that are still held open?
+ lsof +L1
- ls -a :: Deleted files do not appear there.
- df -h :: It only shows totals.
- top :: It does not list files.
> The link count is zero while the file is open.

Q: Which iostat column shows how long requests wait and are served?
+ await
- rkB/s :: That is throughput.
- r/s :: That is the request rate.
- tps only :: It is a rate, not a delay.
> await is latency in milliseconds.

Q: How should a heavy backup job run on a busy server?
+ With ionice -c3 and a low nice value so it uses idle I/O
- At the highest priority :: It would starve the service.
- Without any limits :: It can cause a stall.
- On the same disk with no alerts :: Risky.
> Background work must be polite.
```

```cards
df -i :: shows inode usage, not block usage
lsof +L1 :: lists deleted files still open
await :: average I/O wait plus service time in ms
ionice -c3 :: run only when the disk is idle
Log rotation :: must signal or reopen the file
```
