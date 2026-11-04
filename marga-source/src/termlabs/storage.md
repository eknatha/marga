## df says full, du says empty
id: st-deleted-open-file
module: storage
level: Intermediate
minutes: 12
lesson: storage/performance-backups-and-troubleshooting
engine: Simulated Linux shell with LVM tools
summary: A volume is full although the big log was deleted. Find the process that still holds it, release the space and fix the rotation.
@@ story
/var is at 98 percent. Someone deleted the huge application log yesterday, but the space did not come back. Find out why, release the space without rebooting the server, and then fix the log rotation so it cannot happen again.
@@ goals
- Compare df with du for /var.
- Find the deleted file that is still open with lsof +L1.
- Restart the service that holds it and add a postrotate or copytruncate to the logrotate config.
@@ hints
- `df -h /var` and `du -sh /var` disagree. The difference is space held by a deleted file.
- `sudo lsof +L1` lists deleted files that a process still has open, with the PID.
- `sudo systemctl restart app` closes the file. Then edit /etc/logrotate.d/app and add `copytruncate`.
@@ file /opt/app/bin/app mode=755 owner=root
#!/bin/sh
exit 0

@@ file /etc/systemd/system/app.service
[Unit]
Description=App
[Service]
ExecStart=/opt/app/bin/app --log /var/log/app/app.log
User=app
Restart=always

@@ file /var/log/app/other.log
small log

@@ file /etc/logrotate.d/app
/var/log/app/*.log {
  daily
  rotate 7
  compress
}

@@ world
{"disks": [{"fs": "/dev/sdb1", "mount": "/var", "size": "50G", "base": "2G"}], "users": {"app": {}}, "services": {"app": {"unit": "/etc/systemd/system/app.service", "state": "active", "enabled": true, "desc": "App", "port": 8080, "restart": "always", "deleted": [{"path": "/var/log/app/app.log", "size": "46G", "fd": 5}], "http": {"/": {"status": 200, "body": "ok\n"}}}}}
@@ checks
[
 {
  "t": "disk",
  "mount": "/var",
  "below": 30,
  "label": "/var is below 30 percent full"
 },
 {
  "t": "service",
  "name": "app",
  "state": "active",
  "label": "the app service is running"
 },
 {
  "t": "contains",
  "path": "/etc/logrotate.d/app",
  "label": "the rotation config avoids the problem",
  "re": "copytruncate|postrotate"
 }
]
@@ explain
A deleted file keeps its blocks until the last process closes it, so df counts space that du cannot see. lsof +L1 shows these files. Restarting the process, or truncating the file through /proc, releases the space. The lasting fix is in rotation: use copytruncate, or a postrotate that tells the program to reopen its log.
@@ solution
df -h /var
du -sh /var
sudo lsof +L1
sudo systemctl restart app
df -h /var
printf '/var/log/app/*.log {\n  daily\n  rotate 7\n  compress\n  copytruncate\n}\n' | sudo tee /etc/logrotate.d/app


## A wrong UUID would stop the boot
id: st-fstab-uuid
module: storage
level: Intermediate
minutes: 10
lesson: storage/filesystems-ext4-xfs-and-mounts
engine: Simulated Linux shell with configuration files
summary: A new data disk is in fstab with the wrong UUID. Fix it from blkid output and make the mount optional so a bad disk cannot stop boot.
@@ story
You added /data to /etc/fstab before the maintenance window. The UUID was typed by hand. Compare it with the blkid output saved in blkid.txt, correct it, and add nofail so that a missing data disk can never stop the server from booting.
@@ goals
- Compare the UUID in /etc/fstab with the one in blkid.txt.
- Correct the /data line.
- Add nofail to its options.
@@ hints
- `cat blkid.txt` shows the real UUID of /dev/sdb1.
- `grep data /etc/fstab` shows the line you typed. One character is wrong.
- `sudo sed -i 's/7c1b/7c1d/' /etc/fstab`, then add nofail after defaults with another sed.
@@ file /home/user/blkid.txt
/dev/sda1: UUID="11111111-2222-3333-4444-555555555555" TYPE="ext4"
/dev/sdb1: UUID="7c1d9e0a-4b2f-4c55-8a10-3f6e2b9d1a77" TYPE="xfs"

@@ file /etc/fstab
UUID=11111111-2222-3333-4444-555555555555  /      ext4  defaults  0 1
UUID=7c1b9e0a-4b2f-4c55-8a10-3f6e2b9d1a77  /data  xfs   defaults  0 0

@@ world
{"cwd": "/home/user"}
@@ checks
[
 {
  "t": "contains",
  "path": "/etc/fstab",
  "label": "the data line uses the correct UUID",
  "re": "UUID=7c1d9e0a-4b2f-4c55-8a10-3f6e2b9d1a77\\s+/data"
 },
 {
  "t": "contains",
  "path": "/etc/fstab",
  "label": "the old wrong UUID is gone",
  "text": "7c1b9e0a",
  "not": true
 },
 {
  "t": "contains",
  "path": "/etc/fstab",
  "label": "the data mount has nofail",
  "re": "/data\\s+\\S+\\s+\\S*nofail"
 }
]
@@ explain
At boot systemd turns every fstab line into a mount unit. A required mount that cannot be found stops the boot at the emergency prompt. Copy UUIDs from blkid, test with mount -a before you reboot, and mark optional data volumes nofail so a missing disk costs you a mount, not the machine.
@@ solution
cat blkid.txt
grep data /etc/fstab
sudo sed -i 's/7c1b9e0a/7c1d9e0a/' /etc/fstab
sudo sed -i 's#xfs  *defaults #xfs defaults,nofail #' /etc/fstab
grep data /etc/fstab


## The data volume is nearly full
id: st-lvm-extend
module: storage
level: Intermediate
minutes: 10
lesson: storage/lvm-and-raid
engine: Simulated Linux shell with LVM tools
summary: A logical volume is 94 percent full and the volume group has free space. Grow the volume and its filesystem in one step.
@@ story
/data is almost full, and writes will start failing today. The volume group has 100 GB free. Grow the logical volume by 50 GB and the filesystem with it, online and without a reboot.
@@ goals
- Look at the volume group and the logical volume.
- Grow data by 50 GB including the filesystem.
- Bring /data below 70 percent used.
@@ hints
- `sudo vgs` shows free space in the group and `sudo lvs` shows the volumes.
- `lvextend` can grow the filesystem in the same command with -r.
- `sudo lvextend -r -L +50G /dev/vg0/data`, then `df -h /data`.
@@ file /data/orders.db
order data

@@ world
{"disks": [{"fs": "/dev/mapper/vg0-data", "mount": "/data", "size": "50G", "base": "47G"}], "more": {"storage": {"vg": {"name": "vg0", "sizeG": 200, "freeG": 100}, "pvs": [{"dev": "/dev/sdb", "sizeG": 200, "freeG": 100}], "lvs": [{"name": "data", "sizeG": 50, "mount": "/data"}], "devices": [{"name": "sda", "sizeG": 40, "type": "disk"}, {"name": "sdb", "sizeG": 200, "type": "disk"}, {"name": "vg0-data", "sizeG": 50, "type": "lvm", "mount": "/data", "lv": "data", "child": true, "last": true, "fstype": "xfs"}]}}}
@@ checks
[
 {
  "t": "disk",
  "mount": "/data",
  "below": 70,
  "label": "/data is below 70 percent full"
 },
 {
  "t": "cmd",
  "run": "sudo lvs",
  "code": 0,
  "label": "data is 100 GB",
  "out": "data\\s+vg0\\s+\\S+\\s+100G"
 }
]
@@ explain
Logical volumes can grow online while mounted. Growing the volume is only half the job: the filesystem has to grow too, which lvextend -r does by calling resize2fs or xfs_growfs. Check free extents in the group first, confirm with df afterwards, and remember that XFS can grow but never shrink.
@@ solution
sudo vgs
sudo lvs
sudo lvextend -r -L +50G /dev/vg0/data
df -h /data


## Out of inodes on a mail spool
id: st-inode-mkfs
module: storage
level: Intermediate
minutes: 10
lesson: storage/filesystems-ext4-xfs-and-mounts
engine: Simulated Linux shell with configuration files
summary: Change the mkfs plan so a filesystem of tiny files gets enough inodes.
@@ story
The mail spool stores millions of tiny files and ran out of inodes while 60 percent of the blocks were free. Edit the rebuild script to create ext4 with one inode per 4096 bytes.
@@ goals
- Read df-i.txt and rebuild.sh.
- Add the -i 4096 option to mkfs.ext4.
- Keep the device name.
@@ hints
- `cat df-i.txt` shows 100% IUse and 40% free blocks.
- mkfs.ext4 -i sets bytes per inode.
- `sed -i 's#mkfs.ext4 #mkfs.ext4 -i 4096 #' rebuild.sh`
@@ world
{"cwd": "/home/user/storage"}
@@ file /home/user/storage/df-i.txt
Filesystem   Inodes   IUsed IFree IUse% Mounted on
/dev/sdb1  6553600 6553600     0  100% /var/spool/mail

df -h: 60% used

@@ file /home/user/storage/rebuild.sh
#!/bin/sh
umount /var/spool/mail
mkfs.ext4 /dev/sdb1
mount /dev/sdb1 /var/spool/mail

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/storage/rebuild.sh",
  "label": "more inodes per byte",
  "re": "mkfs.ext4\\s+-i\\s+4096"
 },
 {
  "t": "contains",
  "path": "/home/user/storage/rebuild.sh",
  "label": "same device",
  "re": "/dev/sdb1"
 }
]
@@ explain
The inode count is fixed at mkfs. Tiny files use an inode each but almost no blocks, so the default ratio runs out of inodes first. A smaller bytes-per-inode ratio, or XFS which allocates inodes dynamically, avoids it.
@@ solution
cat df-i.txt
cat rebuild.sh
sed -i 's#mkfs.ext4 #mkfs.ext4 -i 4096 #' rebuild.sh
cat rebuild.sh


## An NFS mount that hangs boot
id: st-nfs-fstab
module: storage
level: Intermediate
minutes: 10
lesson: storage/network-storage-nfs-iscsi-and-ceph
engine: Simulated Linux shell with configuration files
summary: Make the NFS line in fstab wait for the network and not block boot.
@@ story
When the NFS server is down, the app server hangs at boot because the share is mounted as a normal local disk. Edit fstab so the mount waits for the network and does not stop boot.
@@ goals
- Read fstab and boot.log.
- Add _netdev and nofail to the options.
- Keep the hard option for safe writes.
@@ hints
- `cat boot.log` shows a wait for nfs01.
- _netdev marks a network mount, nofail lets boot continue.
- `sed -i 's#defaults#hard,_netdev,nofail#' fstab`
@@ world
{"cwd": "/home/user/storage"}
@@ file /home/user/storage/boot.log
Waiting for mnt-shared.mount ... 90s
Timed out waiting for nfs01:/export/shared

@@ file /home/user/storage/fstab
UUID=1a2b-3c /     ext4 defaults 0 1
nfs01:/export/shared /mnt/shared nfs defaults 0 0

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/storage/fstab",
  "label": "the NFS mount is marked as network",
  "re": "nfs.*_netdev"
 },
 {
  "t": "contains",
  "path": "/home/user/storage/fstab",
  "label": "boot can continue without it",
  "re": "nfs.*nofail"
 },
 {
  "t": "contains",
  "path": "/home/user/storage/fstab",
  "label": "hard is kept",
  "re": "nfs.*hard"
 }
]
@@ explain
A network share is not available until the network is, and it may be down for a while. _netdev orders the mount after the network, nofail stops a missing share from blocking boot, and hard makes writes wait rather than fail silently.
@@ solution
cat boot.log
cat fstab
sed -i '/nfs01/ s#defaults#hard,_netdev,nofail#' fstab
cat fstab

