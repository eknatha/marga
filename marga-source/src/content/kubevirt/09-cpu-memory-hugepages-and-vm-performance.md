---
title: CPU, memory, hugepages and VM performance
minutes: 13
summary: Size VM CPU and memory correctly, understand overhead and limits, and use dedicated CPUs, hugepages and NUMA for latency sensitive workloads.
---

Most VM performance problems come from sizing and contention, not from the hypervisor. Know what the pod limits mean, then decide whether pinning or hugepages are worth the loss of flexibility.

## What you will learn

- Requests, limits and memory overhead
- Dedicated CPUs and NUMA
- Hugepages
- Overcommit and noisy neighbours

## Requests, limits and overhead

The virt-launcher pod needs memory for the guest plus overhead for QEMU, libvirt and device emulation. KubeVirt adds an overhead to the pod request automatically, and it grows with CPU count and devices. A pod limit equal to guest memory causes out-of-memory kills. A VM with CPU limits can be throttled even when the node is idle.

## Dedicated CPUs

```yaml
      domain:
        cpu:
          cores: 4
          dedicatedCpuPlacement: true
        resources:
          requests:
            memory: 8Gi
```

With the kubelet CPU manager set to `static` and a Guaranteed QoS pod (requests equal limits), the VM gets exclusive cores. That removes scheduling jitter from other pods. The cost is that those cores are no longer shared, so the node holds fewer VMs.

```diagram
title: What the VM pod needs from the node
node: guest | Guest memory | 0 | 1 | The memory the guest operating system sees. | If the app needs more, the guest swaps or kills processes. | store
node: over | QEMU and libvirt overhead | 1 | 0 | Extra memory for emulation, page tables and devices. | Missing from the limit, it causes OOM kills. | process
node: pod | Pod request and limit | 2 | 1 | The sum the scheduler and kubelet enforce. | A limit below the sum kills the container. | service
node: cpu | Dedicated CPUs | 1 | 2 | Exclusive cores from the static CPU manager. | Needs Guaranteed QoS and integer CPU counts. | service
node: huge | Hugepages | 0 | 2 | Large memory pages reserved on the node. | Pages must be preallocated or the VM will not start. | store
edge: guest | pod
edge: over | pod
edge: cpu | pod
edge: huge | pod
```

## Hugepages

`memory.hugepages.pageSize: 1Gi` or `2Mi` backs guest memory with large pages, reducing translation overhead for databases and low latency software. The node must have hugepages reserved at boot or by configuration.

## Overcommit and noisy neighbours

Requests lower than limits pack more VMs per node, but a busy neighbour can steal CPU. Watch CPU steal and throttling metrics, keep critical VMs on Guaranteed QoS, and separate noisy workloads with node pools.

## Incident: The VM killed by its own pod

> **Incident:** A healthy VM restarted overnight with OOMKilled.

```console
$ kubectl describe pod virt-launcher-app01 | grep -A3 'Last State'
    Last State:  Terminated
      Reason:    OOMKilled
$ kubectl get pod virt-launcher-app01 -o jsonpath='{.spec.containers[0].resources.limits.memory}'
8Gi
```

The guest had 8 GiB and the pod limit was also 8 GiB. QEMU overhead pushed the container over its limit. Raising the pod memory limit above the guest size stopped the kills.

## Common mistakes

- Setting the pod memory limit equal to the guest memory
- Pinning CPUs for every VM
- Using hugepages without reserving them first
- Ignoring CPU throttling on VMs with CPU limits

```quiz
Q: What must a pod limit cover for a VM?
+ Guest memory plus overhead
- Only the guest memory :: No.
- Only the image size :: No.
- Nothing :: No.
> QEMU needs extra room.

Q: What does dedicatedCpuPlacement need?
+ Static CPU manager and Guaranteed QoS
- A bigger image :: No.
- Hugepages :: No.
- Multus :: No.
> Exclusive cores require both.

Q: What do hugepages reduce?
+ Memory translation overhead
- Image size :: No.
- Network hops :: No.
- Login time :: No.
> Larger pages mean fewer lookups.

Q: What causes noisy neighbour problems?
+ Overcommitted shared CPU
- Too few labels :: No.
- Short names :: No.
- Idle nodes :: No.
> Busy neighbours steal cycles.
```

```cards
Overhead :: Extra pod memory used by the VM runtime
Guaranteed QoS :: A pod class where requests equal limits
Hugepages :: Large memory pages used to reduce translation cost
CPU manager :: The kubelet feature that can give pods exclusive cores
NUMA :: Memory layout where some memory is closer to some cores
```
