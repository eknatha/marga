---
title: Filesystems, the page cache and I/O
minutes: 14
summary: Follow a read and a write through the VFS and page cache, understand writeback and fsync, and diagnose slow disks with iostat.
---

Disk behaviour confuses many engineers because the kernel sits in between. A write that returns immediately has not necessarily reached the disk. A read may never touch the disk at all. Understanding the virtual file system, the page cache and writeback explains why databases insist on fsync, why a copy seems instant then stalls, and how to tell a slow disk from a slow application.

## What you will learn

- VFS and what happens on read and write
- Dirty pages, writeback and fsync
- Read iostat and find the saturated device
- Common filesystem limits: inodes, descriptors, mount options

## The path of a read and a write

Programs call `read` and `write` on a file descriptor. The **VFS** (virtual file system) layer gives all filesystems (ext4, XFS, overlayfs, NFS) the same interface. Reads are served from the **page cache** if the data is there; otherwise the kernel reads blocks from the device and caches them. Writes go into the cache as **dirty pages** and return at once; the kernel writes them to the device later (**writeback**). That is fast, but data in dirty pages is lost if power fails before writeback.

## fsync and durability

```bash
sync                                   # flush all dirty data now
grep -E "Dirty|Writeback" /proc/meminfo
sysctl vm.dirty_ratio vm.dirty_background_ratio
```

Applications that must not lose data call `fsync` (or open files with `O_SYNC`) so the kernel writes the file to stable storage before returning. Databases and message queues do this for their logs, which is why their speed depends on disk latency. If too much dirty data builds up, the kernel makes writers wait (`vm.dirty_ratio`), and you see long pauses during large copies. Filesystems also keep a journal so that metadata is consistent after a crash; a journal is not a backup.

## Finding a slow disk

```bash
iostat -xz 1 3
Device  r/s   w/s  rkB/s  wkB/s  await  aqu-sz  %util
nvme0n1 120  3400  4800  98000   1.2    4.1    62
sda      15    80   400   2200  85.0    7.5    99
```

Columns to watch: `await` (average time per request including queueing, in ms), `aqu-sz` (queue length) and `%util` (how busy the device is; on SSDs and arrays near 100 percent does not always mean saturation, but high await does). In the example, `sda` has an average wait of 85 ms and is nearly fully busy: it is the bottleneck. Find the process responsible with `iotop -oa` or `pidstat -d 1`, and check high `wa` (I/O wait) in `vmstat` or `top`.

## Limits that surprise people

- **Inodes**: `df -i` shows inode use; millions of tiny files can exhaust inodes while `df -h` shows free space.
- **Open files**: `ulimit -n` and `/proc/PID/limits` limit descriptors per process; `Too many open files` errors point here.
- **Mount options**: `noatime` reduces metadata writes; `ro` after errors means the filesystem was remounted read-only, so check `dmesg` for I/O errors.
- **Full volumes**: logs and container layers fill disks; `du -xh --max-depth=1 /var | sort -h` finds the biggest directories.
- **Network filesystems**: a stuck NFS server leaves processes in uninterruptible sleep (state `D`) that cannot be killed.

```predict
Q: A process is in state D and cannot be killed. What is the likely situation?
???
It is waiting in the kernel for I/O, often on a failing disk or an unreachable network filesystem. Fix the underlying device or mount; killing signals cannot interrupt it.
> D means uninterruptible sleep.
```

## Incident: The log disk that went read-only

> **Incident:** An application started failing with errors writing to its log directory, although df showed free space.

```console
$ touch /var/log/app/test
touch: cannot touch '/var/log/app/test': Read-only file system
$ dmesg -T | tail -3
[Wed Jan  7 03:11:09 2026] EXT4-fs error (device sdb1): ext4_find_entry: reading directory lblock 0
[Wed Jan  7 03:11:09 2026] EXT4-fs (sdb1): Remounting filesystem read-only
```

The kernel remounted the filesystem read-only after I/O errors from the failing disk, to protect data. The team moved the service to a healthy volume, replaced the disk, ran fsck on the unmounted filesystem, and added an alert on disk errors in the kernel log.

## Common mistakes

- Assuming a successful write is on disk
- Using %util alone to judge SSDs
- Ignoring inode exhaustion
- Trying to kill processes stuck on a dead network mount

```quiz
Q: What does a write usually do before returning?
+ Puts data in the page cache as dirty pages
- Writes to disk and waits always :: Not by default.
- Copies to tape :: No.
- Does nothing :: No.
> Writeback happens later; the lesson section explains why.

Q: What makes sure data reaches stable storage?
+ fsync
- sync_all_later :: Not a call.
- cat :: Reads files.
- touch :: Creates files.
> Databases use it for logs.

Q: Which iostat column shows average request latency?
+ await
- rkB/s :: Throughput.
- r/s :: Reads per second.
- %idle :: Not an iostat latency.
> Includes queue time; the lesson section explains why.

Q: df -h shows free space but file creation fails. What else do you check?
+ Inode usage with df -i
- ping :: Network.
- uname :: Version.
- who :: Users.
> Inodes can run out; the lesson section explains why.
```

```cards
Dirty data :: grep -E "Dirty|Writeback" /proc/meminfo
Flush :: sync
Disk latency :: iostat -xz 1
Who uses I/O :: iotop -oa / pidstat -d 1
Inodes :: df -i
Read-only fs :: check dmesg for I/O errors
```
