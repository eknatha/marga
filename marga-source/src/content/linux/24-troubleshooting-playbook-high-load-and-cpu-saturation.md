---
title: Troubleshooting playbook: high load and CPU saturation
minutes: 12
summary: Tell CPU saturation from I/O waits and steal time, find the busy process or thread, and decide whether to fix, limit or scale.
---

"The load is 30" can mean three very different problems: the CPUs are busy, processes are stuck waiting on disk or network storage, or a noisy neighbour is taking CPU from a virtual machine. Each has a different cure, so the first job is to tell them apart.

## What you will learn

- Read load average correctly, including tasks in uninterruptible sleep
- Split CPU time into user, system, iowait and steal
- Find the busy process, thread or kernel path
- Choose between fixing, limiting and scaling

## What load average counts

Load average is the average number of tasks that are runnable **or** in uninterruptible sleep (state `D`, usually waiting for I/O) over 1, 5 and 15 minutes. Compare it with the CPU count from `nproc`. A load of 16 on 16 cores is a full machine; a load of 16 on 2 cores is a queue. A high load with low CPU use points to blocked tasks, not computation.

```console
$ nproc
$ uptime
$ mpstat -P ALL 1 3
$ ps -eo state,pid,cmd | awk '$1 ~ /^D/' | head
```

## Read the CPU split

In `mpstat` or `top`:

- `%usr` high: application code is computing. Profile it.
- `%sys` high: time in the kernel, often many system calls, context switches, network packets or locks.
- `%iowait` high: CPUs are idle because tasks wait for storage. Look at disks and network filesystems, not at CPU.
- `%steal` high: the hypervisor is giving your virtual CPU to someone else. Ask for more capacity or move the VM.
- One core at 100 percent while others idle: a single-threaded task is the limit, and adding cores will not help.

## Find the culprit

```console
$ top -H -o %CPU
$ pidstat -u -t 1 3
$ sudo perf top -p 2314
$ cat /proc/2314/status | grep -i ctxt
```

`top -H` shows threads, which matters for runtimes with thread pools. `pidstat -t` lists per-thread CPU. `perf top` shows which functions burn CPU. A very high count of voluntary context switches suggests lock waits or I/O; non-voluntary switches suggest CPU contention.

## Decide: fix, limit or scale

If one process is wrong (an infinite loop, a bad query, a retry storm), fix or restart it and keep evidence. If a legitimate job competes with a service, limit it with `nice`, `ionice` or a systemd `CPUQuota=`. If demand is real and steady, scale out or up. Scale only after you know the bottleneck: more cores do nothing for an I/O wait.

```predict
Q: Load is 24 on 4 CPUs, %iowait is 85 and %usr is 5. Will adding CPUs help?
???
No. The CPUs are waiting for storage. Investigate the disk or network filesystem latency and the processes in D state.
> More cores do not fix I/O waits.
```

## Incident: Load 80 and an idle CPU

> **Incident:** A build server showed load 80, yet `top` reported 95 percent idle, and builds hung.

```console
$ ps -eo state,pid,cmd | awk '$1 ~ /^D/' | head -3
D 4410 /usr/bin/git-archive-helper
$ mount | grep nfs
10.0.8.5:/builds on /mnt/builds type nfs
$ dmesg -T | grep -i "not responding"
nfs: server 10.0.8.5 not responding, still trying
```

Dozens of processes were in `D` state, waiting for an NFS server that had stopped answering. The CPU was idle because nothing could run. The fix was on the storage side, plus soft mount options with timeouts for the build share and an alert on NFS "not responding" messages. Killing processes would not have helped, because tasks in `D` state cannot be killed until the I/O returns.

## Common mistakes

- Adding CPUs for a problem that is I/O wait
- Reading load average without comparing it with the core count
- Ignoring steal time on virtual machines
- Restarting the service before capturing stack or profile evidence

```quiz
Q: Which tasks does load average count?
+ Runnable tasks and tasks in uninterruptible sleep
- Only tasks using CPU right now :: It also counts waiting tasks.
- Only network connections :: Not part of the definition.
- Only kernel threads :: It counts all tasks.
> Blocked I/O adds to load.

Q: %steal is high on a virtual machine. What does it mean?
+ The hypervisor is giving your CPU time to other guests
- Your disk is failing :: Steal is about CPU time.
- Your memory is leaking :: Unrelated.
- A process is stealing files :: Not what steal means.
> Steal is lost CPU time from the host.

Q: One core is at 100 percent and the rest are idle. What is likely?
+ A single-threaded task is the bottleneck
- Too many cores :: Idle cores are not the problem.
- A full disk :: That would show as iowait or errors.
- A DNS problem :: Not visible this way.
> Parallelism, not core count, is the limit.

Q: Why can you not kill a process in D state?
+ It waits inside the kernel for I/O and cannot handle signals until it returns
- It has no PID :: It has one.
- It is protected by SELinux :: Not the reason.
- It is a zombie :: Zombies are a different state.
> Fix the I/O source instead.
```

```cards
Load average :: runnable plus uninterruptible tasks, compare with nproc
High iowait :: CPUs idle while tasks wait for storage
High steal :: hypervisor gives your vCPU to others
D state :: waiting in the kernel for I/O, cannot be killed
Per-thread view :: top -H and pidstat -t
```
