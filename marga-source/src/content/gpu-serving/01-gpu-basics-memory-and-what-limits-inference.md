---
title: GPU basics: memory and what limits inference
minutes: 15
summary: Work out how much GPU memory a model needs, and why generating text is limited by memory bandwidth more than by compute.
---

A large language model is mostly a very big list of numbers that must be read for every word it produces. Whether it runs, how fast, and for how many users depends on a few simple sums. This lesson gives you the sums.

## What you will learn

- What a GPU is good at and what its memory looks like
- How to estimate memory for weights and the KV cache
- Prefill versus decode, and why decode is bound by memory bandwidth
- Quantization and what it trades

## What a GPU offers

A GPU has thousands of simple cores that do many multiplications at once, which suits the matrix arithmetic in neural networks. It has its own fast memory called **VRAM** (or HBM on data center cards). A model must fit in VRAM to run well. Data centre cards range from 24 GB to 80 GB or more per device, and a model that does not fit must be split across several cards or compressed.

## Weights

Memory for the model's **weights** is the parameter count times the bytes per parameter.

| Precision | Bytes per parameter | 8B model | 70B model |
|---|---|---|---|
| FP16 or BF16 | 2 | about 16 GB | about 140 GB |
| INT8 / FP8 | 1 | about 8 GB | about 70 GB |
| 4-bit | about 0.5 | about 4 to 5 GB | about 35 to 40 GB |

A 70B model in 16-bit needs more than one 80 GB card. In 4-bit it fits on one, with some loss of quality that depends on the method and model.

## The KV cache

While generating, the model keeps the **key and value** vectors of every token seen so far, so it does not recompute them. This is the **KV cache**, and it grows with each token and each concurrent request.

Bytes per token = 2 (key and value) × layers × KV heads × head size × bytes per value.

For a model with 32 layers, 8 KV heads (grouped-query attention) and head size 128 in 16-bit:

2 × 32 × 8 × 128 × 2 = 131 072 bytes, which is 128 KiB per token.

A 4 000-token conversation takes about 0.5 GB, and 64 such conversations take about 32 GB. That is why serving many users needs far more memory than the weights alone, and why memory runs out before compute does.

## Prefill and decode

Generating a reply has two phases.

- **Prefill** reads the whole prompt at once. It is compute-heavy and fast per token, and it sets the **time to first token (TTFT)**.
- **Decode** produces one token at a time. For each token, the GPU must read all the weights from memory. The speed is therefore close to memory bandwidth divided by model size.

A rough ceiling for one stream: a card with 2 000 GB/s of bandwidth and a 16 GB model can read the weights about 125 times per second, so about 125 tokens per second for one user, in theory. In practice you get less. **Batching** serves many users with the same read of the weights, which is how throughput rises. That is why batch size and memory for the cache decide cost per token.

## Quantization

**Quantization** stores weights, and sometimes the KV cache, with fewer bits. It reduces memory and increases speed, because less data is read per token. Check quality on your own tasks before using an aggressive setting: small models and tasks needing exact numbers are more sensitive.

```console
$ nvidia-smi --query-gpu=name,memory.total,memory.used --format=csv
name, memory.total [MiB], memory.used [MiB]
NVIDIA A100-SXM4-80GB, 81920 MiB, 40213 MiB
```

## Incident: The model that loaded and then crashed

> **Incident:** A 13B model loaded fine on a 24 GB card and crashed under the first real traffic.

```console
$ nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader
23410 MiB, 24576 MiB
torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 1.20 GiB.
GPU 0 has a total capacity of 24.00 GiB of which 0.81 GiB is free.
```

The weights in 16-bit took about 26 GB, so the team had loaded an 8-bit version of about 13 GB, which left about 10 GB. That looked like plenty in testing with one request. Under real traffic the KV cache of many long prompts used all of it. They reduced the maximum context length, limited concurrent requests, and moved to a larger card. Memory has to be planned for weights plus cache at peak load, not at the first test.

## Common mistakes

- Sizing a GPU by weights only
- Assuming more GPU cores will fix slow decoding when bandwidth is the limit
- Using aggressive quantization with no quality test
- Testing with one request and shipping

```quiz
Q: About how much memory do the weights of a 70B model need in 16-bit?
+ About 140 GB
- About 14 GB :: That would be 1 bit... no: 2 bytes per parameter gives 140 GB.
- About 70 MB :: No.
- About 1.4 TB :: No.
> Parameters times 2 bytes.

Q: What limits the speed of decoding one token at a time?
+ Memory bandwidth, because all weights are read for each token
- Disk speed :: Weights are in VRAM.
- CPU clock :: The GPU does the work.
- Network latency to the user :: Not the main limit.
> Batching amortises the reads.

Q: What does the KV cache store?
+ Key and value vectors of tokens already processed
- The model weights :: No.
- The training data :: No.
- The user passwords :: No.
> It avoids recomputing earlier tokens.

Q: Why is a quality test needed before using 4-bit quantization?
+ Compression can lose accuracy on some tasks
- 4-bit models cannot run on GPUs :: They can.
- It deletes the model :: No.
- It disables batching :: No.
> Check on your own prompts.
```

```cards
VRAM :: memory on the GPU
Weights :: the model parameters
KV cache :: stored keys and values of past tokens
Prefill :: processing the whole prompt
Decode :: generating one token at a time
TTFT :: time to first token
```
