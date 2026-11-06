---
title: Kernel messages, the journal and core dumps
minutes: 13
summary: Read dmesg and journalctl for kernel and service events, find out-of-memory kills, and collect a core dump after a crash.
---

The program's own log tells you what it knew. The kernel and the init system tell you what happened to it from outside: killed for memory, hit a segmentation fault, reset by a driver. Knowing these logs turns a mystery restart into a named cause.

## What you will learn

- What dmesg shows and how to read the OOM killer
- Filtering the systemd journal by unit, priority and boot
- Making the journal survive a reboot
- Finding and opening a core dump

## The kernel ring buffer

```console
$ dmesg -T | grep -iE 'oom|killed|error' | tail -3
[Tue Nov  3 02:14:09 2026] Out of memory: Killed process 4411 (java) total-vm:9421112kB, anon-rss:7884112kB
[Tue Nov  3 02:14:09 2026] oom_reaper: reaped process 4411 (java)
[Tue Nov  3 02:15:30 2026] EXT4-fs error (device sdb1): ext4_find_entry: reading directory
```

The **OOM killer** picks a process when memory runs out; the line names the victim and its memory. Disk and driver errors also appear here.

## The journal

```console
$ journalctl -u app.service --since "02:00" --until "02:30" -p warning
$ journalctl -b -1 -p err        # errors from the previous boot
$ journalctl -k                  # kernel messages only
$ sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald
```

By default some systems keep the journal in memory only; creating `/var/log/journal` makes it persistent so you can read the boot before a crash.

## Core dumps

When a program crashes with a signal such as SIGSEGV, the system can save a **core dump**. With systemd-coredump:

```console
$ coredumpctl list
TIME                 PID  SIG  EXE
Tue 2026-11-03 02:14 4411 SEGV /usr/bin/app
$ coredumpctl gdb 4411
(gdb) bt
```

`bt` prints the stack at the moment of the crash, which a developer can match to code. Core files can contain secrets from memory, so store them with care and delete them when done.

```diagram
title: Where evidence of a crash lives
node: proc | Process dies | 0 | 0 | Killed by the OOM killer, a signal or a driver fault. | The process cannot log its own sudden death.
node: kernel | dmesg | 1 | 0 | Kernel ring buffer with OOM, disk and driver messages. | It is a fixed-size buffer; old lines are overwritten. | observe
node: journal | journald | 2 | 0 | Collects service output and unit state changes. | Not persistent by default on some systems. | store
node: core | Core dump | 3 | 0 | A saved memory image for crashes by signal. | Large and may hold secrets; control access. | security
node: tool | coredumpctl and gdb | 3 | 1 | Lists crashes and prints the stack. | Needs debug symbols for readable names.
edge: proc | kernel
edge: kernel | journal
edge: journal | core
edge: core | tool
```

## Incident: The service killed by the kernel

> **Incident:** A Java service disappeared every few days with a clean application log.

```console
$ systemctl status app
Main PID: 4411 (code=killed, signal=KILL)
$ dmesg -T | grep -i killed
Out of memory: Killed process 4411 (java) anon-rss:7884112kB
```

The heap setting was larger than the memory limit of the host. They set the heap below the limit, added a memory alert, and made the journal persistent so the next incident would leave a trail.

## Common mistakes

- Looking only in the application log for a killed process
- Leaving the journal in memory so a reboot erases the evidence
- Sharing a core dump without checking it for secrets
- Reading old dmesg lines after the buffer wrapped

```quiz
Q: Which log shows the OOM killer?
+ dmesg or the journal's kernel messages
- The application log only :: No.
- /etc/hosts :: No.
- The browser console :: No.
> The kernel logs who it killed.

Q: How do you read errors from the previous boot?
+ journalctl -b -1 -p err
- dmesg -c :: No.
- ls /var :: No.
- uptime :: No.
> -b -1 selects the previous boot.

Q: What does a core dump contain?
+ The memory image of a crashed process
- Only the log file :: No.
- The disk layout :: No.
- The BIOS settings :: No.
> It captures state at the crash.

Q: Why make the journal persistent?
+ So logs survive a reboot
- To make it faster :: No.
- To hide errors :: No.
- To save disk :: No.
> A memory-only journal is lost at reboot.
```

```cards
dmesg :: Shows the kernel ring buffer
OOM killer :: Kernel feature that ends a process when memory is exhausted
journalctl :: Command to read the systemd journal
Core dump :: A saved memory image written when a process crashes
coredumpctl :: Tool to list and open core dumps
```
