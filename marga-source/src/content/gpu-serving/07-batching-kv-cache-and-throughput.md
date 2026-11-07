---
title: Batching, KV cache and throughput
minutes: 13
summary: Understand continuous batching, prefill and decode, KV cache paging and the knobs that trade latency for throughput.
---

Serving a language model is not one calculation per request. Each user needs a long series of small steps, and the GPU wastes most of its power if it does them alone. Batching and cache management are what make serving affordable.

## What you will learn

- Prefill versus decode and why they behave differently
- Continuous batching and paged KV cache
- The main limits and what they trade
- Reading throughput and latency metrics

## Two phases

**Prefill** reads the whole prompt in one parallel pass and is compute heavy. It determines the **time to first token**. **Decode** produces one token per step, reuses the KV cache and is limited by memory bandwidth. It determines **inter-token latency**.

## Continuous batching

Static batching waits for a full batch and runs until the longest request ends. **Continuous batching** adds new requests and removes finished ones at every step, so the GPU stays busy. **Paged attention** stores the KV cache in small blocks, reducing waste and allowing more concurrent sequences.

```bash
vllm serve meta/model-8b \
  --max-num-seqs 128 \
  --max-num-batched-tokens 16384 \
  --max-model-len 8192 \
  --gpu-memory-utilization 0.90
```

## The knobs

- **max-num-seqs:** more concurrent requests means higher throughput but more cache use and higher latency per request.
- **max-num-batched-tokens:** large values favor throughput, small ones favor smooth latency.
- **max-model-len:** a smaller limit leaves memory for more sequences.
- **Prefix caching:** reuses cache for shared prompt starts, such as a system prompt.

## Measure

```bash
curl -s localhost:8000/metrics | grep -E "num_requests_(running|waiting)|time_to_first_token|gpu_cache_usage"
```

Watch queue length, cache usage, time to first token and tokens per second under realistic concurrency. Rising waiting requests with high cache usage means you need more memory, smaller limits or more replicas.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Batching, KV cache and throughput fits together
node: n1 | Two phases | 0 | 0 | Prefill reads the whole prompt in one parallel pass and is compute heavy. | Ignoring queue depth and cache usage. | process
node: n2 | Continuous batching | 1 | 1 | Static batching waits for a full batch and runs until the longest request ends. | Allowing very long contexts for every route. | process
node: n3 | The knobs | 2 | 0 | max-num-seqs: more concurrent requests means higher throughput but more cache use and higher latency per request. | Tuning with a single test request. | process
node: n4 | Measure | 3 | 1 | Watch queue length, cache usage, time to first token and tokens per second under realistic concurrency. | Setting memory utilization to 100 percent. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Fast alone, slow together

> **Incident:** Latency jumped when concurrency increased because the cache was full.

```console
num_requests_running: 64
num_requests_waiting: 211
gpu_cache_usage_perc: 0.99
time_to_first_token p95: 9.4s
```

The server accepted long contexts from every request and exhausted cache memory, so new requests waited. The team capped context length for the public route, enabled prefix caching for the shared system prompt and added a replica with autoscaling on queue depth.

## Common mistakes

- Tuning with a single test request
- Allowing very long contexts for every route
- Ignoring queue depth and cache usage
- Setting memory utilization to 100 percent

```quiz
Q: Which phase decides time to first token?
+ Prefill
- Decode :: No.
- Loading :: No.
- Logging :: No.
> Prompt processing happens first.

Q: What does continuous batching do?
+ Adds and removes requests every step
- Waits for a full batch :: No.
- Disables the cache :: No.
- Uses one request :: No.
> It keeps the GPU busy.

Q: What does high cache usage with waiting requests suggest?
+ Memory limits concurrency
- A DNS issue :: No.
- Too many nodes :: No.
- A slow disk :: No.
> The cache is exhausted.

Q: What does prefix caching reuse?
+ Cache of a shared prompt start
- Model weights :: No.
- Logs :: No.
- The driver :: No.
> Common prefixes are not recomputed.
```

```cards
Prefill :: Processing the prompt in one parallel pass
Decode :: Generating tokens one at a time
Continuous batching :: Dynamic batching at each generation step
Time to first token :: Delay until the first output token
```
