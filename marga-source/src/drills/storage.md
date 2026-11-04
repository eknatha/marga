## Out of inodes
level: mid
Creating files fails although df -h shows free space.

```text
$ df -h /var/spool
/dev/sdb1  100G  42G  58G  42% /var/spool
$ df -i /var/spool
/dev/sdb1  6553600 6553600 0 100% /var/spool
```
? What is the cause?
+ The filesystem has run out of inodes, usually from very many small files
- The disk is failing
- The mount is read-only
- The block size is too small
why: Every file needs an inode. Delete or consolidate small files, or recreate the filesystem with more inodes.

## XFS will not shrink
level: mid
You try to shrink a volume with an XFS filesystem to free space.

```text
$ lvreduce -L 20G /dev/vg0/data
WARNING: Reducing active logical volume to 20 GiB.
$ xfs_growfs --help | head -2
$ xfs_info /data | head -2
```
? What should you know before you run it?
+ XFS cannot be shrunk; you would need to back up, recreate and restore, and reducing the LV first destroys data
- XFS shrinks online with resize2fs
- Reducing the LV is always safe
- XFS needs no backup
why: XFS can only grow. Reducing the logical volume under it corrupts the filesystem.

## Disk is slow
level: mid
Database queries are slow. CPU is idle.

```text
$ iostat -x 1 2 | tail -4
Device   r/s  w/s  r_await w_await aqu-sz %util
sda      80   900   2.1     48.5   31.2   99.8
```
? What does this indicate?
+ The disk is saturated: high utilisation, long queue and high write latency
- The network is slow
- The CPU is the bottleneck
- The filesystem is corrupt
why: %util near 100 with a long queue and w_await of tens of milliseconds means the device cannot keep up with writes.

## NFS hangs
level: senior
Processes in D state hang after an NFS server was restarted.

```text
$ ps -eo pid,stat,cmd | grep ' D' | head -2
 2310 D   tar czf /backup/a.tgz /mnt/nfs/data
$ mount | grep nfs
server:/export on /mnt/nfs type nfs4 (rw,hard,...)
```
? Why do the processes hang?
+ A hard mount keeps retrying forever while the server is unreachable
- The client has too much memory
- tar has a bug
- The export is encrypted
why: A hard mount blocks until the server returns, which protects data but can hang processes. Fix the server or use soft or timeout options only where acceptable.

## RAID degraded
level: mid
A mirror reports a failed disk.

```text
$ cat /proc/mdstat
md0 : active raid1 sdb1[1] sda1[0](F)
      488254464 blocks [2/1] [_U]
```
? What do you do next?
+ Replace the failed disk, add it to the array and watch the rebuild, after checking backups
- Ignore it because RAID 1 cannot fail
- Remove the good disk
- Reformat the array
why: The array runs on one disk. Rebuild promptly and check backups, because a second failure loses data.

