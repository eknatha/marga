---
title: Storage and filesystems
summary: Disks, filesystems, LVM, RAID, network storage and the commands that explain a full, slow or missing volume.
module: storage
---

## See what is there

```bash
lsblk -f
blkid
df -hT
df -i
findmnt
mount | column -t
du -xh --max-depth=1 /var | sort -h | tail
```

> **Warning:** `df` and `du` can disagree. A deleted file that a process still holds open uses space until it closes.

```bash
lsof +L1
```

## Filesystems

```bash
mkfs.ext4 /dev/sdb1
mkfs.xfs /dev/sdb1
mount /dev/sdb1 /data
umount /data
tune2fs -l /dev/sdb1 | head
xfs_info /data
fsck -n /dev/sdb1     # check, no changes
```

fstab line:

```text
UUID=7c1d...  /data  xfs  defaults,nofail  0  0
```

Test with `mount -a` before you reboot.

## LVM

```bash
pvs; vgs; lvs
pvcreate /dev/sdc
vgextend vg0 /dev/sdc
lvextend -r -L +20G /dev/vg0/data   # -r grows the filesystem too
resize2fs /dev/vg0/data             # ext4
xfs_growfs /data                    # XFS, takes the mount point
```

XFS can grow but not shrink.

## RAID

```bash
cat /proc/mdstat
mdadm --detail /dev/md0
mdadm /dev/md0 --add /dev/sdd1
```

## Performance

```bash
iostat -x 1
iotop -o
vmstat 1
```

Watch `%util`, `await` and queue size, not only throughput.

## Network storage

```bash
showmount -e server
mount -t nfs4 server:/export /mnt
nfsstat -m
iscsiadm -m session
ceph status
```

## Quick diagnosis

| Symptom | First look |
|---|---|
| Full but nothing to delete | `df -i`, `lsof +L1` |
| Read-only filesystem | `dmesg`, `mount`, disk errors |
| Slow | `iostat -x`, queue and latency |
| Boot stops after mount change | `journalctl -xb`, fstab UUID, `nofail` |

## Cautions

> **Danger:** `mkfs` and `wipefs` destroy the data on a device. Check the name with `lsblk` and `blkid` every time.

> **Warning:** Shrinking a filesystem or logical volume in the wrong order loses data. XFS cannot shrink at all.

> **Warning:** A wrong line in /etc/fstab can stop boot. Use UUIDs and `nofail`, and run `mount -a` before rebooting.

> **Caution:** RAID is not a backup. A deleted file is deleted on every disk.
