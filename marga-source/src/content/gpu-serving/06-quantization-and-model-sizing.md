---
title: Quantization and sizing a model for a GPU
minutes: 12
summary: Estimate GPU memory for weights and cache, understand quantization formats and choose a precision that fits your quality and cost needs.
---

Before choosing a GPU, you need to know how much memory the model will take. Most surprises come from forgetting the cache and overhead. Quantization is the main lever for fitting larger models into smaller, cheaper hardware.

## What you will learn

- Calculating memory for weights
- Why the KV cache and overhead matter
- Common quantization formats and trade-offs
- Testing quality before you commit

## The memory math

```python
def weights_gb(params_billion, bytes_per_param):
    return params_billion * bytes_per_param

for name, b in [("fp16", 2.0), ("int8", 1.0), ("int4", 0.5)]:
    print(name, weights_gb(70, b), "GB for a 70B model")
```

Weights for a 70B model are about 140 GB in FP16, 70 GB in INT8 and 35 GB at 4 bits. Add the **KV cache**, which grows with context length and concurrent requests, plus activations and runtime overhead. A rule of thumb is to keep 10 to 20 percent of GPU memory free and to budget the cache explicitly.

## Formats

- **FP16 or BF16:** the usual baseline, best quality, largest size.
- **FP8 and INT8:** about half the memory with small quality loss on modern hardware.
- **4-bit (AWQ, GPTQ, GGUF variants):** large savings, more quality risk, especially for small models and long reasoning.

Lower precision also reduces memory traffic, which often improves token rate, because decoding is limited by memory bandwidth.

## Test before you ship

```bash
# serve a quantized model and compare with the baseline on your own prompts
vllm serve ./llama-70b-awq --quantization awq --max-model-len 8192 --gpu-memory-utilization 0.90
python eval_prompts.py --endpoint http://localhost:8000/v1 --set support-tickets.jsonl
```

Use a task-specific evaluation set, not only public benchmarks. Compare accuracy, refusal behavior and formatting, and measure latency and throughput. Record the chosen format with the model version so everyone serves the same thing.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Quantization and sizing a model for a GPU fits together
node: n1 | The memory math | 0 | 0 | Weights for a 70B model are about 140 GB in FP16, 70 GB in INT8 and 35 GB at 4 bits. | Counting weights but not the KV cache. | process
node: n2 | Formats | 1 | 1 | FP16 or BF16: the usual baseline, best quality, largest size. | Filling GPU memory to 100 percent. | process
node: n3 | Test before you ship | 2 | 0 | Use a task-specific evaluation set, not only public benchmarks. | Choosing a format using only public benchmarks. | observe
edge: n1 | n2
edge: n2 | n3
```

## Incident: Out of memory on load

> **Incident:** A 70B model in FP16 could not load on one 80 GB GPU.

```console
torch.cuda.OutOfMemoryError: CUDA out of memory.
Tried to allocate 1.88 GiB
GPU 0 capacity 79.2 GiB, 1.1 GiB free
```

The team had counted only parameters and assumed it would fit. In FP16 the weights alone needed about 140 GB. They moved to a 4-bit format, reserved cache memory in the plan and verified quality on their ticket dataset before rollout.

## Common mistakes

- Counting weights but not the KV cache
- Choosing a format using only public benchmarks
- Filling GPU memory to 100 percent
- Not recording which quantization is deployed

```quiz
Q: How much does a 70B model need in 4-bit weights?
+ About 35 GB
- About 280 GB :: No.
- About 3 GB :: No.
- About 700 GB :: No.
> Half a byte per parameter.

Q: What grows with context length and concurrency?
+ The KV cache
- Weights :: No.
- The driver :: No.
- Disk size :: No.
> Cache memory scales with tokens.

Q: Why can lower precision be faster?
+ Less memory traffic
- Fewer layers :: No.
- Larger batches only :: No.
- No kernel :: No.
> Decoding is bandwidth bound.

Q: What should drive format choice?
+ Quality on your own tasks
- Marketing :: No.
- Model name :: No.
- Image size :: No.
> Measure what matters.
```

```cards
Quantization :: Storing weights with fewer bits
KV cache :: Stored attention keys and values for generated tokens
AWQ and GPTQ :: Common 4-bit weight quantization methods
BF16 :: 16-bit format with a wide range
```
