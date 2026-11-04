# Model answer: an LLM inference platform
prompt: gpu-llm
summary: A gateway, a queue-aware router, GPU replicas with continuous batching, autoscaling on queue depth and a model cache.

## The answer in one minute

Put an API gateway with per-tenant limits in front, route to replicas based on queue length, serve with a stack such as vLLM that batches continuously, scale on waiting requests and time to first token, and keep weights close to the GPUs so new replicas start quickly.

## The design

```diagram
title: LLM inference platform design
node: cl | Clients | 0 | 1 | Stream tokens. | Long connections tie up resources.
node: gw | Gateway | 1 | 1 | Auth, limits, routing by model. | No limits means one tenant takes everything.
node: rt | Router and queue | 2 | 1 | Chooses a replica by queue depth. | Round-robin ignores load.
node: rep | GPU replicas | 3 | 0 | vLLM or similar with KV cache. | Out-of-memory crashes.
node: as | Autoscaler | 3 | 2 | Adds replicas on queue signals. | Slow model load.
node: cache | Model cache | 4 | 1 | Weights on local NVMe or shared storage. | Cold downloads.
node: obs | Observability and evals | 5 | 1 | Latency, GPU, quality. | Silent quality regression.
edge: cl | gw
edge: gw | rt
edge: rt | rep
edge: rt | as
edge: as | rep
edge: rep | cache
edge: rep | obs
```

## Every component, explained

### Continuous batching

Requests join the running batch at every decode step, so the GPU stays full and short requests do not wait for long ones.

Example: A new 10-token request starts at the next step instead of waiting for a 2000-token one to finish.

### KV cache

For each running request the model keeps key and value tensors so it does not recompute earlier tokens. The cache uses GPU memory and limits concurrency.

Example: A 70B model with 8k context needs several GB of cache per request.

### Queue-aware routing

The router sends a request to the replica with the shortest queue and warm prefix cache, not just the next in line.

Example: Two replicas have queues of 12 and 2; the new request goes to the second.

### Scaling signal

Queue depth or time to first token shows demand. GPU utilisation alone is already high at low load.

Example: Scale out when waiting requests per replica exceed 4 for one minute.

### Quantisation and parallelism

Smaller weights and splitting across GPUs let big models fit and run faster, with checks on quality.

Example: A 4-bit build of a 70B model fits on one 80 GB card.

## Numbers to say out loud

- At 20 requests a second and 300 tokens each you need 6000 tokens a second.
- If a GPU does 1500 tokens a second, you need 4 GPUs plus headroom, so 6 or 7.
- At 4 dollars an hour, 6 GPUs cost about 17500 dollars a month.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| OOM crash | Failed requests | Cap context and memory use |
| Cold start | Slow scale-up | Local cache and warm spares |
| Noisy tenant | Slow for others | Quotas and priorities |
| GPU throttling | Lower throughput | Cooling and temperature alerts |
| Bad model release | Lower quality | Canary and evaluation |

## Follow-up questions to expect

- How do you do multi-model serving?
- How do you reduce cost?
- How do you stream and cancel requests?
