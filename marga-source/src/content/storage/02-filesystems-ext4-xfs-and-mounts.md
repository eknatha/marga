---
title: Filesystems, mounts and fstab
minutes: 14
summary: Compare ext4, XFS and others, mount a disk safely, and avoid the fstab mistakes that stop a server from booting.
---

A filesystem turns a block device into folders and files. Picking one is a smaller choice than most people expect, but mounting it correctly matters a great deal.

## What you will learn

- ext4, XFS, btrfs and ZFS in a few sentences each
- Inodes, journals and why a disk can be full with space free
- Mounting by UUID and writing a safe fstab line
- What to do when a filesystem needs repair

## Common filesystems

- **ext4**: the long-time Linux default. Stable, well understood, can grow and, with care, shrink.
- **XFS**: strong with large files and many parallel writes, the default on Red Hat family systems. It can grow while mounted but cannot shrink.
- **btrfs**: copy-on-write with snapshots and checksums, used by some distributions.
- **ZFS**: combines volume management and filesystem, with checksums, snapshots and replication. Its licence keeps it outside the main Linux kernel.

Pick what your distribution supports and your team knows. Most production trouble comes from full disks and bad mounts, not from the choice between ext4 and XFS.

## Inodes and journals

An **inode** holds a file's metadata: owner, permissions, size and where its data blocks are. A filesystem has a fixed number of inodes on ext4. A disk with millions of tiny files can run out of inodes while plenty of bytes are free, and every write fails with "No space left on device".

```console
$ df -h /var
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdb1       200G   61G  129G  32% /var
$ df -i /var
Filesystem      Inodes   IUsed IFree IUse% Mounted on
/dev/sdb1     13107200 13107200     0  100% /var
```

A **journal** records changes before making them, so after a crash the filesystem replays the journal instead of checking everything.

## Mounting

```console
$ blkid /dev/sdb1
/dev/sdb1: UUID="3f1c0d7e-8a42-4b9b-9c11-2e6a5d0f1a77" TYPE="ext4"
$ sudo mkdir -p /data
$ sudo mount /dev/sdb1 /data
$ findmnt /data
TARGET SOURCE    FSTYPE OPTIONS
/data  /dev/sdb1 ext4   rw,relatime
```

Device names such as `/dev/sdb1` can change between boots. In `/etc/fstab`, refer to the disk by **UUID**:

```text
UUID=3f1c0d7e-8a42-4b9b-9c11-2e6a5d0f1a77  /data  ext4  defaults,nofail  0  2
```

The six fields are device, mount point, type, options, dump (leave 0) and fsck order. `nofail` lets the server boot even if the disk is missing. Without it, a missing data disk can drop the machine into emergency mode. After editing fstab, always run `sudo mount -a`: it mounts everything in the file and shows an error now, not at the next reboot.

## Repair

An unclean shutdown usually needs only a journal replay. When `fsck` is needed, run it on an unmounted filesystem and read what it will change first. Never run it on a mounted disk. For a disk with hardware errors, copy what you can with a tool such as `ddrescue` before repairing.

## Incident: The server that did not come back

> **Incident:** After a routine reboot a server stayed in emergency mode and the team had no console access plan.

```console
[ TIME ] Timed out waiting for device /dev/disk/by-uuid/3f1c0d7e-8a42-4b9b-9c11-2e6a5d0f1a7.
[DEPEND] Dependency failed for /data.
You are in emergency mode.
```

Someone had retyped a UUID into fstab and dropped the last character, and the line had no `nofail`. The system waited for a device that did not exist. Fixing the UUID in `/etc/fstab` from the emergency shell and rebooting restored service. The team now copies UUIDs from `blkid`, adds `nofail` for data disks, and runs `mount -a` before leaving the server.

```wrongpath
@goal Mount a new disk by its device name in fstab.
@wrong
/dev/sdb1  /data  ext4  defaults  0 2
@result
(works)
# after adding another disk, names shift
mount: /data: wrong fs type, bad option, bad superblock on /dev/sdb1
@why Device names depend on detection order and can change at reboot. The wrong disk may be mounted or the boot may stop.
@right
blkid /dev/sdb1
UUID=7f1c2a9e-0d3a-4c1e-9f55-1d6b2a0a77c1  /data  ext4  defaults,nofail  0 2
mount -a
@after Use the UUID, add nofail for non-critical mounts, and run mount -a before rebooting.
```

## Common mistakes

- Referring to disks by `/dev/sdX` in fstab
- Editing fstab and not testing with `mount -a`
- Looking only at `df -h` and forgetting `df -i`
- Running fsck on a mounted filesystem

```quiz
Q: Why use UUIDs in /etc/fstab?
+ Device names such as /dev/sdb can change between boots
- UUIDs make disks faster :: They do not affect speed.
- UUIDs are shorter :: They are longer.
- The kernel requires them :: It does not.
> UUIDs are stable identifiers.

Q: A disk shows 32 percent used but writes fail with No space left. What should you check?
+ df -i, because the inodes may be used up
- The colour of the LED :: No.
- The CPU temperature :: No.
- Only df -h again :: It shows bytes, not inodes.
> Many tiny files can exhaust inodes.

Q: What does the nofail option do in fstab?
+ Lets the system boot even if that disk is missing
- Disables fsck forever :: No.
- Makes the mount read only :: No.
- Encrypts the mount :: No.
> A missing data disk should not stop boot.

Q: Which command tests an fstab edit without rebooting?
+ sudo mount -a
- sudo fsck -a :: That checks filesystems.
- sudo reboot :: That is the risky test.
- sudo df -a :: That only reports.
> mount -a shows errors immediately.
```

```cards
Filesystem :: gives names and folders to a block device
ext4 :: default Linux filesystem, can shrink offline
XFS :: large-file filesystem, can grow but not shrink
Inode :: metadata record for one file
Journal :: log used to recover after a crash
UUID :: stable identifier for a filesystem
```
