---
title: Performance triage
minutes: 16
summary: Use load average, vmstat and iostat to tell CPU, memory and disk problems apart in under five minutes.
---

The server "feels slow". Dashboards are not available yet, and you have a shell. A good engineer does not start guessing or restarting things. They run the same short checklist every time and let the numbers decide whether the bottleneck is CPU, memory, disk or network.

## What you will learn

- How to read load average correctly
- A five-command triage sequence
- How to separate CPU saturation from disk waiting
- The USE method: utilization, saturation, errors

## Load average is a queue length

```console
$ uptime
 02:44:10 up 12 days,  3:02,  2 users,  load average: 11.86, 9.40, 6.12
$ nproc
4
```

The three numbers are the average count of tasks that were running or waiting to run over the last 1, 5 and 15 minutes. On Linux this includes tasks blocked on disk I/O. Compare them with the number of CPU cores from `nproc`. A load of 4 on a 4-core machine is full but healthy. A load of 11.86 on 4 cores means work is queueing, and the 1-minute number being higher than the 15-minute one means it is getting worse.

Load alone does not say **why**. You need the next commands.

## The USE method

For each resource (CPU, memory, disk, network) ask three questions:

| Question | Meaning | Example evidence |
|----------|---------|------------------|
| **Utilization** | How busy is it? | CPU 95% busy |
| **Saturation** | Is work waiting? | Run queue longer than cores, swapping |
| **Errors** | Is it failing? | Disk errors in `dmesg`, packet drops |

Checking all three for each resource stops you from fixating on the first thing that looks odd.

## A five-command triage

```bash
uptime              # 1. load trend
vmstat 1 5          # 2. CPU, memory, swap and I/O wait together
free -h             # 3. memory, focusing on "available"
iostat -xz 1 3      # 4. per-disk utilization and latency (package: sysstat)
ss -s               # 5. socket totals; then top for the process view
```

`free -h` has a column named `available`. It estimates how much memory can be used without swapping, including reclaimable cache. Low `free` with a large `available` is normal, because Linux uses spare memory as file cache.

## Reading vmstat

```console
$ vmstat 1 3
procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  7      0 213456  10240 812344    0    0  5120   980 1200 2400  4  3 12 81  0
 0  8      0 211320  10240 814012    0    0  4980  1010 1180 2350  3  2 14 81  0
```

This is sample output. Focus on a few columns:

- `r`: tasks waiting to run on the CPU. Persistently above the core count means CPU saturation.
- `b`: tasks blocked, usually waiting on disk.
- `si`/`so`: memory swapped in and out. Sustained non-zero values mean memory pressure.
- `us`/`sy`: CPU time in user code and kernel code. `id` is idle.
- `wa`: CPU time spent waiting for I/O to complete.

## Incident: load is 12 but the CPUs are idle

> **Incident:** The reporting server has load 11.86 on 4 cores, yet users say only exports are slow.

In the `vmstat` output above, `r` is 1 and `id` is 12, so the CPU is not the limit. But `b` is 7 and `wa` is 81. Seven tasks are blocked and 81% of CPU time is spent waiting for I/O. This is a **disk** problem. Find which device with `iostat`:

```console
$ iostat -xz 1 2
Device   r/s    w/s   rkB/s   wkB/s  r_await  w_await  aqu-sz  %util
sda     2.0    4.0    16.0    48.0     1.1      2.0    0.01    0.5
sdb   410.0   35.0 52480.0  4400.0    38.5     12.2   16.90   99.8
```

`sdb` is 99.8% utilized with a 38 ms read wait and a deep queue (`aqu-sz`). That is the database volume. Now find the process doing the reading:

```console
$ sudo iotop -oP -n 1
  PID  PRIO  USER   DISK READ  DISK WRITE  COMMAND
 3187  be/4  app    48.20 M/s     0.00 B/s  python3 /opt/report/export.py
```

A nightly export is scanning large tables at the same time as users query. Options include scheduling the job off-peak, lowering its priority with `ionice -c3`, adding an index so it reads less, or moving it to a read replica. The triage did not require guessing, because each command removed a hypothesis.

> **Why it matters:** Rebooting would have cleared the symptom for an hour and taught you nothing. A five-minute triage gives you a cause you can fix and explain.

## What to check when it is not the disk

- **CPU saturated:** high `us` and `r` above core count. Use `top` sorted by CPU (`P`) and look for a runaway process.
- **Memory pressure:** `si`/`so` non-zero, `available` low, OOM events in `dmesg`.
- **Network:** `ss -s` for socket counts, `ip -s link` for errors and drops.

## Common mistakes

- Reading load average without comparing it to the number of cores
- Treating low `free` memory as a problem when `available` is large
- Restarting the service before capturing evidence
- Looking at averages only, instead of watching `vmstat 1` for a few seconds

```quiz
Q: A 4-core server shows load average 11.86. What is the most accurate interpretation?
- The server is idle
+ Roughly three times as many tasks want to run or are blocked as there are cores, so work is queueing
- The server has 11 CPUs
- Memory is full
> Load is a queue length. Compare it with core count, and note that blocked I/O tasks count on Linux.

Q: In vmstat, the wa column is 81. What does that suggest?
- The CPU is overheating
+ The CPU is spending most of its time waiting for disk I/O
- The system is out of memory
- The network is saturated
> wa is the percentage of CPU time spent waiting for I/O to complete, pointing at storage.

Q: free -h shows only 200 MB in the free column but 9 GB in available. What does that mean?
+ Plenty of memory is available because much of it is reclaimable cache
- The machine is about to run out of memory
- Swap is exhausted
- The kernel has a memory leak
> Linux uses spare memory for file cache. The available column estimates what can be used without swapping.

Q: In the USE method, what does saturation mean?
- How much a resource costs
+ Whether work is waiting because the resource is fully used
- The number of errors
- The age of the hardware
> Utilization is how busy, saturation is queued work, and errors are failures. All three are checked for each resource.
```

```cards
What does load average count? :: Tasks running, waiting for CPU, or blocked on I/O, averaged over 1, 5 and 15 minutes
What does USE stand for? :: Utilization, Saturation, Errors, checked for each resource
Which vmstat columns show swapping? :: si (swap in) and so (swap out)
Command to see per-disk utilization and latency? :: iostat -xz 1
```
