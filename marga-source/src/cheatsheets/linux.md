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

## Text and data tools

```bash
grep -rn --include='*.conf' 'listen' /etc/nginx
grep -c 'ERROR' app.log
grep -v '^#' /etc/ssh/sshd_config | sed '/^$/d'
awk -F: '$3 >= 1000 {print $1, $3}' /etc/passwd
awk '{s+=$NF} END {print s}' sizes.txt
sed -n '20,40p' file.txt
sed 's/old/new/g' file.txt
cut -d, -f1,3 data.csv
sort data.txt | uniq -c | sort -rn | head
tr -s ' ' < file.txt
wc -l *.log
diff -u old.conf new.conf
xargs -a hosts.txt -P4 -I{} ping -c1 {}
tee -a out.log < input.txt
```

> **Danger:** `sed -i` edits the file in place with no undo. Keep a copy first: `sed -i.bak 's/a/b/' file`. A mistyped `xargs` with `rm` can delete the wrong files, so run it with `echo` first.

## Archives and transfer

```bash
tar -czf backup.tar.gz /srv/app
tar -tzf backup.tar.gz | head
tar -xzf backup.tar.gz -C /restore
zip -r site.zip site/
unzip -l site.zip
rsync -avh --dry-run src/ user@host:/dst/
rsync -avh --delete src/ user@host:/dst/
scp file.txt user@host:/tmp/
curl -fsSLO https://example.com/file.tgz
sha256sum file.tgz
```

> **Danger:** `rsync --delete` removes files at the destination that are missing from the source. Always run it with `--dry-run` first, and mind the trailing slash on the source: `src/` copies the contents, `src` copies the folder.

> **Warning:** `tar -xzf` can overwrite existing files. Extract into an empty folder with `-C`.

## Permissions and ownership, more

```bash
stat -c '%a %U:%G %n' /etc/passwd
chmod u+x script.sh
chmod -R g+rX /srv/shared
chown -R app:app /srv/app
setfacl -m u:alice:rx /srv/data
getfacl /srv/data
umask
sudo -l
lsattr file
chattr +i /etc/important.conf
```

> **Warning:** `chmod -R 777` and `chown -R` on a wrong path (for example `/` or `/etc`) can break the system. Check the path with `ls` first. Never use 777 as a fix for "permission denied".

> **Warning:** `chattr +i` makes a file immutable, even for root. Remember it before you wonder why edits fail.

## Network checks on a host

```bash
ip -br addr
ip route
ss -tulpn
ss -s
ping -c3 1.1.1.1
dig +short example.com
curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' https://example.com
traceroute -n example.com
nc -zv host 443
sudo tcpdump -i eth0 -nn port 53 -c 20
```

> **Warning:** `tcpdump` on a busy host can fill the disk and add load. Always limit it with `-c`, a filter and a time limit, and do not capture personal data you are not allowed to keep.

## Cautions for risky commands

> **Danger:** `rm -rf` has no recycle bin. Never run it with an unquoted variable such as `rm -rf $DIR/*`: if `DIR` is empty it becomes `rm -rf /*`. Use `rm -rf -- "${DIR:?}"/`.

> **Warning:** `dd of=/dev/sdX` overwrites a disk with no confirmation. Confirm the device with `lsblk` and read the command twice.

> **Danger:** `mkfs`, `fdisk` and `parted` on a mounted or wrong disk destroy data. Check `lsblk -f` and `findmnt` first.

> **Warning:** `kill -9` gives a process no chance to clean up. Try `kill` (SIGTERM) first and wait.

> **Warning:** `reboot`, `shutdown` and `init 0` over SSH on a remote server can leave you locked out. Confirm that you are on the right host with `hostname`.

> **Warning:** Editing `/etc/fstab`, `/etc/sudoers` or `sshd_config` with a mistake can stop boot or lock you out. Use `visudo`, keep a second session open, and test with `sshd -t` before you reload.

> **Warning:** `iptables -F` and changing the default policy over SSH can cut your own connection. Use a timed rollback such as `at now + 5 minutes`.
