---
title: Finding CPU, memory and I/O hogs
minutes: 14
summary: Use top, vmstat, iostat and pidstat to tell CPU, memory and disk problems apart and find the process responsible.
---

When a server feels slow, the first job is to find out what it is short of. Linux gives clear signals for CPU, memory and disk, and each has a standard command. Learning to read those signals in order turns a vague complaint into a named resource and a named process.

## What you will learn

- Load average, CPU states and the run queue
- Memory, cache and swap: what is really used
- Disk latency and utilisation with iostat
- A short checklist for the first minute

## The first minute

```console
$ uptime
 14:02:11 up 41 days, load average: 9.80, 8.20, 5.10
$ nproc
4
$ vmstat 1 3
procs --memory-- --swap-- --io-- --cpu--
 r  b  swpd   free   si so  bi  bo  us sy id wa
12  3  81920  91000   0  0 220 900  20 10 10 60
```

Load average 9.8 on 4 cores means more runnable work than cores. In `vmstat`, `r` is the run queue, `b` processes blocked on I/O, `si/so` swap in and out, and `wa` the share of time the CPU waits for disk. Here `wa` is 60: the cores are waiting, not computing.

## Which resource?

| Signal | Points to |
|---|---|
| `us` + `sy` high, `wa` low | CPU bound |
| `wa` high, disk `%util` near 100 | Disk bound |
| `si/so` above 0, little free memory | Memory pressure |
| Load high, CPU idle | Blocked on I/O or locks |

```console
$ iostat -x 1 2
Device  r/s   w/s  rkB/s  wkB/s  await  %util
sda     310   260  24000  18000   42.0   99.5
$ pidstat -d 1 1
UID  PID   kB_rd/s  kB_wr/s  Command
0    9001  21000    120      backup-tool
```

`await` is the average time a request waits, in milliseconds; `%util` near 100 means the device is saturated. `pidstat -d` names the process doing the I/O.

```diagram
title: The first-minute performance check
node: load | Load and CPU | 0 | 0 | uptime and vmstat show load, run queue and CPU states. | High load alone does not say which resource is short.
node: mem | Memory and swap | 1 | 0 | free -m and vmstat si/so show pressure and swapping. | Cache is not used memory; look at available and swap activity.
node: disk | Disk | 2 | 0 | iostat -x shows await and %util per device. | One saturated disk slows everything that touches it. | store
node: who | Process | 3 | 0 | top, pidstat or iotop names the process responsible. | Fixing the wrong process leaves the real cause.
node: act | Action | 3 | 1 | Move, throttle, schedule or fix the offender. | Adding hardware before finding the cause hides waste.
edge: load | mem
edge: mem | disk
edge: disk | who
edge: who | act
```

## Memory is not what free first shows

Linux uses spare memory as cache, so "free" can look small on a healthy system. Read `available`. Real pressure shows as swap activity, the kernel killing processes (check `dmesg | grep -i oom`) or `si/so` above zero for long periods.

## Incident: The CPU nobody could find

> **Incident:** A slow application showed low CPU and high load, and teams added cores that changed nothing.

```console
$ vmstat 1 2
r b swpd free  si so bi bo us sy id wa
12 3 81920 91000 0 0 220 900 20 10 10 60
$ iostat -x 1 1
sda  await 42.0  %util 99.5
```

The backup job shared a disk with the database. Moving it to off-peak hours and a separate volume restored normal latency, and a dashboard now shows I/O wait next to CPU.

## Common mistakes

- Adding CPU before checking I/O wait
- Reading free memory as used memory and panicking
- Looking at average numbers only and missing short spikes
- Killing the top process without understanding what it does

```quiz
Q: Load average is high and CPU idle is high. What is likely?
+ Processes are blocked waiting, often for disk
- The CPU is overloaded :: No.
- Memory is too large :: No.
- The network is down :: No.
> Idle CPU with high load means waiting on I/O or locks.

Q: Which column in vmstat shows CPU time waiting for disk?
+ wa
- us :: No.
- sy :: No.
- id :: No.
> wa is I/O wait. The lesson section above explains why.

Q: What does iostat %util near 100 mean?
+ The device is saturated
- The device is idle :: No.
- The disk is encrypted :: No.
- The filesystem is read-only :: No.
> The disk is busy nearly all the time.

Q: How do you find which process is writing to disk?
+ pidstat -d or iotop
- uptime :: No.
- hostname :: No.
- ls /etc :: No.
> They show per-process I/O.
```

```cards
Load average :: The average number of runnable or waiting tasks over 1, 5 and 15 minutes
I/O wait :: Time the CPU is idle because it waits for disk
await :: Average time a disk request waits, in milliseconds
Swap :: Disk space used as extra memory
OOM killer :: The kernel feature that kills processes when memory runs out
```
