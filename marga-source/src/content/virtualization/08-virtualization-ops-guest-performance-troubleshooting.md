---
title: Virtualization operations: guest performance troubleshooting
minutes: 12
summary: Find whether slowness comes from the guest, the host, storage or the network, using paired views from inside the guest and on the hypervisor.
---

"The VM is slow" can mean the application, the guest operating system, the hypervisor, shared storage or the network. The fastest way to find the layer is to compare two views of the same moment: what the guest sees and what the host sees.

## What you will learn

- A layered method for guest slowness
- Paired guest and host checks for CPU, memory, disk and network
- Virtio drivers, guest agents and common misconfigurations
- When to move, resize or fix the guest

## Method: top-down, then bottom-up

1. **Define the symptom** and the time window. Does it affect one guest, many guests on one host, or many hosts?
2. **Inside the guest**: check the USE signals (CPU, memory, disk, network), the application and the kernel log.
3. **On the host**: check the same resources for this guest and for the host overall.
4. **Shared layers**: storage latency, network paths and the management plane.

If many guests on one host slow down together, suspect the host or its storage. If only one guest slows down, look at its own configuration or load first.

## CPU and memory pairs

| Guest signal | Host check |
|---|---|
| High `%steal` | Host CPU pressure, vCPU to core ratio |
| High load, low CPU use | Guest I/O wait; host disk latency |
| Memory pressure, swapping | Balloon size, host free memory |
| Single vCPU saturated | Guest app is single-threaded |

```console
$ virsh domstats --balloon --cpu-total vm-api-03
$ virsh vcpuinfo vm-api-03
$ virt-top -n 1
```

If the balloon driver has taken memory from the guest (`balloon.current` below `balloon.maximum`) while the guest swaps, the host is short on memory.

## Disk and network pairs

```console
$ iostat -xz 1 3
$ virsh domblkstat vm-api-03 vda --human
$ virsh domiflist vm-api-03
$ virsh domifstat vm-api-03 vnet5
```

Compare the guest's `await` with the latency at the storage layer. A large gap points to the hypervisor's I/O path (queueing, throttles); both high points at storage. For network, a growing `drop` count on the host's `vnet` interface while the guest sends normally means the host side is dropping, perhaps because of a saturated bridge, a full qdisc or a throttle. Use **virtio** drivers (`virtio-blk` or `virtio-scsi`, `virtio-net`) with multiqueue for busy guests; emulated devices such as IDE or e1000 are much slower, and are a classic silent cause.

## Configuration checks

Check the XML for a sensible CPU model (host-passthrough or a modern model for performance), `cache` and `io` modes on disks, the machine type, whether the guest agent is connected, and clock settings. Time drift in guests can break certificates and clustering, so use `chrony` with the KVM clock.

```predict
Q: Many guests on one host show high disk await at the same time, but another host's guests are fine. Where do you look first?
???
At that host and its storage path: the host's disks or multipath links, the shared storage backend and a noisy guest generating I/O on the host.
> Common symptoms across guests point below them.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Virtualization operations: guest performance... fits together
node: n1 | Method: top-down, then bottom-up | 0 | 0 | Define the symptom and the time window. Does it affect one guest, many guests on one host, or many hosts? | Diagnosing only inside the guest. | process
node: n2 | CPU and memory pairs | 1 | 1 | If the balloon driver has taken memory from the guest (balloon.current below balloon.maximum) while the guest swaps, the host is short on memory. | Ignoring balloon and host memory pressure. | process
node: n3 | Disk and network pairs | 2 | 0 | Compare the guest's await with the latency at the storage layer. | Leaving emulated devices on busy guests. | store
node: n4 | Configuration checks | 3 | 1 | Check the XML for a sensible CPU model (host-passthrough or a modern model for performance), cache and io modes on disks, the machine type, whether the guest agent is... | Resizing a guest before locating the bottleneck. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The slow network inside the hypervisor

> **Incident:** File transfers between two guests on the same host topped out at a small fraction of what the 10 Gb/s network should allow.

```console
$ virsh dumpxml vm-files-01 | grep -A3 "<interface"
<interface type='bridge'>
  <model type='e1000'/>
$ ethtool -S vnet4 | grep -i drop
     rx_dropped: 183921
```

The guest used the emulated `e1000` network card, which consumes a lot of CPU in the hypervisor, and a single-queue configuration. After changing the model to `virtio` with multiqueue and installing the paravirtual driver in the guest, throughput grew several times and the drops disappeared. The team made virtio the default in their guest templates and added a check for emulated devices to their audit scripts.

## Common mistakes

- Diagnosing only inside the guest
- Leaving emulated devices on busy guests
- Ignoring balloon and host memory pressure
- Resizing a guest before locating the bottleneck

```quiz
Q: What is the best way to locate a performance problem in a VM?
+ Compare what the guest sees with what the host sees
- Restart the guest first :: Loses evidence.
- Add more vCPUs :: May not address the cause.
- Wait and see :: Not a method.
> Use paired views.

Q: Which network model is generally faster for guests?
+ virtio-net
- e1000 :: Emulated, slower.
- rtl8139 :: Emulated, slower.
- No NIC :: Cannot network.
> Paravirtual drivers are efficient.

Q: Many guests on one host are slow together. What does that suggest?
+ A host-level or shared-resource problem
- Many unrelated application bugs :: Unlikely.
- A DNS typo :: Unrelated.
- A browser issue :: Unrelated.
> Correlation across guests points below them.

Q: What does a shrunk balloon with guest swapping suggest?
+ The host is short on memory and reclaimed it from the guest
- The guest has too many disks :: Not related.
- The network is fast :: Not related.
- The guest is encrypted :: Not related.
> Memory is taken by ballooning.
```

```cards
Paired views :: guest metrics and host metrics for the same moment
virtio :: paravirtual drivers for disk and network
Balloon :: mechanism for the host to reclaim guest memory
domstats :: host-side counters for a guest
Template defaults :: virtio, guest agent, sane CPU model
```
