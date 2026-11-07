---
title: Scaling, latency and cost
minutes: 14
summary: Measure what users feel (TTFT and token speed), scale on the right signal, and work out the cost of a token.
---

GPU inference costs money every minute it runs, whether or not anyone is using it. Good operation means knowing what the users experience, scaling to match demand, and being able to say what a million tokens cost.

## What you will learn

- The latency numbers: TTFT, inter-token latency and total time
- Why CPU-based autoscaling does not work for GPUs
- Scaling on queue depth and concurrency
- Cost per million tokens and how utilisation changes it

## What users feel

- **TTFT (time to first token)**: how long before anything appears. It includes queue wait and prefill. Long prompts and busy servers raise it.
- **Inter-token latency (ITL)**: the gap between tokens after the first. At about 20 tokens per second per user the text keeps ahead of reading speed.
- **Throughput**: tokens per second summed across users, which sets cost.
- **p95 and p99**: slow outliers matter more than the average. Track percentiles.

Latency and throughput pull against each other. A bigger batch raises total throughput and slows each user a little. Set a target, such as "p95 TTFT under 1.5 seconds and 20 tokens/s per user", and let it decide the batch limits.

```console
$ curl -s localhost:8000/metrics | grep -E 'vllm:(num_requests_(running|waiting)|gpu_cache_usage_perc)'
vllm:num_requests_running{model_name="llama-8b"} 64
vllm:num_requests_waiting{model_name="llama-8b"} 37
vllm:gpu_cache_usage_perc{model_name="llama-8b"} 0.97
```

Here 64 are running and 37 are waiting, with the cache 97 percent full. Users in the queue see high TTFT. More capacity is needed, or shorter contexts.

## Scaling on the right signal

GPU use percentages are a poor signal. A GPU can read 100 percent "utilized" while only partly busy in terms of throughput, and CPU on the pod says nothing. Better signals:

- **Queue length** (requests waiting)
- **Concurrent requests** per replica compared with a tested maximum
- **KV cache usage**
- **TTFT or latency percentiles** as a guard

With KEDA or the Horizontal Pod Autoscaler on custom metrics, add replicas when the waiting count stays above a small number for a minute. Scale down slowly: a new replica needs minutes to schedule a GPU node, pull an image and load weights. Keep a minimum of one or two warm replicas for latency, and consider scaling a batch workload to zero.

## Cost

Cost per token = GPU price per hour ÷ tokens generated per hour.

If a GPU costs 4 USD per hour and serves 2 500 tokens per second at full load, it produces 9 million tokens per hour, so about 0.44 USD per million tokens. If it only runs at 25 percent of that, the cost per million tokens is four times higher, about 1.78 USD. **Utilisation** is the biggest lever. The ways to improve it are:

- Larger batches and continuous batching
- Quantization, so more fits and faster decode
- Smaller models for easy tasks, with routing to bigger ones when needed
- Prefix caching for repeated prompts
- Spot or preemptible GPUs for batch work that can restart, with checkpoints
- Reserved capacity for the stable base load

Compare against a hosted API price per million tokens at your real volume. Hosted wins at low or spiky use; self-hosting wins at steady high use, or when privacy and control matter.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Scaling, latency and cost fits together
node: n1 | What users feel | 0 | 0 | TTFT (time to first token): how long before anything appears. | Comparing GPU cost with API cost at a single quiet hour. | client
node: n2 | Scaling on the right signal | 1 | 1 | GPU use percentages are a poor signal. A GPU can read 100 percent "utilized" while only partly busy in terms of throughput, and CPU on the pod says nothing. | Scaling down fast and paying start-up time again. | process
node: n3 | Cost | 2 | 0 | Cost per token = GPU price per hour ÷ tokens generated per hour. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Scaling on the wrong metric

> **Incident:** A launch-day traffic spike produced timeouts although autoscaling was enabled and CPU was low.

```console
$ kubectl get hpa llm
NAME  REFERENCE         TARGETS   MINPODS  MAXPODS  REPLICAS
llm   Deployment/llm    12%/60%   2        10       2
$ curl -s llm-0:8000/metrics | grep num_requests_waiting
vllm:num_requests_waiting{model_name="llama-8b"} 211
```

The autoscaler used CPU, which stays low when the heavy work happens on the GPU, so it saw nothing wrong while 211 requests waited. They switched to scaling on waiting requests per replica, with a rule of 10, and kept four replicas warm for events. New replicas still took six minutes to start, so a model image with weights baked in and a node pool with a spare node cut that to two. The metric that you scale on must move when users suffer.

```wrongpath
@goal Autoscale the model service on CPU like any other service.
@wrong
metrics:
- type: Resource
  resource: {name: cpu, target: {type: Utilization, averageUtilization: 70}}
@result
(CPU stays at 15%)
$ kubectl get hpa
replicas 2/2
time to first token: 11 s
@why The work is done on the GPU, so CPU says little about load. The queue grows while the autoscaler sees no reason to act.
@right
metrics:
- type: Pods
  pods:
    metric: {name: vllm:num_requests_waiting}
    target: {type: AverageValue, averageValue: "4"}
@after Scale on waiting requests or time to first token, and keep warm replicas because model loading is slow.
```

## Common mistakes

- Scaling GPU pods on CPU
- Averaging latency and ignoring p95
- Scaling down fast and paying start-up time again
- Comparing GPU cost with API cost at a single quiet hour

```quiz
Q: What does TTFT measure?
+ The time before the first token appears
- The time to download the model :: No.
- The cost per token :: No.
- The GPU temperature :: No.
> It includes queue wait and prefill.

Q: Which signal is a better scaling trigger for LLM servers than CPU?
+ Number of waiting requests
- Disk free space :: Not related.
- Pod age :: Not related.
- Memory of the node :: Not specific.
> Queue length rises when users wait.

Q: A 4 USD per hour GPU produces 9 million tokens per hour. Roughly what does one million tokens cost?
+ About 0.44 USD
- About 4 USD :: That is one hour.
- About 36 USD :: No.
- About 0.04 USD :: No.
> Price divided by million tokens per hour.

Q: What is the biggest lever on cost per token?
+ GPU utilisation
- The colour of dashboards :: No.
- The pod name :: No.
- The log level :: No.
> An idle card costs the same as a busy one.
```

```cards
ITL :: gap between tokens after the first
p95 :: latency that 95 percent of requests beat
Queue depth :: requests waiting for a free slot
KEDA :: event-driven autoscaler
Utilisation :: share of capacity doing useful work
Spot GPU :: cheaper interruptible instance
```
