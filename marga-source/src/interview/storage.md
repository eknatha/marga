## What is the difference between block, file and object storage?
level: junior
Block storage gives raw volumes that a host formats and mounts, such as a disk or SAN volume. File storage shares a directory tree over a network, such as NFS or SMB. Object storage keeps objects with metadata behind an HTTP API, with no directories and no in-place edits. I choose by access pattern: databases want block, shared files want file, large unstructured data wants object.

## df shows free space but writes fail. What could be wrong?
level: junior
The filesystem may be out of inodes, which df -i shows. It may be mounted read-only after an error, or a quota may apply. A process may be writing to a deleted file that still holds space. I check df -i, mount options, quotas and lsof for deleted files before touching anything.

## Why use LVM?
level: junior
LVM puts a flexible layer between disks and filesystems, so I can grow volumes, add disks, move data between disks and take snapshots without repartitioning. It does not add redundancy by itself. I pair it with RAID or storage-level redundancy and remember that shrinking depends on the filesystem, since XFS cannot shrink.

## How do you grow a filesystem on LVM without downtime?
level: mid
I extend the logical volume with lvextend, ideally with the resize option, then grow the filesystem: resize2fs for ext4 or xfs_growfs for XFS, both online. I check that the volume group has free extents first, confirm with lsblk and df, and keep a backup because any storage change carries risk.

## What are the trade-offs between RAID levels?
level: mid
RAID 1 mirrors for safety at half the capacity. RAID 5 and 6 spread parity for capacity but have a write penalty and long rebuilds. RAID 10 gives good performance and resilience at a cost in space. RAID protects against disk failure, not deletion or corruption, so it never replaces backups. Rebuild time and a second failure during it drive my choice.

## How would you design storage for a database that must survive failure and recover quickly?
level: senior
I separate data, logs and backups on appropriate devices, use redundancy at the storage or replication layer, and size for IOPS and latency, not only capacity. I plan snapshots plus offsite backups with a tested restore time, monitor latency and queue depth, and rehearse failover. I state the recovery point and time targets first, then choose technology to meet them.
