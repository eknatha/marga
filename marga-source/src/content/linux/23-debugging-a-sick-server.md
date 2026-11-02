---
title: Debugging a sick Linux server
minutes: 16
summary: Use a fixed order of checks (CPU, memory, disk, network, logs) to find why a server is slow or failing, and know which command answers which question.
---

A server is "slow". That word hides a dozen different problems: a runaway process, memory pressure, a full disk, a saturated network link, or a dependency that stopped answering. Guessing wastes time. Experienced engineers walk the same short checklist every time, so that the machine itself tells them where the trouble is.

## What you will learn

- A repeatable order of checks for a sick server
- The one command that answers each question
- How to read load, memory, disk and network numbers without being fooled
- How to attach to a misbehaving process and see what it is doing

## Start with the questions, not the tools

Ask four things, in this order: what changed recently, what do the logs say, which resource is saturated, and which process is responsible. The **USE method** helps with the third: for every resource, check Utilisation, Saturation and Errors.

| Resource | Quick check | Warning sign |
|----------|-------------|--------------|
| CPU | `uptime`, `top` | Load average far above the number of cores |
| Memory | `free -m`, `dmesg -T` | Very little available memory, swap in use, OOM kills |
| Disk space | `df -h` and `df -i` | 100 percent used, or no free inodes |
| Disk speed | `iostat -x 1 3` | High `%util` and long `await` times |
| Network | `ss -s`, `ip -s link` | Many connections in odd states, errors or drops |

## The first two minutes

```console
$ uptime
 14:03:11 up 41 days,  3:12,  2 users,  load average: 9.80, 8.40, 5.10
$ nproc
4
$ top -b -n1 | head -12
$ free -m
              total   used   free  shared  buff/cache  available
Mem:           7822   7410    112      12         300         95
$ df -h /var; df -i /var
```

A load of 9.8 on 4 cores means work is queueing. Load counts processes that want CPU and also those blocked on disk, so look at `top` to see which it is: high `%us`/`%sy` means CPU; high `%wa` means waiting for disk. In `free -m`, trust the **available** column, not "free", because the kernel uses spare memory as cache.

## Find the process and see what it does

```bash
ps aux --sort=-%mem | head -5          # biggest memory users
ss -tnp state established | head       # who is connected, and which process owns it
lsof -p 4321 | head -20                # files and sockets a process has open
sudo strace -p 4321 -f -tt -e trace=network,file   # live system calls (use briefly, it slows the process)
journalctl -u shop --since "-15min"    # what the service itself reported
```

`strace` shows what a process is asking the kernel to do. If it repeats the same failing call, you have found the loop. Remove it as soon as you have the answer.

```predict
Q: df -h shows 40 percent free space on /var, yet the application logs "No space left on device". What should you check next?
???
Run df -i to see whether the filesystem has run out of inodes.
> A filesystem can be out of inodes (file entries) while still having free blocks. Millions of tiny files, such as session files or mail queues, cause this. Find the directory with many files and clean or rotate it.
```

```diagram
title: A fixed order for a sick server
node: ask | What changed? | 0 | 1 | Deploys, config edits, package updates and traffic changes in the last hours. | Skipping this step means hours spent on a cause that was introduced this morning.
node: logs | Logs and kernel messages | 1 | 0 | journalctl and dmesg show crashes, OOM kills and disk errors with timestamps. | Logs rotated away or never kept leave you guessing.
node: use | CPU, memory, disk, network | 1 | 2 | uptime, free, df, iostat and ss find the saturated resource. | Reading the wrong column, such as free instead of available memory, misleads you. | process
node: proc | Responsible process | 2 | 1 | ps, top, lsof and strace link the saturation to one program. | Killing the wrong process fixes nothing and may hide the evidence.
node: fix | Fix and verify | 3 | 1 | Change one thing, then confirm the metric returns to normal. | Several changes at once leave you unsure what worked.
edge: ask | logs
edge: ask | use
edge: logs | proc
edge: use | proc
edge: proc | fix
```

## Incident: the server with free space and no space

> **Incident:** Uploads fail at 09:40 with "No space left on device". Disk graphs show 60 percent free.

```console
$ df -h /srv
/dev/sdb1   200G  120G   80G  60% /srv
$ df -i /srv
Filesystem   Inodes   IUsed IFree IUse% Mounted on
/dev/sdb1   13107200 13107200    0  100% /srv
$ sudo find /srv/sessions -type f | wc -l
12984311
```

The session directory held almost 13 million tiny files, and a cleanup job had been failing for weeks. The team removed files older than a day, fixed the job, added an alert on inode use, and moved sessions to a store designed for them.

## Common mistakes

- Restarting the service before collecting evidence (logs, a thread dump, `ss` output)
- Reading "free" memory instead of "available"
- Changing several settings at once
- Leaving `strace` or debug logging on after the investigation

```quiz
Q: A server shows a load average of 12 on 4 cores, but CPU use is only 10 percent and the %wa value is high. What is the likely cause?
- The CPU is too slow :: CPU use is only 10 percent, so the processor is not the bottleneck.
+ Processes are waiting on disk or other I/O
- The network card is broken :: A network fault would show errors in ip -s link and would not raise iowait.
- Memory is completely free :: Free memory does not explain queued processes; high wait time points at I/O.
> Load counts processes that wait for I/O as well as those waiting for CPU. High %wa means they are blocked on storage.

Q: Which memory number should you trust to see how much can be used without swapping?
- free :: Free memory excludes cache that the kernel can release, so it looks far too small.
- shared :: Shared is memory used by tmpfs and shared segments, not a measure of what is left.
+ available
- buff/cache :: This is already used for caching; only the part that can be released counts, which available estimates.
> Available estimates memory for new work, including cache that can be released.

Q: Which command shows the system calls a running process makes?
- lsof :: lsof lists open files and sockets, not live system calls.
- ss :: ss shows sockets, not what a process is calling.
+ strace
- uptime :: uptime reports load averages for the whole machine.
> strace attaches to a process and prints its system calls, which reveals loops and failing calls.

Q: A disk is 60 percent free, but writes fail with "No space left on device". What do you check?
- The swap size :: Swap is unrelated to file creation on a filesystem.
+ Inode usage with df -i
- The CPU temperature :: Temperature does not produce this error.
- DNS settings :: Name resolution has no effect on writing files.
> When all inodes are used, no new file can be created even if blocks are free.
```

```cards
What is the USE method? :: For each resource check Utilisation, Saturation and Errors
Which column shows usable memory in free -m? :: available
What does df -i show? :: Inode use, which can run out before disk space
What does high %wa in top mean? :: Processes are waiting on disk or other I/O
Why remove strace after use? :: It slows the traced process
```
