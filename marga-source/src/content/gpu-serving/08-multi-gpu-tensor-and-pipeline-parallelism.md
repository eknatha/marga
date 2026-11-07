---
title: Multi-GPU serving: tensor and pipeline parallelism
minutes: 12
summary: Split a model across GPUs with tensor and pipeline parallelism, understand interconnect needs and decide when replicas are better.
---

Large models need more memory than one GPU has. Splitting them works, but every split adds communication, so how and where you split changes speed dramatically.

## What you will learn

- Tensor versus pipeline parallelism
- Why interconnect bandwidth matters
- Reading the GPU topology
- When to scale with replicas instead

## Two ways to split

- **Tensor parallelism (TP):** every layer's weights are divided across GPUs, and GPUs exchange results at each layer. It reduces latency for a single request but needs very fast links.
- **Pipeline parallelism (PP):** each GPU holds a block of layers, and activations flow from stage to stage. Communication is lighter, but stages can sit idle without enough concurrent requests.

```bash
nvidia-smi topo -m
vllm serve meta/model-70b \
  --tensor-parallel-size 4 \
  --max-model-len 8192
```

## Topology

`nvidia-smi topo -m` shows how GPUs connect. **NV#** entries mean NVLink, which is fast. **PIX** or **PHB** mean paths through PCIe, which is slower. **SYS** crosses CPU sockets and is slowest. Choose GPUs that share fast links for the tensor-parallel group, and keep the group inside one node when possible.

## Replicas versus splitting

If a model fits on one GPU, run several independent replicas behind a load balancer. This gives near-linear throughput, no communication overhead and isolated failures. Split only when memory requires it, and then replicate the split group.

```bash
kubectl get pods -l app=llm -o wide
kubectl describe node gpu-node-3 | grep -A5 "nvidia.com/gpu"
```

Check that all pods of one tensor-parallel group are scheduled on the same node, using node affinity or a multi-GPU resource request.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Multi-GPU serving: tensor and pipeline parallelism fits together
node: n1 | Two ways to split | 0 | 0 | Tensor parallelism (TP): every layer's weights are divided across GPUs, and GPUs exchange results at each layer. | Tensor parallelism across slow links. | process
node: n2 | Topology | 1 | 1 | nvidia-smi topo -m shows how GPUs connect. | Ignoring topology when placing pods. | observe
node: n3 | Replicas versus splitting | 2 | 0 | If a model fits on one GPU, run several independent replicas behind a load balancer. | Splitting a model that fits on one GPU. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Slower with more GPUs

> **Incident:** Adding GPUs across nodes made serving slower.

```console
NCCL INFO Channel 00 via NET/Socket
tokens/s: 21 (single GPU: 34)
allreduce latency: high
```

The tensor-parallel group spanned two machines connected by regular Ethernet, so each layer waited on the network. The team kept tensor parallelism within a node with NVLink, used replicas to scale out and added a scheduling rule that keeps each group on one node.

## Common mistakes

- Tensor parallelism across slow links
- Splitting a model that fits on one GPU
- Ignoring topology when placing pods
- Using an odd GPU count that does not divide the model heads

```quiz
Q: When use replicas instead of splitting?
+ When the model fits on one GPU
- Never :: No.
- Only for training :: No.
- When there is no network :: No.
> Replicas scale cleanly.

Q: What does NVLink provide?
+ Fast GPU-to-GPU links
- DNS :: No.
- Storage :: No.
- A scheduler :: No.
> It speeds communication.

Q: Which command shows the GPU topology?
+ nvidia-smi topo -m
- ls :: No.
- df :: No.
- ps :: No.
> It shows link types.

Q: Where should a tensor-parallel group live?
+ Inside one node with fast links
- Across the internet :: No.
- Across regions :: No.
- Any random nodes :: No.
> Communication is frequent.
```

```cards
Tensor parallelism :: Splitting each layer across GPUs
Pipeline parallelism :: Assigning layer blocks to GPUs
NVLink :: High-bandwidth GPU interconnect
NCCL :: Library for fast GPU communication
```
