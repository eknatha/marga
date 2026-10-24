---
title: Linux
summary: Files, permissions, processes, disks, logs and performance commands you reach for daily.
module: linux
---

## Navigate and inspect

| Command | What it does |
|---------|--------------|
| `pwd` | Print the current directory |
| `ls -lah` | Long list, hidden files, human sizes |
| `cd -` | Return to the previous directory |
| `tree -L 2` | Show a directory tree two levels deep |
| `stat file` | Size, owner, permissions and timestamps |
| `file name` | Detect the type of a file |
| `du -sh * \| sort -h` | Size of each item here, smallest to largest |

## Find

```bash
find /var/log -type f -mtime -1 -size +1M   # modified in the last day, larger than 1 MB
find . -name "*.conf" -not -path "./tmp/*"  # by name, excluding a path
grep -rn "error" /etc/nginx                  # search file contents recursively
type -a python3                              # which executable runs
```

## Copy, move, link

```bash
cp -a src/ dst/              # copy keeping permissions and links
mv old new                   # rename or move
ln -sfn target linkname      # replace a symlink to a directory safely
readlink -f linkname         # resolve the final path
```

## Users and permissions

| Command | What it does |
|---------|--------------|
| `id` | Your user, group IDs and groups |
| `sudo -l` | What you may run with sudo |
| `chmod 640 file` | Owner read/write, group read, others nothing |
| `chmod u+x script.sh` | Add execute for the owner |
| `chown app:app file` | Change owner and group |
| `umask` | Default permission mask for new files |

Permission digits: read = 4, write = 2, execute = 1. Add them per class (owner, group, others), so `755` is `rwxr-xr-x`.

```bash
useradd -m -s /bin/bash deploy        # create a user with a home directory
usermod -aG docker deploy             # add to a group (keep existing ones)
passwd -l olduser                     # lock an account
getent passwd deploy                  # look up through all name sources
```

## Processes and services

```bash
ps aux --sort=-%mem | head            # top memory users
ps -eo pid,ppid,stat,cmd | grep defunct   # find zombies
top -o %CPU                           # live view sorted by CPU
kill -TERM 1234                       # polite stop
kill -KILL 1234                       # last resort, cannot be caught
pgrep -af nginx                       # find by name with full command
```

```bash
systemctl status nginx                # state and recent log lines
systemctl enable --now nginx          # start now and at boot
systemctl restart nginx
systemctl list-units --failed         # everything that failed
systemctl daemon-reload               # after editing a unit file
```

## Disks and filesystems

```bash
df -hT                                # space per filesystem with type
df -i                                 # inode usage (full inodes also stop writes)
lsblk -f                              # block devices and filesystems
findmnt /data                         # where and how a path is mounted
du -xh / --max-depth=1 2>/dev/null | sort -h | tail
lsof +L1                              # deleted files still held open
```

## Logs

```bash
journalctl -u nginx --since "1 hour ago"
journalctl -p err -b                  # errors since boot
journalctl -f -u myapp                # follow live
tail -f /var/log/syslog
dmesg -T | tail                       # kernel messages with readable time
```

## Performance triage (60 seconds)

```bash
uptime                                # load averages
vmstat 1 5                            # run queue, swap, I/O wait
free -h                               # memory and swap
iostat -xz 1 3                        # disk utilization and latency
ss -s                                 # socket summary
sar -n DEV 1 3                        # network throughput per interface
```

| Symptom | Look at |
|---------|---------|
| Load high, CPU idle | I/O wait (`vmstat`, `iostat`) |
| Memory full, swap busy | `ps aux --sort=-%mem`, OOM messages in `dmesg` |
| "No space left" but `df -h` fine | `df -i` for inodes |
| Disk full after deleting | `lsof +L1` for open deleted files |
| Service flapping | `journalctl -u NAME`, `systemctl status NAME` |
