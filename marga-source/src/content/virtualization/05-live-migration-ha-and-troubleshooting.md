---
title: Live migration, high availability and troubleshooting
minutes: 15
summary: Understand how guests move between hosts without stopping, how HA restarts them after a failure, and how to diagnose common faults.
---

A host needs patching, or fails. The point of a virtual platform is that guests do not have to suffer for it.

## What you will learn

- Live migration and what it needs
- High availability, fencing and split brain
- Capacity planning for failure (N+1)
- A checklist for the faults you will meet

## Live migration

**Live migration** (VMware vMotion, KVM live migration) copies a running guest's memory from one host to another while it keeps running, then switches over in a short pause of tens of milliseconds. It makes host maintenance invisible to users.

Requirements usually include:

- A shared or replicated storage that both hosts can reach, or storage migration that copies the disk too
- Compatible CPU features: a guest that uses a new instruction cannot move to an older CPU, so clusters set a common **CPU model**
- A fast network between hosts for the memory copy
- Matching networks on both hosts, so the guest keeps its connectivity

```console
$ virsh migrate --live --persistent web-01 qemu+ssh://host-b/system
$ virsh list
 Id   Name   State
-------------------
```

A guest that dirties memory faster than the network can copy it may never converge. Throttling the guest, or using post-copy migration, solves that.

## High availability

**HA** restarts guests on another host after a host failure. It differs from migration: the guest does restart, with a short outage. The cluster must be sure the failed host is really off before it starts the same guest elsewhere, otherwise two copies write to one disk and corrupt it. That is the danger of **split brain**. **Fencing** (also called STONITH) cuts power or access to a suspect host to make sure it is down.

A cluster also needs **quorum**: a majority of nodes must agree on who is alive. With two nodes and no tie-breaker, a network split leaves each side unsure.

## Plan for failure

Spare capacity must exist for the guests that restart. **N+1** means the cluster can lose one host and still run everything. If every host runs at 85 percent memory, a failed host leaves guests with nowhere to go.

## Troubleshooting checklist

1. Is hardware virtualization on, and is `kvm` loaded?
2. Is there free memory on the host for the guest, with overcommit counted?
3. Is there free space in the storage pool, including snapshot deltas?
4. Is the disk file present, with the right permissions and SELinux or AppArmor labels?
5. Is the guest on the right network and VLAN?
6. Are guests waiting for CPU (steal or ready time)?

```console
$ journalctl -u libvirtd --since "10 min ago" | tail -3
libvirtd[1043]: internal error: qemu unexpectedly closed the monitor
libvirtd[1043]: cannot set up guest memory 'pc.ram': Cannot allocate memory
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Live migration, high availability and... fits together
node: n1 | Live migration | 0 | 0 | Live migration (VMware vMotion, KVM live migration) copies a running guest's memory from one host to another while it keeps running, then switches over in a short pause... | Running clusters at high memory use and calling it efficient. | process
node: n2 | High availability | 1 | 1 | HA restarts guests on another host after a host failure. | HA with no fencing. | process
node: n3 | Plan for failure | 2 | 0 | Spare capacity must exist for the guests that restart. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | Troubleshooting checklist | 3 | 1 | Is hardware virtualization on, and is kvm loaded? | Using a snapshot as the way to move a guest. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Maintenance that moved the problem

> **Incident:** Draining a host for patching started a chain of guest failures on the next host.

```console
$ virsh -c qemu+ssh://host-b/system nodeinfo | grep Memory
Memory size:         134217728 KiB
$ virsh -c qemu+ssh://host-b/system list | wc -l
19
$ virsh migrate --live batch-07 qemu+ssh://host-b/system
error: internal error: process exited while connecting to monitor: Cannot allocate memory
```

Host B already used almost all of its memory. The migration failed, and then the HA service on host B restarted two guests during the same minute and exhausted memory. The team set a rule that a host may hold at most 80 percent of its memory with guests, so one host can always be drained into the rest, and drained one host at a time.

## Common mistakes

- Running clusters at high memory use and calling it efficient
- Mixing CPU generations without a common CPU model
- HA with no fencing
- Using a snapshot as the way to move a guest

```quiz
Q: What must live migration copy while the guest keeps running?
+ Its memory, changing pages included
- Only the disk label :: Memory is the main work.
- Only the XML file :: The state in memory matters.
- Nothing, it restarts :: That is HA, not live migration.
> The guest switches over after a short pause.

Q: Why does a cluster need fencing?
+ To be sure a failed host is really off before restarting its guests elsewhere
- To speed up migration :: Not related.
- To save memory :: Not related.
- To encrypt disks :: Not related.
> Two writers on one disk corrupt it.

Q: What does N+1 capacity mean?
+ The cluster can lose one host and still run every guest
- One host per guest :: No.
- Every host runs at 100 percent :: That leaves no spare.
- One snapshot per guest :: Not related.
> Spare room must exist for restarts.

Q: A guest dirties memory faster than the network copies it. What happens in live migration?
+ It may never finish unless the guest is throttled or post-copy is used
- The migration always completes :: Not if memory changes too fast.
- The disk is deleted :: No.
- The host reboots :: No.
> Convergence depends on dirty rate.
```

```cards
Live migration :: moving a running guest between hosts
HA :: restart guests on another host after failure
Fencing :: forcing a suspect host off
Split brain :: two nodes believing they are in charge
Quorum :: majority vote of cluster nodes
N+1 :: spare capacity for one host failure
```
