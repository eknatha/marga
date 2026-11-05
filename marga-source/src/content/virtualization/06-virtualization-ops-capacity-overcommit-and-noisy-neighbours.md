---
title: Virtualization operations: capacity, overcommit and noisy neighbours
minutes: 12
summary: Plan host capacity with sensible overcommit ratios, spot CPU steal, memory ballooning and I/O contention, and place virtual machines so one guest cannot starve others.
---

A hypervisor host shares CPU, memory, disk and network among guests. Overcommit is what makes virtualization economical, and contention is its price. Operations means choosing ratios with evidence, watching the right signals and moving guests before users feel pain.

## What you will learn

- CPU, memory and storage overcommit and safe starting ratios
- Signals of contention: steal, ready time, ballooning, swapping and I/O wait
- NUMA, pinning and huge pages for demanding guests
- Placement and limits that contain noisy neighbours

## Overcommit by resource

- **CPU** can be overcommitted well, because most guests are idle most of the time. Common starting points are 4:1 virtual to physical cores for general workloads, lower (1:1 or 2:1) for latency-sensitive or heavy compute guests. Measure the real contention, not the ratio.
- **Memory** is risky to overcommit. When the host runs out, it swaps or kills guests. Use modest ratios (often 1.0 to 1.5), enable ballooning and page sharing only with monitoring, and keep a reserve for the host.
- **Storage** can be thin-provisioned, but the pool must be watched, since a full pool freezes many guests at once.

Treat these as starting points to tune with data, because the right values depend on your workloads.

## Detect contention

Inside the guest: high **steal time** (`%st` in `top` or `vmstat`) means the guest wanted CPU and the host did not give it. On the host:

```console
$ virsh nodecpustats
$ virsh domstats --cpu-total --balloon --block --vcpu vm-web-01
$ virsh domblkstat vm-web-01 vda
$ virsh domifstat vm-web-01 vnet3
$ numastat -m | head -20
$ cat /proc/pressure/cpu
```

The pressure stall information in `/proc/pressure/` shows how much time tasks wait for CPU, memory or I/O on the host. A host whose CPU pressure rises while guest steal rises is oversubscribed. Memory pressure plus swap use on the host is an emergency, because every guest suffers.

## NUMA, pinning and huge pages

Large hosts have several NUMA nodes, each with local memory. A guest whose vCPUs run on one node but whose memory sits on another pays a latency cost. For performance-sensitive guests, keep vCPUs and memory on the same node (NUMA-aware placement), pin vCPUs to dedicated cores, and use huge pages to reduce page table overhead. These guests give up flexibility for predictability, so reserve them a dedicated host pool and do not overcommit it.

## Contain noisy neighbours

Set limits and shares so a single guest cannot take everything: CPU shares and quotas, disk I/O throttling (IOPS and bandwidth) and network rate limits through libvirt or the cloud layer's flavors. Separate workload classes by host aggregate: a general pool with overcommit, a premium pool without it, a storage-heavy pool. Keep headroom to evacuate the largest host (N+1) and move guests early using live migration when a host trends toward contention.

```predict
Q: A guest shows 25 percent steal while its own processes are idle. What does it mean?
???
The hypervisor is not giving the guest the CPU it asks for: the host is oversubscribed. Move guests away, lower the ratio or reserve capacity.
> Steal is lost CPU time.
```

## Incident: The Monday morning stalls

> **Incident:** Every Monday at 09:00 several unrelated application servers on the same host became slow for about 20 minutes.

```console
$ virsh domstats --cpu-total vm-batch-07 | grep cpu.time
cpu.time=48230193847211
$ cat /proc/pressure/cpu
some avg10=62.40 avg60=58.12 avg300=40.77 total=19238421831
```

A batch guest, scheduled to run weekly reports at 09:00, had 16 vCPUs and used all of them, while the host had 40 cores for 160 vCPUs of other guests. The other guests saw steal times above 20 percent. The team moved the batch guest to a dedicated aggregate with its own cores, set CPU shares, and added an alert on host CPU pressure and guest steal.

## Common mistakes

- Overcommitting memory like CPU
- Judging by the ratio instead of measured contention
- Mixing latency-sensitive and batch guests on one pool
- No spare capacity to evacuate a failed host

```quiz
Q: What does high steal time inside a guest indicate?
+ The host is not providing the CPU the guest requests
- A disk fault :: Not what steal measures.
- A network loop :: Not what steal measures.
- A bad certificate :: Unrelated.
> It is contention at the hypervisor.

Q: Which resource is riskiest to overcommit?
+ Memory
- Idle CPU :: Usually tolerated well.
- Thin storage under monitoring :: Manageable with alerts.
- Tags :: Not a resource.
> Running out of RAM harms every guest.

Q: Why use NUMA-aware placement?
+ Keeps vCPUs near their memory to avoid remote-access latency
- It increases overcommit :: Not its purpose.
- It encrypts the guest :: Not its purpose.
- It removes the hypervisor :: Not possible.
> Locality improves predictability.

Q: How do you stop a noisy guest from starving others?
+ Apply CPU, disk I/O and network limits and separate pools by workload
- Give it more vCPUs :: Makes it worse.
- Disable monitoring :: Hides the issue.
- Place all guests on one host :: Increases contention.
> Limits and isolation contain the impact.
```

```cards
Steal time :: CPU time the guest wanted but the host did not give
Memory overcommit :: keep ratios modest and monitored
PSI :: /proc/pressure shows how long tasks wait for resources
NUMA locality :: keep vCPUs and memory on the same node
N+1 headroom :: enough spare capacity to evacuate the largest host
```
