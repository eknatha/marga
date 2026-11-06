---
title: Debugging with strace: watch system calls
minutes: 13
summary: Use strace to see which files, sockets and system calls a stuck or failing program uses, and read the output to find the real cause.
---

Every program talks to Linux through system calls: open a file, connect to a socket, read, write, wait. strace prints those calls as they happen, so it can explain failures that logs never mention. It is often the fastest way to learn what a program is really doing.

## What you will learn

- What a system call is and how strace shows it
- Reading open, connect and read calls and their error codes
- Following child processes and timing calls
- Attaching to a running process and using strace safely

## What strace shows

A program cannot touch files, the network or memory directly; it asks the kernel through **system calls**. `strace` starts a program (or attaches to one) and prints each call, its arguments and the result.

```console
$ strace -f -tt -e trace=file,network ./myapp 2>&1 | head
12:01:03.114 openat(AT_FDCWD, "/etc/app/config.yml", O_RDONLY) = -1 ENOENT (No such file or directory)
12:01:03.115 openat(AT_FDCWD, "/usr/local/etc/app.yml", O_RDONLY) = -1 ENOENT (No such file or directory)
12:01:03.116 connect(3, {sa_family=AF_INET, sin_port=htons(5432), sin_addr=inet_addr("10.0.0.5")}, 16) = -1 ECONNREFUSED
```

A result of `-1` followed by an error name is a failure. The name is the clue.

| Error | Meaning | Usual cause |
|---|---|---|
| ENOENT | No such file or directory | Wrong path or missing file |
| EACCES | Permission denied | Owner, mode or security profile |
| ECONNREFUSED | Nothing listens on that port | Service down or wrong port |
| ETIMEDOUT | No answer | Firewall or routing |
| EADDRINUSE | Port already used | Another process holds it |

```diagram
title: How strace sits between a program and the kernel
node: app | Your program | 0 | 0 | Runs normally but each system call is intercepted. | A crash inside the program may show only a signal at the end.
node: strace | strace | 1 | 0 | Pauses the program at each call, prints it, then lets it continue. | It can slow the program 10 times or more, so use it briefly on production.
node: kernel | Kernel | 2 | 0 | Performs the real file, network or memory work. | Its error code is the answer you are looking for. | service
node: out | Trace output | 1 | 1 | Calls with arguments, results and timing. | Millions of lines hide the cause; filter with -e trace. | observe
edge: app | strace
edge: strace | kernel
edge: kernel | strace
edge: strace | out
```

## Useful options

- `-f` follows child processes, essential for shells and servers that fork.
- `-tt` adds timestamps; `-T` shows time spent in each call.
- `-e trace=file` or `network` or `process` limits the output to a group of calls.
- `-p PID` attaches to a running process; `-c` prints a summary table of calls and time.
- `-o trace.txt` writes to a file so the program's own output stays readable.

## Reading a hang

A process that does nothing is usually blocked in one call. `strace -p PID` shows it: `futex(...)` waiting for another thread, `read(5, ...)` waiting for a socket, or `poll` waiting for events. File descriptor 5 can be matched to a socket with `ls -l /proc/PID/fd/5`.

## Incident: The service that could not find its config

> **Incident:** A new unit file started the app from a different directory and it exited with no log line.

```console
$ systemctl status app
Active: failed (Result: exit-code)
$ strace -f -e trace=file ./app 2>&1 | tail -3
openat(AT_FDCWD, "config.yml", O_RDONLY) = -1 ENOENT (No such file or directory)
```

The app used a relative path and the unit file set no WorkingDirectory. Adding WorkingDirectory=/opt/app fixed it in one line. Without strace the team had been reading the application code for an hour.

## Common mistakes

- Tracing without -f so the work in child processes is missed
- Reading the first lines of a huge trace instead of filtering
- Leaving strace attached to a busy production process
- Ignoring the error name and looking only at the call

```quiz
Q: What does ENOENT mean?
+ No such file or directory
- Permission denied :: No.
- Connection refused :: No.
- Out of memory :: No.
> It is the error for a missing path.

Q: Why use strace -f?
+ To follow child processes
- To show file sizes :: No.
- To speed up the program :: No.
- To hide errors :: No.
> Many programs do their work in forked children.

Q: A process is stuck. What helps most?
+ strace -p PID to see which call it is blocked in
- Reboot the host :: No.
- Delete its logs :: No.
- Reinstall the package :: No.
> The blocked call shows what it waits for.

Q: Why avoid long strace runs in production?
+ It slows the traced process a lot
- It deletes files :: No.
- It closes ports :: No.
- It needs a reboot :: No.
> Every call is intercepted and printed.
```

```cards
System call :: A request from a program to the kernel, such as open or connect
strace :: A tool that prints a program's system calls
ENOENT :: Error number for a missing file or directory
EACCES :: Error number for permission denied
File descriptor :: A number a process uses to refer to an open file or socket
```
