---
title: GPUs on Kubernetes
minutes: 14
summary: Schedule GPU workloads with the device plugin, understand why GPUs are whole units, and read the Pending-pod messages.
---

Kubernetes does not know what a GPU is until you tell it. Once you do, GPUs are scheduled like other resources, with a few differences that cause most of the trouble.

## What you will learn

- The NVIDIA device plugin and GPU Operator
- Requesting GPUs, and why they are whole numbers
- Taints, node pools and cost
- Sharing GPUs with MIG and time-slicing

## How GPUs reach pods

A GPU node needs three things: the NVIDIA driver, a container runtime hook that exposes devices to containers, and the **device plugin**, a daemonset that tells the kubelet how many GPUs the node has. The **NVIDIA GPU Operator** installs and manages these together. When it works, the node reports an extra resource:

```console
$ kubectl describe node gpu-node-1 | grep -A2 'nvidia.com/gpu'
  nvidia.com/gpu:     2
...
  nvidia.com/gpu     0           0
```

A pod asks for GPUs in its container limits:

```text
resources:
  limits:
    nvidia.com/gpu: 1
```

Extended resources such as this one must be set in `limits` (the request, if given, must equal it), and they are **integers**: you cannot ask for half a GPU, and they are not overcommitted. One pod holds its GPU even if it is idle.

## Keeping other pods away

GPU nodes are expensive. Taint them so that ordinary pods do not land there and keep the node busy:

```text
kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule
```

GPU pods then need a matching **toleration**. A **node pool** or node group of GPU machines that scales from zero lets you pay only while jobs run, with some start-up delay.

## When a pod stays Pending

```console
$ kubectl describe pod llm-0 | tail -4
Events:
  Warning  FailedScheduling  default-scheduler  0/6 nodes are available: 2 Insufficient nvidia.com/gpu, 4 node(s) had untolerated taint {nvidia.com/gpu: present}.
```

Read this as: two nodes have GPUs but all are in use, and the other four have a taint the pod does not tolerate. The fix is to free a GPU, add capacity, or fix the toleration, depending on which line matches your intent. If no node shows `nvidia.com/gpu` in its capacity at all, the device plugin or driver is not working: check the daemonset pods and the node logs.

## Sharing a GPU

A whole GPU for a small model wastes money. Options:

- **MIG (Multi-Instance GPU)**: on some NVIDIA data centre cards, one GPU is split into isolated slices with their own memory and compute. Pods request a slice, such as `nvidia.com/mig-1g.10gb`.
- **Time-slicing**: several pods take turns on one GPU. There is no memory isolation, so one pod can exhaust memory and crash others, and latency becomes uneven.
- **MPS** and other sharing modes exist for specific cases.

MIG gives predictable performance and isolation. Time-slicing is for development and light, tolerant workloads.

## Multi-GPU and multi-node

A large model needs several GPUs on **the same node** where possible, since links between GPUs inside a node (NVLink) are much faster than the network. A pod that asks for 4 GPUs needs a node with 4 free ones, and a cluster full of 2-GPU nodes can never schedule it. Distributed training across nodes needs fast networking and a scheduler that starts all pieces together (gang scheduling), or the job can deadlock with half its pods running.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GPUs on Kubernetes fits together
node: n1 | How GPUs reach pods | 0 | 0 | A GPU node needs three things: the NVIDIA driver, a container runtime hook that exposes devices to containers, and the device plugin, a daemonset that tells the kubelet... | Forgetting that drivers and the operator version must match the node image. | process
node: n2 | Keeping other pods away | 1 | 1 | GPU nodes are expensive. | Leaving GPU nodes untainted so system pods consume capacity. | process
node: n3 | When a pod stays Pending | 2 | 0 | Read this as: two nodes have GPUs but all are in use, and the other four have a taint the pod does not tolerate. | Requesting GPUs only in requests, or asking for fractions. | process
node: n4 | Sharing a GPU | 3 | 1 | A whole GPU for a small model wastes money. | Using time-slicing for production with strict latency. | process
node: n5 | Multi-GPU and multi-node | 4 | 0 | A large model needs several GPUs on the same node where possible, since links between GPUs inside a node (NVLink) are much faster than the network. | A pod that asks for 4 GPUs needs a node with 4 free ones, and a cluster full of 2-GPU nodes can never schedule it. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: Eight GPUs and a Pending pod

> **Incident:** A team had eight free GPUs in the cluster and their four-GPU job stayed Pending.

```console
$ kubectl get nodes -l accelerator=nvidia -o custom-columns=NAME:.metadata.name,GPU:.status.allocatable.nvidia\.com/gpu
NAME          GPU
gpu-node-1    2
gpu-node-2    2
gpu-node-3    2
gpu-node-4    2
$ kubectl describe pod trainer-0 | grep FailedScheduling
0/4 nodes are available: 4 Insufficient nvidia.com/gpu.
```

The cluster did have eight free GPUs, but spread across four nodes with two each, and a pod must fit on one node. The team created a node pool of 8-GPU machines for large jobs and kept the 2-GPU nodes for small ones. The aggregate number of free GPUs was not the number that mattered.

## Common mistakes

- Leaving GPU nodes untainted so system pods consume capacity
- Requesting GPUs only in requests, or asking for fractions
- Using time-slicing for production with strict latency
- Forgetting that drivers and the operator version must match the node image

```quiz
Q: How must a pod request a GPU?
+ In container limits as nvidia.com/gpu with a whole number
- As a fraction like 0.5 :: GPUs are integers.
- In an annotation only :: Use resources.limits.
- By node name only :: Use a resource request.
> Extended resources are whole units.

Q: Why taint GPU nodes?
+ So ordinary pods do not occupy expensive GPUs
- To make GPUs faster :: No.
- To hide them from monitoring :: No.
- To encrypt traffic :: No.
> Only GPU pods with a toleration land there.

Q: What is MIG?
+ Splitting a GPU into isolated slices with their own memory and compute
- A scheduler :: No.
- A driver bug :: No.
- A network protocol :: No.
> It gives predictable sharing.

Q: Eight GPUs are free in total across four 2-GPU nodes. Why can a 4-GPU pod not run?
+ A pod must fit on one node
- Kubernetes limits GPUs to eight :: No.
- GPUs cannot be shared :: Not the reason.
- The pod has no image :: Not relevant.
> Free capacity must be on a single node.
```

```cards
Device plugin :: tells the kubelet about GPUs on a node
GPU Operator :: installs drivers and plugin together
nvidia.com/gpu :: extended resource for GPUs
Taint :: node marker that repels pods
MIG :: hardware slices of one GPU
Time-slicing :: pods take turns on one GPU
```
