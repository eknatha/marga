---
title: Serving stacks: vLLM, TGI and Triton
minutes: 14
summary: Compare the main LLM serving tools, understand continuous batching and paged attention, and read the flags that matter.
---

Running a model in a notebook is easy. Serving it to many people at once, with steady latency and good use of the GPU, needs a serving engine.

## What you will learn

- Why a plain loop wastes the GPU
- Continuous batching and PagedAttention
- The main engines: vLLM, TGI, TensorRT-LLM and Triton
- The vLLM flags you will tune

## Why a loop is not enough

A simple server handles one request, or a fixed batch of requests, at a time. Replies have different lengths, so a fixed batch waits for the longest one while the GPU idles for the finished ones. New requests wait until the batch ends.

**Continuous batching** (also called in-flight batching) fixes this. After every generated token, the engine can drop finished sequences and add waiting ones, so the GPU stays full and new users start sooner.

**PagedAttention**, used by vLLM, stores the KV cache in small fixed pages instead of one large block per request. This reduces wasted memory from fragmentation, so more requests fit in the same GPU. **Prefix caching** reuses the cache for a shared prompt start, such as a long system prompt.

## The engines

- **vLLM**: an open-source engine with continuous batching, PagedAttention and an OpenAI-compatible HTTP API. A popular default for open models.
- **Text Generation Inference (TGI)**: Hugging Face's server with similar features, tied to the Hugging Face ecosystem.
- **TensorRT-LLM**: NVIDIA's library that compiles models into optimised kernels for NVIDIA GPUs. It can be the fastest on those cards, with more setup work.
- **Triton Inference Server**: NVIDIA's general serving platform for many model types, which can host TensorRT-LLM and other backends.
- **Hosted APIs**: the provider runs the stack, and you pay per token.

Choose by model support, hardware, operational skill and how much you want to tune. Many teams start with vLLM and measure.

## A vLLM example

```console
$ vllm serve meta-llama/Llama-3.1-8B-Instruct \
    --max-model-len 8192 \
    --gpu-memory-utilization 0.90 \
    --max-num-seqs 64
INFO  Loading model weights took 14.99 GiB
INFO  GPU KV cache size: 41,216 tokens
INFO  Maximum concurrency for 8192 tokens per request: 5.03x
INFO  Uvicorn running on http://0.0.0.0:8000
$ curl -s localhost:8000/v1/chat/completions -H 'Content-Type: application/json' \
    -d '{"model":"meta-llama/Llama-3.1-8B-Instruct","messages":[{"role":"user","content":"hello"}],"max_tokens":20}'
```

Key settings:

- `--max-model-len`: the longest context accepted. Setting it higher makes the engine reserve for longer requests and reduces how many fit.
- `--gpu-memory-utilization`: the fraction of VRAM the engine may use, including the cache. If other processes share the GPU, lower it.
- `--max-num-seqs`: how many sequences run together.
- `--tensor-parallel-size N`: split each layer across N GPUs, needed when the model is larger than one card. It needs fast links between GPUs.

The log line "GPU KV cache size" is the most useful number at startup. It says how many tokens of cache the memory can hold, and so how many concurrent users with how long a context.

## Operating notes

- Model weights are large (tens of GB). Cache them on a persistent volume so a restart does not download them again.
- Start-up takes minutes. Use readiness probes, and do not send traffic until the model is loaded.
- Pin the engine version, and test an upgrade, because behaviour and defaults change.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Serving stacks: vLLM, TGI and Triton fits together
node: n1 | Why a loop is not enough | 0 | 0 | A simple server handles one request, or a fixed batch of requests, at a time. | Setting a very large max-model-len that nobody uses. | process
node: n2 | The engines | 1 | 1 | vLLM: an open-source engine with continuous batching, PagedAttention and an OpenAI-compatible HTTP API. | Comparing engines with prompts that are nothing like real traffic. | process
node: n3 | A vLLM example | 2 | 0 | Key settings. | Running two engines on one GPU without lowering memory utilization. | process
node: n4 | Operating notes | 3 | 1 | Model weights are large (tens of GB). Cache them on a persistent volume so a restart does not download them again. | Redownloading weights on every restart. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The server that was slow with one GPU idle

> **Incident:** A two-GPU server delivered only the speed of one.

```console
$ nvidia-smi --query-gpu=index,utilization.gpu,memory.used --format=csv,noheader
0, 98 %, 76210 MiB
1, 0 %, 4 MiB
$ ps aux | grep vllm | head -1
vllm serve mistralai/Mixtral-8x7B-Instruct-v0.1 --max-model-len 16384
```

The engine had been started without `--tensor-parallel-size 2`, so it used only the first GPU, squeezed the model and the cache into it, and left the second card empty. After the flag was added the model was split over both cards, the cache became larger and throughput roughly doubled. The monitoring that revealed it was the per-GPU utilization, which had not been on the dashboard.

```wrongpath
@goal Process each request alone for predictable latency.
@wrong
# server runs with a batch size of 1
vllm serve model --max-num-seqs 1
@result
$ nvidia-smi
GPU util 18%
throughput: 2 requests/s, queue growing
@why A GPU is built to do many things at once. With one request at a time most of its capacity is idle and the queue builds, so latency actually gets worse under load.
@right
vllm serve model --max-num-seqs 64 --gpu-memory-utilization 0.90
@after Use continuous batching with a sensible limit, and measure latency at the load you expect.
```

## Common mistakes

- Setting a very large max-model-len that nobody uses
- Running two engines on one GPU without lowering memory utilization
- Redownloading weights on every restart
- Comparing engines with prompts that are nothing like real traffic

```quiz
Q: What does continuous batching do?
+ Adds and removes requests after every token so the GPU stays full
- Waits for all requests to finish :: That is static batching.
- Compresses weights :: No.
- Moves the cache to disk :: No.
> It improves throughput and wait times.

Q: What does PagedAttention improve?
+ KV cache memory use, by avoiding fragmentation
- Network speed :: No.
- Training speed :: It is for inference.
- Disk speed :: No.
> More requests fit in the same GPU.

Q: What does --tensor-parallel-size 2 do in vLLM?
+ Splits each layer across two GPUs
- Runs two copies of the model :: That is replication.
- Halves the context :: No.
- Disables batching :: No.
> It lets a model exceed one card.

Q: Which log line tells you how much cache the server has?
+ GPU KV cache size in tokens
- Uvicorn running :: That is the web server.
- Loading model weights :: That is the weights.
- INFO :: Not specific.
> It sets concurrency and context limits.
```

```cards
Continuous batching :: requests join and leave after each token
PagedAttention :: cache stored in small pages
vLLM :: open-source LLM serving engine
TGI :: Hugging Face text generation server
Tensor parallel :: split layers across GPUs
Prefix caching :: reuse cache for a shared prompt start
```
