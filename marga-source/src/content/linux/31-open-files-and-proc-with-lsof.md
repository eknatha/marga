---
title: Open files and /proc: find leaks and who holds what
minutes: 13
summary: Use lsof and the /proc filesystem to find which process holds a file, port or deleted file, and to spot descriptor leaks.
---

Linux treats files, sockets and pipes alike as open file descriptors. That is why one tool can answer very different questions: what is using this port, why will this disk not unmount, why does this process run out of handles. The /proc directory exposes the same facts for every process.

## What you will learn

- How to ask who has a file, a port or a directory open
- How a deleted file keeps using disk space
- Reading limits and counts in /proc
- Spotting a descriptor leak

## Who has it open?

```console
$ sudo lsof -i :8080
COMMAND  PID  USER  FD  TYPE  NODE  NAME
java    2210  app   45u IPv6  TCP   *:8080 (LISTEN)
$ sudo lsof +D /var/log/app | head -3
$ sudo lsof +L1
COMMAND  PID USER  FD  SIZE/OFF   NLINK NAME
app     1820 app   4w  8589934592 0     /var/log/app/app.log (deleted)
```

`+L1` lists files with fewer than one link: **deleted but still open**. The disk space is freed only when the last process closes them. Truncating the file through the descriptor (`: > /proc/1820/fd/4`) or restarting the service releases it.

## /proc for one process

| Path | Shows |
|---|---|
| `/proc/PID/cmdline` | The full command line |
| `/proc/PID/fd/` | One link per open handle |
| `/proc/PID/limits` | Limits such as Max open files |
| `/proc/PID/status` | Memory, threads, state |
| `/proc/PID/cwd` | Working directory |

```diagram
title: From a symptom to the process that holds it
node: symptom | Symptom | 0 | 0 | The disk is full, a port is busy or a process says too many open files. | Guessing which process is responsible wastes time.
node: lsof | lsof | 1 | 0 | Lists open files and sockets with the owning process. | Without sudo you only see your own processes. | observe
node: proc | /proc/PID | 2 | 0 | Shows handles, limits and memory for that process. | A process can change; read it more than once.
node: act | Fix | 3 | 0 | Restart, truncate, raise a limit or fix the leak. | Restarting hides a leak that returns tomorrow.
node: watch | Watch the count | 2 | 1 | Count entries in /proc/PID/fd over time. | A number that only grows is a leak. | observe
edge: symptom | lsof
edge: lsof | proc
edge: proc | act
edge: proc | watch
```

## Spotting a leak

`ls /proc/PID/fd | wc -l` gives the number of open handles. Compare it with `Max open files` in `/proc/PID/limits`. If the count rises steadily under constant load and then the process fails with "Too many open files", code is opening sockets or files and not closing them. Raising the limit only delays the failure; find what is not closed.

## Incident: The disk that was full but empty

> **Incident:** A disk showed 100 percent used while du reported half that.

```console
$ df -h /var
/dev/sdb1  100G  100G  0  100% /var
$ du -sh /var
52G  /var
$ lsof +L1
app  1820  app  4w  51539607552  0  /var/log/app/app.log (deleted)
```

Someone had removed the log with rm while the app kept writing to it. The space returned after the service restarted. The team switched to log rotation with copytruncate and an alert for large deleted-but-open files.

## Common mistakes

- Deleting a big log file instead of truncating it while the process runs
- Restarting a leaking service every night and calling it fixed
- Raising ulimit without finding the leak
- Running lsof without sudo and seeing only half the story

```quiz
Q: df shows full but du shows half. What should you check?
+ Deleted files still held open by a process
- A broken network :: No.
- DNS :: No.
- The BIOS :: No.
> lsof +L1 finds them.

Q: Which command shows what listens on port 8080?
+ lsof -i :8080
- ls /etc :: No.
- cat /proc/uptime :: No.
- du -sh :: No.
> lsof -i filters by port.

Q: Where do you read a process's open-file limit?
+ /proc/PID/limits
- /etc/hosts :: No.
- /var/log/syslog :: No.
- /proc/PID/cwd :: No.
> The limits file lists Max open files.

Q: What does a steadily rising fd count mean?
+ A descriptor leak
- A healthy process :: No.
- A full disk :: No.
- A DNS error :: No.
> Handles are opened and not closed.
```

```cards
File descriptor :: A number identifying an open file, socket or pipe
lsof :: Command that lists open files and the processes using them
/proc :: A virtual filesystem exposing kernel and process information
Deleted but open :: A removed file whose space stays used until closed
ulimit :: A limit on resources such as open files per process
```
