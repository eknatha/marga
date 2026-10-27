---
title: Memory, swap and the OOM killer
minutes: 14
summary: Understand virtual memory, the page cache and swap, read free and /proc/meminfo correctly, and investigate an out-of-memory kill.
---

Memory problems look mysterious because Linux uses memory differently from how people expect. Free memory near zero is normal, since the kernel uses spare memory as cache. A process can be killed even when free shows gigabytes available, if its cgroup limit was hit. Knowing what the numbers mean, and where the kernel records its decisions, turns an out-of-memory incident from guessing into reading.

## What you will learn

- Virtual memory, resident memory and the page cache
- Read free, /proc/meminfo and per-process numbers
- How the OOM killer chooses a victim and where it logs
- Container memory limits and how to prevent kills

## What the numbers mean

```bash
free -h
              total   used   free  shared  buff/cache  available
Mem:           15Gi   4.1Gi  0.4Gi  0.2Gi       11Gi       10Gi
Swap:         2.0Gi   0.0Gi  2.0Gi
```

The `free` column is memory that nothing uses; `buff/cache` is file data kept in memory to speed up reads, which the kernel gives back when programs need it. The column that matters is **available**: an estimate of how much can be given to programs without swapping. Each process has **virtual** memory (address space promised to it, often much larger than real use), **resident** memory (RSS, pages actually in RAM) and shared pages counted in several processes. Use `ps -eo pid,rss,cmd --sort=-rss | head` and `/proc/PID/smaps_rollup` for accurate per-process values.

## Swap and pressure

Swap is disk space the kernel can use to move rarely used pages out of RAM. A little swap use is fine. A system that constantly reads and writes swap is **thrashing**: it is slow, with high I/O wait and low CPU use.

```bash
vmstat 1 5            # watch si/so (swap in/out) and wa (I/O wait)
cat /proc/pressure/memory
sysctl vm.swappiness
```

The pressure stall information (PSI) file shows how much time tasks spend waiting for memory: values like `some avg10=12.5` mean tasks were stalled 12.5 percent of the last ten seconds. PSI is a better alarm than free memory. Many container hosts run with no swap on purpose, so that overload shows up as a clear kill rather than as a slow death.

## The OOM killer

When the kernel cannot find memory, it picks a process to kill so that the system can survive. It prefers processes that use a lot of memory, adjusted by `oom_score_adj` (range -1000 to 1000; -1000 makes a process unkillable, so use it carefully).

```bash
dmesg -T | grep -i -E "out of memory|killed process"
journalctl -k | grep -i oom
cat /proc/$(pidof myapp)/oom_score
```

A typical message reads: `Out of memory: Killed process 4121 (java) total-vm:9876540kB, anon-rss:7340000kB`. The log lists the victim, its sizes and a table of all processes. Check whether the kill came from the whole machine running out, or from a **cgroup** limit (the message mentions `Memory cgroup out of memory`).

## Containers and prevention

In containers and Kubernetes pods, the memory limit becomes a cgroup limit, and exceeding it gets the container killed (status `OOMKilled`, exit code 137) even when the host has plenty. Prevention is design work:

- Set requests and limits from measured usage, with headroom.
- Make runtimes aware of the limit (for example, set the heap as a percentage of the container memory).
- Fix leaks and unbounded caches or queues.
- Alert on memory working set and on PSI, not only on free memory.
- Keep important system daemons protected with a lower `oom_score_adj`.

```bash
kubectl describe pod web-7d9 | grep -A3 "Last State"
kubectl top pod web-7d9 --containers
```

```predict
Q: free shows 300 MB free but 10 GB available. Is the machine in trouble?
???
No. Most memory is page cache that the kernel can reclaim. Look at available and at memory pressure, not at the free column.
> Free is not the right number.
```

## Incident: The pod killed with plenty of host memory

> **Incident:** A Java service restarted every few hours with exit code 137.

```console
$ kubectl describe pod orders-6f7 | grep -A4 "Last State"
    Last State:   Terminated
      Reason:     OOMKilled
      Exit Code:  137
$ kubectl get pod orders-6f7 -o jsonpath='{.spec.containers[0].resources.limits.memory}'
512Mi
```

The JVM was configured with a fixed 1 GB heap while the container limit was 512 MiB, so the kernel killed it inside its cgroup when the heap grew. The fix set the heap as a percentage of the container memory, raised the limit based on measurements, and added an alert on working set above 85 percent of the limit.

## Common mistakes

- Reading the free column as the amount of memory left
- Disabling swap or the OOM killer without a plan
- Setting container limits below the real working set
- Giving a process oom_score_adj of -1000 without thought

```quiz
Q: Which column of free best shows memory available to programs?
+ available
- free :: Excludes reclaimable cache.
- shared :: Not the measure.
- total :: Fixed size.
> Available includes reclaimable cache.

Q: What does exit code 137 with OOMKilled usually mean?
+ The container was killed after exceeding its memory limit
- A network timeout :: No.
- A normal stop :: No.
- A disk error :: No.
> 137 is 128 plus SIGKILL; the lesson section explains why.

Q: Where do you find which process the kernel killed?
+ dmesg or journalctl -k
- /etc/passwd :: Users.
- df :: Disk usage.
- uptime :: Load averages.
> The kernel logs the victim.

Q: Why is thrashing slow?
+ The system constantly moves pages between RAM and swap on disk
- The CPU is overheating :: No.
- DNS is slow :: No.
- Logs are large :: No.
> Watch si, so and wa in vmstat.
```

```cards
Real headroom :: free -h available column
Per-process memory :: ps --sort=-rss, smaps_rollup
Swap activity :: vmstat 1 (si, so)
Pressure :: /proc/pressure/memory
OOM evidence :: dmesg -T | grep -i oom
Container kill :: OOMKilled, exit 137
```
