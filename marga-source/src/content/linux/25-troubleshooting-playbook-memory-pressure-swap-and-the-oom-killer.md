---
title: Troubleshooting playbook: memory pressure, swap and the OOM killer
minutes: 12
summary: Read free, meminfo and kernel logs correctly, spot swap thrashing and leaks, and tell a host-level OOM kill from a container memory limit.
---

Linux uses spare memory for caches, so "free memory is low" is usually normal. The real questions are whether applications can still get memory, whether the system is swapping heavily, and whether the kernel has killed something. This lesson gives you a way to answer each.

## What you will learn

- Read `free` and `/proc/meminfo` without panic over the page cache
- Spot swap thrashing in `vmstat`
- Find OOM kills in the kernel log and understand why a victim was chosen
- Tell a host OOM from a cgroup or container limit kill

## Available, not free

```console
$ free -m
$ grep -E 'MemAvailable|SwapTotal|SwapFree|Dirty' /proc/meminfo
$ ps -eo pid,rss,cmd --sort=-rss | head -5
```

The column that matters is **available**: memory that can be given to programs without swapping, including reclaimable cache. Low "free" with healthy "available" is fine. Sort by resident set size (`rss`) to find the large processes, and watch whether one grows over time, which suggests a leak.

## Swap and thrashing

A little swap use can be fine, since idle pages move out. The danger is **thrashing**: the system continuously swaps pages in and out, and everything slows.

```console
$ vmstat 1 5
procs -----memory---- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   si   so    bi    bo   in   cs us sy id wa st
 3  6 4194304  81200  912  1604  8800  9100  900  1500  4  6 20 70  0
```

High `si` and `so` together with high `wa` show thrashing. The cure is to free memory (stop or restart the biggest consumer, reduce limits), not to add more swap. Setting `vm.swappiness` lower makes the kernel prefer dropping cache over swapping, which can help latency-sensitive servers.

## The OOM killer

When memory cannot be reclaimed, the kernel's OOM killer picks a process with a high `oom_score` and ends it.

```console
$ dmesg -T | grep -i -E 'out of memory|killed process'
$ journalctl -k --since "1 hour ago" | grep -i oom
$ cat /proc/2314/oom_score
```

The log shows who was killed, how much memory it used and the state of memory at that time. The victim is often the largest process, not necessarily the one that leaked. You can protect critical processes with `oom_score_adj` (a negative value) in a systemd unit using `OOMScoreAdjust=`, but protecting one process shifts the kill to another, so fix the cause as well.

## Host or container?

Containers run in cgroups with their own limit. When a container exceeds `memory.max`, the kernel kills a process inside that cgroup, even if the host has plenty of memory free. In Kubernetes this shows as `OOMKilled` with exit code 137. Check the limit, the working set and whether the runtime (for example a JVM heap setting) is sized against the limit, not against the host.

```predict
Q: A pod is OOMKilled although the node has 20 GiB free. Why?
???
The pod hit its own memory limit (cgroup), so the kernel killed it regardless of free node memory. Raise the limit or reduce the application's memory use.
> Limits are enforced per cgroup.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Troubleshooting playbook: memory pressure, swap... fits together
node: n1 | Available, not free | 0 | 0 | The column that matters is available: memory that can be given to programs without swapping, including reclaimable cache. | Treating low "free" memory as a problem. | process
node: n2 | Swap and thrashing | 1 | 1 | A little swap use can be fine, since idle pages move out. | Adding swap to hide a leak. | process
node: n3 | The OOM killer | 2 | 0 | When memory cannot be reclaimed, the kernel's OOM killer picks a process with a high oom_score and ends it. | The OOM killer When memory cannot be reclaimed, the kernel's OOM killer picks a process with a high oom_score and ends it. | process
node: n4 | Host or container? | 3 | 1 | Containers run in cgroups with their own limit. | Sizing runtime heaps against the host, not the container limit. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The service that died at night

> **Incident:** A Java service restarted every few hours with no error in its own log, and the host showed plenty of free memory.

```console
$ dmesg -T | grep -i killed
Memory cgroup out of memory: Killed process 5120 (java) total-vm:9400000kB, anon-rss:2095000kB
$ cat /sys/fs/cgroup/system.slice/app.service/memory.max
2147483648
```

The service ran in a systemd cgroup with a 2 GiB limit, but the JVM was configured with a 3 GiB heap. The kernel killed it as soon as the heap grew past the limit, and the application never had a chance to log. The team set the heap to about 70 percent of the limit, added a memory alert on the working set and kept the kernel log in their incident checklist.

## Common mistakes

- Treating low "free" memory as a problem
- Adding swap to hide a leak
- Sizing runtime heaps against the host, not the container limit
- Looking only at application logs, which never see a SIGKILL

```quiz
Q: Which memory figure shows what programs can still get?
+ Available
- Free :: Free ignores reclaimable cache.
- Buffers only :: A small part of the picture.
- Swap total :: That is capacity, not availability.
> Use available when judging pressure.

Q: What indicates swap thrashing?
+ High si and so together with high iowait
- Low load average :: Thrashing raises load.
- High free memory :: Thrashing happens when memory is short.
- A large page cache :: Cache is normal.
> Constant swapping slows everything.

Q: A container is killed with exit code 137 although the host has memory. Likely cause?
+ It exceeded its cgroup memory limit
- The host disk is full :: That does not give a memory kill.
- A DNS failure :: Unrelated.
- A bad image tag :: Unrelated.
> Cgroup limits are enforced separately.

Q: Where do you find proof that the OOM killer ran?
+ The kernel log, through dmesg or journalctl -k
- The application log only :: SIGKILL cannot be logged by the victim.
- The package manager history :: Unrelated.
- The cron log :: Unrelated.
> The kernel records every kill.
```

```cards
MemAvailable :: memory programs can still get without swapping
Thrashing :: heavy swap in and out with high iowait
OOM evidence :: dmesg or journalctl -k
Exit code 137 :: process killed by SIGKILL, often the OOM killer
Heap sizing :: set runtime memory against the container limit
```
