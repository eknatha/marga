---
title: System calls, strace and perf
minutes: 14
summary: See how programs talk to the kernel through system calls, trace them with strace, and find hot spots with perf.
---

Every program that touches a file, a socket or the clock must ask the kernel through a system call. When an application hangs, fails with a vague message or burns CPU for no clear reason, watching its system calls shows what it is really doing, regardless of the language it is written in. Two tools do most of the work: strace for the conversation with the kernel and perf for where the time goes.

## What you will learn

- What a system call is and what user and kernel space mean
- Trace a process with strace and read its output
- Find permission, missing file and DNS problems quickly
- Profile CPU use with perf and know its limits

## User space and kernel space

Programs run in **user space** with limited rights. To read a file, open a connection or create a process they call into the kernel, which runs in **kernel space** with full access: `open`, `read`, `write`, `connect`, `accept`, `clone`, `execve`, `mmap`, `futex` and hundreds more. Libraries such as the C library wrap them. Switching between modes costs time, so a program making millions of tiny calls is slow, and a program stuck in one call (waiting for a read that never returns) appears hung. A list is in `man 2 syscalls`.

## Using strace

```bash
strace -f -tt -T -o /tmp/trace.txt ./myapp --config /etc/myapp.conf
strace -p 4121 -f -e trace=network
strace -c -p 4121                   # summary table by call, then Ctrl-C
strace -e trace=openat,stat ls /nonexistent 2>&1 | tail -3
```

`-f` follows child processes and threads, `-tt` adds timestamps, `-T` shows the time spent inside each call, `-e trace=` filters by call or group, and `-c` prints a summary of counts and time. A line such as `openat(AT_FDCWD, "/etc/myapp.conf", O_RDONLY) = -1 ENOENT (No such file or directory)` tells you exactly which file was missing. The return value after `=` and the error name are the key.

## Typical findings

- **Wrong file or permissions**: `ENOENT` or `EACCES` on `openat`; shows the exact path the program really tried.
- **Hang**: the last line is a call that has not returned, such as `read(7,` or `futex(0x7f...,` (waiting on a lock) or `connect(` (waiting on a network peer).
- **DNS or config**: reads of `/etc/resolv.conf` and a `sendto` to port 53 followed by a long wait.
- **Too many calls**: a flood of `stat` or `read` of 1 byte shows a bad loop; `strace -c` makes this visible.

strace slows the target a lot, because it stops it at every call. Use it on a test copy or briefly in production, and consider `perf trace` or eBPF-based tools for low-overhead tracing.

## perf for CPU time

```bash
sudo perf top
sudo perf record -F 99 -g -p 4121 -- sleep 30
sudo perf report --stdio | head -40
```

perf samples what the CPU is doing 99 times per second and shows which functions use the most time, including kernel code. If a process uses 100 percent CPU and strace shows no calls, it is computing in user space, and perf shows where. Without debug symbols you see addresses instead of names. Flame graphs built from perf data are a common way to present the result. Run profiling during the problem, for a short period, and save the data with the incident notes.

```predict
Q: A service hangs. strace -p shows the last line is futex(0x7f12..., FUTEX_WAIT, ...) and it never returns. What does that suggest?
???
The process is waiting on a lock or condition held by another thread, likely a deadlock or a blocked dependency; check other threads and what holds the lock.
> Look at all threads with strace -f or a thread dump.
```

## Incident: The config file nobody could find

> **Incident:** An application started with default settings, ignoring the settings in its configuration file.

```console
$ strace -f -e trace=openat ./myapp 2>&1 | grep -i conf
openat(AT_FDCWD, "/etc/myapp/config.yaml", O_RDONLY) = -1 ENOENT (No such file or directory)
openat(AT_FDCWD, "/home/app/.myapp.yaml", O_RDONLY) = -1 ENOENT (No such file or directory)
```

The application looked for /etc/myapp/config.yaml, while the team had placed the file at /etc/myapp.yaml. A path mismatch after a packaging change was the cause. Tracing showed the exact paths in a minute, which saved reading the source code. The packaging was fixed and a startup check was added that fails loudly when no configuration is found.

## Common mistakes

- Running strace on a busy production process for a long time
- Forgetting -f and tracing only the parent
- Ignoring return values and error names
- Profiling without symbols or for too short a time

```quiz
Q: What does -f do in strace?
+ Follows child processes and threads
- Filters by file :: It follows forks.
- Fixes errors :: No.
- Formats output :: No.
> Needed for servers that fork or use threads.

Q: What does ENOENT mean in a trace?
+ The path does not exist
- Permission denied :: That is EACCES.
- Out of memory :: That is ENOMEM.
- Connection refused :: That is ECONNREFUSED.
> Shows the exact path tried.

Q: Which tool finds the functions using CPU time?
+ perf
- strace -c only :: Counts calls.
- df :: Disk usage.
- ls :: Lists files.
> Sampling profiler; the lesson section explains why.

Q: Why is strace risky on a busy production service?
+ It stops the process at each system call and slows it down
- It deletes logs :: No.
- It reboots the host :: No.
- It changes permissions :: No.
> Use briefly or use lower-overhead tools.
```

```cards
Trace a command :: strace -f -tt -T -o out.txt CMD
Attach :: strace -p PID -f
Summary :: strace -c -p PID
Filter :: -e trace=openat,network
Sample CPU :: perf record -F 99 -g -p PID
Report :: perf report --stdio
```
