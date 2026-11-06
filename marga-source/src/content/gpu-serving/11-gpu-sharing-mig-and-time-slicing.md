---
title: GPU sharing: MIG, time-slicing and MPS
minutes: 12
summary: Share one GPU among several workloads with MIG partitions, time-slicing or MPS and understand isolation, performance and fit.
---

Giving each small job a whole GPU wastes money. Sharing is possible in several ways, and they differ mostly in how well jobs are isolated from each other.

## What you will learn

- How MIG partitions a GPU
- How time-slicing and MPS differ
- Requesting shared GPUs in Kubernetes
- Choosing a method by workload

## MIG

**Multi-Instance GPU** on supported data center GPUs splits a card into up to seven instances, each with its own memory, cache and compute. A fault or heavy use in one instance does not affect others.

```bash
nvidia-smi -i 0 -mig 1
nvidia-smi mig -cgi 1g.10gb,1g.10gb,2g.20gb -C
nvidia-smi -L
```

In Kubernetes the GPU Operator advertises slices as resources such as `nvidia.com/mig-1g.10gb`.

```yaml
resources:
  limits:
    nvidia.com/mig-1g.10gb: 1
```

## Time-slicing and MPS

**Time-slicing** makes several pods share a GPU by taking turns. It works on any GPU but gives no memory isolation, so one pod can exhaust memory and others fail, and latency is unpredictable.

```yaml
# device plugin config: advertise each GPU as 4 shares
sharing:
  timeSlicing:
    resources:
      - name: nvidia.com/gpu
        replicas: 4
```

**MPS** lets processes run kernels at the same time and can raise utilization for many small workloads from one user, with limited isolation.

## Choosing

Use **MIG** for multi-tenant or latency-sensitive inference. Use **time-slicing** for development, notebooks and tests where interference is acceptable. Use **whole GPUs** for large models and training. Monitor per-slice memory and utilization, and set limits so that one team cannot take all slices.

## Incident: One notebook starved the rest

> **Incident:** A shared GPU ran out of memory because one pod took almost all of it.

```console
CUDA error: out of memory
nvidia-smi: 79 GiB used by pid 4412
3 neighbouring pods failed to start
```

Time-slicing gave four pods one card but no memory limits, and one notebook loaded a huge tensor. The team moved shared workloads to MIG slices with fixed memory and kept time-slicing only for short-lived development sessions with quotas.

## Common mistakes

- Using time-slicing for production inference
- Forgetting that time-slicing has no memory isolation
- Creating MIG layouts that waste slices
- No quotas on shared GPUs

```quiz
Q: What does MIG give?
+ Hardware-isolated GPU partitions
- Faster disks :: No.
- More nodes :: No.
- Encryption :: No.
> Each slice has its own memory.

Q: Does time-slicing isolate memory?
+ No
- Yes :: No.
- Always :: No.
- Only with MIG :: No.
> Pods share memory space.

Q: Which suits multi-tenant inference?
+ MIG
- Time-slicing :: No.
- No limits :: No.
- A shared notebook :: No.
> Isolation protects latency.

Q: Where is a MIG resource requested?
+ In container resource limits
- In a Dockerfile :: No.
- In DNS :: No.
- In a ConfigMap only :: No.
> Kubernetes schedules it as a resource.
```

```cards
MIG :: Multi-Instance GPU partitioning
Time-slicing :: Sharing a GPU by taking turns
MPS :: Multi-Process Service for concurrent kernels
GPU Operator :: Installs and manages NVIDIA components in Kubernetes
```
