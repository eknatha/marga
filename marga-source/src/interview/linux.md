## What is the difference between a hard link and a symbolic link?
level: junior
A **hard link** is another directory entry pointing to the same inode, so both names are equal and the data survives until the last link is removed. It cannot cross filesystems or point to directories. A **symbolic link** is a small file containing a path to another name. It can cross filesystems and point to directories, but it breaks if the target is moved or deleted. Check with `ls -li` (inode numbers) and `readlink -f`.

## Explain Linux file permissions and what chmod 750 means.
level: junior
Each file has read (4), write (2) and execute (1) bits for the owner, the group and everyone else. `750` means the owner has 7 (read, write, execute), the group has 5 (read, execute) and others have 0. On a directory, execute means permission to enter and access names inside it. Special bits add setuid, setgid and the sticky bit, which stops users deleting each other's files in a shared directory such as `/tmp`.

## A server is slow. How do you triage it?
level: mid
Start with load and the four resources: CPU, memory, disk and network. Use `uptime` and `top` for load and the top processes, `vmstat 1` for run queue, swapping and I/O wait, `iostat -x 1` for disk utilisation and latency, `free -m` for memory, and `ss -s` or `sar -n DEV` for network. Decide whether the machine is CPU bound, memory bound (swap, OOM kills), I/O bound (high `%iowait`) or waiting on something else, then follow the evidence to the process and the recent change.

## What is the difference between a process and a thread, and what is a zombie process?
level: mid
A process has its own address space and resources. Threads are scheduled units inside a process that share its memory. A **zombie** is a process that has exited but whose parent has not yet read its exit status with `wait()`, so its entry stays in the process table. It uses no CPU or memory, but many zombies indicate a bug in the parent. You cannot kill a zombie; you fix or restart the parent, after which `init` adopts and reaps it.

## How do you find which process is using a port, and why is a disk full when df and du disagree?
level: mid
For a port use `ss -tlnp | grep :8080` or `lsof -i :8080`. When `df` shows a full disk but `du` cannot account for the space, a deleted file is usually still held open by a running process. Find it with `lsof +L1`, then restart the process or truncate the file through `/proc/PID/fd/N`. Other causes are inode exhaustion (`df -i`) and hidden mounts that cover large files underneath a mount point.

## How does systemd differ from the older init systems, and how do you debug a failing service?
level: mid
systemd starts services in parallel using dependency declarations, supervises them, manages cgroups, logs through the journal and supports timers and sockets. To debug a failing unit run `systemctl status NAME`, then `journalctl -u NAME -b --no-pager`, check the unit with `systemctl cat NAME` and `systemd-analyze verify`, and look at `ExecStart` paths, the user, environment and dependencies. After editing a unit run `systemctl daemon-reload`.

## Explain LVM and when you would use it instead of plain partitions.
level: mid
LVM adds a layer between disks and filesystems: physical volumes are pooled into a volume group, from which logical volumes are carved. It lets you grow filesystems online, spread a volume over several disks, take snapshots and move data between disks without downtime. Use it where storage needs change, such as `/var` or application data. RAID is separate and protects against disk failure; LVM alone does not.

## A server will not boot after a change to /etc/fstab. What do you do?
level: senior
The system usually drops to an emergency shell because systemd waits for a mount that fails. Remount root read-write with `mount -o remount,rw /`, read `journalctl -xb` to see which mount failed, fix the entry (check UUIDs with `blkid`, add `nofail` for non-critical mounts) and test with `mount -a` before rebooting. If you have no shell, boot a rescue image or detach the volume in the cloud and fix it from another instance. Prevent it by always running `mount -a` after editing and rebooting staging first.
