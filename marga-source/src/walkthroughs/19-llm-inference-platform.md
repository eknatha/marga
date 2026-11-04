# An LLM inference platform on GPUs
level: Advanced
modules: gpu-serving
lessons: gpu-serving/serving-stacks-vllm-tgi-triton, gpu-serving/scaling-latency-and-cost
summary: How a company serves a language model to many users with predictable latency and a bill it can explain.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Serve streaming answers with a first token in under two seconds
- Handle bursts without paying for idle GPUs all day
- Isolate tenants and limit what each can use
- Roll out new model versions safely

## The big picture

```diagram
title: LLM inference platform reference design
node: cl | Clients and apps | 0 | 1 | Send prompts and read streamed tokens. | Without limits one client can flood the service.
node: gw | API gateway | 1 | 1 | Authentication, per-tenant limits, routing by model. | A weak limit lets one tenant starve others.
node: q | Request queue and router | 2 | 1 | Holds requests and sends them to the least loaded replica. | Round-robin ignores long prompts and creates hot spots.
node: rep | Model replicas (vLLM) | 3 | 0 | Each holds weights and a KV cache and batches requests continuously. | Out of memory kills a replica and its requests.
node: as | Autoscaler | 3 | 2 | Adds replicas on queue depth and time to first token. | Slow model loading makes scale-up late.
node: store | Model store and cache | 4 | 0 | Weights on fast storage near the GPUs. | Cold downloads take minutes.
node: obs | Metrics and evaluation | 4 | 2 | Tokens per second, queue, GPU memory, quality checks. | Quality regressions go unseen without evals.
edge: cl | gw
edge: gw | q
edge: q | rep
edge: q | as
edge: as | rep
edge: rep | store
edge: rep | obs
```

## A request, step by step

1. The client sends a prompt. The gateway authenticates it, checks the tenant limit and picks the requested model.
2. The router puts the request on a queue and sends it to a replica with capacity.
3. The replica tokenises the prompt and runs the prefill, which builds the KV cache for the prompt.
4. Decode runs one token at a time in a shared batch with other requests, and each token is streamed back.
5. When the answer ends, the cache is freed and the metrics are recorded.
6. The autoscaler watches queue depth and time to first token and adds a replica when they rise.

## Why the design looks like this

- **Continuous batching** keeps the GPU busy by adding requests to a running batch.
- **Queue-based scaling** reacts to waiting users, which CPU use does not show.
- **Per-tenant limits** protect the shared fleet from one noisy tenant.
- **A local model cache** shortens cold starts from minutes to seconds.
- **Evaluation sets** catch quality loss from quantisation or a new version.

## Scaling decisions

1. Start with one replica on one GPU and a fixed context length.
2. Add replicas behind a router that knows the queue.
3. Add autoscaling with a warm minimum so bursts are absorbed.
4. Quantise or split large models across GPUs with tensor parallelism.
5. Add per-tenant budgets and cost reports.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| GPU out of memory | Replica crashes, requests fail | Cap context and memory use, alert on headroom |
| Cold start | New replicas take minutes | Local weight cache, warm spare capacity |
| Noisy tenant | Others see long waits | Quotas and priority queues |
| Throttled GPUs | Throughput drops | Cooling checks, clock and temperature alerts |
| Bad model version | Quality drops silently | Canary traffic and evaluation before full rollout |
| Driver mismatch | Pods fail to start on some nodes | Pinned driver and image versions |

## Trade-offs

- Bigger batches raise throughput and latency per request.
- Quantisation saves memory and may reduce quality.
- Warm capacity costs money and protects the user experience.

```predict
Q: Users complain of slow first tokens at 15:00 although average GPU utilisation is 55 percent. What do you look at?
???
The request queue and time to first token per replica, the prompt lengths, and whether the KV cache is full on some replicas.
> Average utilisation hides queues and uneven load; the waiting requests are what the user feels.
```
