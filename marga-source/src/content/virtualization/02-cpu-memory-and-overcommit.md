---
title: CPU, memory and overcommit
minutes: 15
summary: Learn how vCPUs and memory are shared between guests, what overcommit means, and how to spot a crowded host.
---

Cloud and private cloud hosts rarely give every guest dedicated hardware. They promise more virtual CPUs and memory than exist, and rely on guests not asking for it all at once. That is **overcommit**. It saves money until the day it does not.

## What you will learn

- How virtual CPUs are scheduled onto physical cores
- Memory overcommit, ballooning, KSM and swapping
- CPU ready time and steal time, the signs of a crowded host
- NUMA and why a large guest can run slower than a small one

## Virtual CPUs

A **vCPU** is a thread of the host that runs a guest's CPU. If a host has 16 cores (32 with hyper-threading) and the guests together have 80 vCPUs, the ratio is 2.5 vCPUs per thread. Light workloads often tolerate 4 to 1 or more, busy production databases need close to 1 to 1.

When more vCPUs want to run than there are free threads, some wait. The guest sees this as **steal time**, shown as `st` in `top` inside a Linux guest. VMware shows the same idea as **CPU ready**.

```console
$ top -bn1 | head -4 | tail -2
%Cpu(s): 22.0 us,  6.0 sy,  0.0 ni, 54.0 id,  0.0 wa,  0.0 hi,  0.0 si, 18.0 st
```

Eighteen percent steal means the guest wanted CPU and the host could not give it. The guest looks idle at 54 percent, yet it is slow. The fix is on the host: move guests away, reduce vCPU counts, or add hardware.

## Memory

Memory is the harder resource, because a guest that is out of memory fails instead of slowing down.

- **Ballooning** lets the host ask a guest driver to take memory back. The guest swaps or drops cache to comply.
- **KSM (kernel samepage merging)** shares identical pages between guests. It saves memory and costs some CPU.
- **Host swap** is the last resort. A guest whose memory is swapped by the host becomes very slow, because the guest does not know.
- **Huge pages** reduce overhead for large guests such as databases.

```console
$ free -m
               total        used        free      shared  buff/cache   available
Mem:          262144      249910        1210         312       11024        9800
Swap:          32768       14200       18568
```

When the host itself starts using swap with guests running, memory is overcommitted too far. A common rule is to keep memory overcommit near 1 to 1 for production, and to allow more only where guests are idle and can be paused.

## NUMA

Large servers have several CPU sockets, each with memory attached. Reading memory from another socket is slower. A guest bigger than one socket may span both and lose speed. Where possible, pin large guests to one NUMA node, or size them to fit.

## Incident: The Monday morning slowdown

> **Incident:** Every Monday at 09:00 the web guests slowed, yet their graphs showed low CPU.

```console
guest$ top -bn1 | grep Cpu
%Cpu(s): 15.0 us,  4.0 sy,  0.0 ni, 40.0 id,  0.0 wa,  0.0 hi,  0.0 si, 41.0 st
host$ virsh nodeinfo | grep -E 'CPU\(s\)|Memory'
CPU(s):              32
Memory size:         268435456 KiB
host$ virsh list | wc -l
39
```

Forty-one percent steal showed the guests were waiting for the host. Thirty-six running guests shared 32 threads, and a weekly batch of reports started at 09:00 on the same host. The team moved the batch guests to a separate host and set a limit of 3 vCPUs per thread for that cluster. Guest graphs inside the guest can hide this problem. Steal time and host CPU tell the truth.

```wrongpath
@goal Give every VM 16 vCPUs so none of them is ever short of CPU.
@wrong
# 20 guests, each with <vcpu>16</vcpu> on a 32-core host
@result
$ top
%Cpu(s): ... 31.4 st
# guests report high load and slow responses
@why Many vCPUs make the scheduler find many free cores at once, so a guest with 16 vCPUs waits longer and steal time rises for everybody. More vCPUs is not more speed.
@right
# start small and measure
<vcpu>2</vcpu>
# watch steal time
vmstat 5 3
@after Size guests to their real needs, increase only when the guest is CPU bound, and watch steal time.
```

## Common mistakes

- Giving every guest many vCPUs "to be safe": more vCPUs can make scheduling worse
- Overcommitting memory on a host that runs databases
- Reading only guest CPU graphs and ignoring steal or ready time
- Starting a guest larger than a NUMA node without pinning

```quiz
Q: What does 18 percent steal time inside a guest mean?
+ The guest wanted CPU but the host could not run it at that moment
- The guest has a virus :: It does not indicate that.
- The guest swaps too much :: That is a memory sign.
- The disk is slow :: That would show as iowait.
> Steal is time the hypervisor gave to others.

Q: What is memory ballooning?
+ The host asks a guest driver to give memory back
- Adding RAM to a guest at boot :: That is not ballooning.
- Merging identical pages :: That is KSM.
- Compressing swap :: That is a different feature.
> The balloon driver inflates inside the guest.

Q: Why can a guest larger than one NUMA node be slower?
+ Some memory is attached to another socket and is slower to reach
- The hypervisor refuses to start it :: It starts, but slower.
- NUMA disables virtio :: It does not.
- It uses more disk :: NUMA concerns memory.
> Cross-socket access costs time.

Q: Which workload should have close to 1 to 1 vCPU overcommit?
+ A busy production database
- An idle test server :: Light loads tolerate more.
- A desktop in a lab :: Light loads tolerate more.
- A file share used once a week :: Light loads tolerate more.
> Sustained load needs real cores.
```

```cards
vCPU :: a host thread that runs a guest CPU
Overcommit :: promising more CPU or memory than exists
Steal time :: time a guest waited for the host CPU
CPU ready :: VMware name for the same wait
Ballooning :: host reclaims guest memory via a driver
NUMA :: memory attached to a specific CPU socket
```
