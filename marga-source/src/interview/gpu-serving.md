## What limits how large a model you can run on a GPU?
level: junior
Memory is the first limit. The weights need parameters times bytes per parameter, so a 7 billion parameter model in 16-bit needs about 14 GB. On top of that comes the KV cache, which grows with context length and concurrent requests, plus runtime overhead. Quantisation and multiple GPUs are the usual ways to fit a bigger model.

## What is the KV cache?
level: junior
During generation the model stores key and value tensors for tokens it has already processed, so it does not recompute them for each new token. This cache grows with context length and with the number of requests in flight, and it often decides how many users one GPU can serve. Serving engines such as vLLM manage it in blocks to waste less memory.

## Why use a serving engine such as vLLM instead of a simple script?
level: junior
A simple script handles one request at a time and wastes the GPU between tokens. A serving engine batches requests continuously, manages the KV cache efficiently, streams tokens and exposes an API and metrics. That raises throughput and lowers cost per token, and it gives me the controls and observability that production needs.

## How do you schedule GPU workloads on Kubernetes?
level: mid
I install the GPU driver and device plugin, usually through the NVIDIA GPU Operator, so nodes advertise nvidia.com/gpu. Pods request GPUs as a resource limit, use node selectors and tolerations for tainted GPU nodes, and I monitor with DCGM metrics. For sharing I consider MIG or time slicing, knowing the trade-off between isolation and utilisation.

## How do you balance latency, throughput and cost for LLM serving?
level: mid
Batching improves throughput and cost per token but raises latency, so I set targets for time to first token and tokens per second and tune batch size, context limit and concurrency against them. I use autoscaling on queue depth or cache usage rather than GPU utilisation alone, and I test with realistic prompts, because averages hide the long requests.

## How would you design and operate an inference platform for several teams?
level: senior
I define service levels, then size capacity per model from measured memory and throughput. I isolate teams with namespaces, quotas and priorities, share GPUs where safe, and route requests with limits and fallbacks. Observability covers latency, queue, cache, errors, GPU health and cost per request. I plan for hardware failure, model rollout with canaries, and clear ownership of capacity.
