---
title: GPU, AI infrastructure and LLM serving
summary: Memory sums, nvidia-smi, vLLM flags, Kubernetes GPU scheduling and the metrics that explain slow or failing inference.
module: gpu-serving
---

## Memory sum

| Item | Rule of thumb |
|---|---|
| Weights, 16-bit | parameters x 2 bytes (7B is about 14 GB) |
| Weights, 8-bit | parameters x 1 byte |
| Weights, 4-bit | parameters x 0.5 byte |
| KV cache | grows with context length x concurrent requests |
| Overhead | leave 10 to 20 percent free |

## Look at the GPU

```bash
nvidia-smi
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv
nvidia-smi dmon -c 5
nvidia-smi topo -m
```

> **Warning:** High memory use with low utilisation usually means the GPU is waiting for the CPU or the network, not that it is busy.

## Serve with vLLM

```bash
vllm serve meta-llama/Llama-3.1-8B-Instruct \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90 \
  --tensor-parallel-size 1
curl localhost:8000/v1/models
curl localhost:8000/metrics | grep -E "num_requests|cache_usage"
```

| Flag | Effect |
|---|---|
| `--max-model-len` | longest context, drives KV cache size |
| `--gpu-memory-utilization` | share of GPU memory the engine may use |
| `--tensor-parallel-size` | split the model over N GPUs |

## Kubernetes

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
tolerations:
- key: nvidia.com/gpu
  operator: Exists
  effect: NoSchedule
```

```bash
kubectl describe node gpu-1 | grep -A3 "nvidia.com/gpu"
kubectl get pods -A -o wide | grep -i nvidia
kubectl describe pod llm-0 | tail -15
```

## Signals to watch

| Metric | Meaning |
|---|---|
| time to first token | how long users wait to see output |
| tokens per second | generation speed |
| requests waiting | demand above capacity |
| KV cache usage | near 100 percent means queueing and evictions |
| GPU memory and utilisation | fit and efficiency |
| Xid errors in dmesg | hardware or driver faults |

## Quick GPU checks

```bash
nvidia-smi --query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu --format=csv
nvidia-smi dmon -c 3
kubectl describe node gpu-1 | grep -A3 nvidia.com/gpu
kubectl logs deploy/llm --tail=50
```

## Test a server

```bash
curl -s localhost:8000/v1/models
curl -s localhost:8000/v1/chat/completions -H "Content-Type: application/json" -d '{"model":"m","messages":[{"role":"user","content":"hi"}],"max_tokens":16}'
curl -s localhost:8000/metrics | grep num_requests
```

## Cautions

> **Danger:** Setting `--gpu-memory-utilization` near 1.0 leaves no room for spikes and invites out-of-memory crashes.

> **Warning:** `nvidia-smi --gpu-reset` and driver changes interrupt every process on the card. Drain the node first.

> **Warning:** Autoscaling a model server on CPU use does not work, as the work happens on the GPU. Use queue depth or latency.

> **Caution:** A long context grows the KV cache for every request. Set a maximum that fits your memory.