---
title: Autoscaling LLM inference
minutes: 13
summary: Scale GPU inference on queue depth and latency instead of CPU, handle slow startup with warm capacity and control cost.
---

GPU nodes are expensive and slow to start, so autoscaling inference is harder than scaling a web service. The right signal, warm capacity and sensible limits make the difference between smooth scaling and timeouts.

## What you will learn

- Choosing a scaling signal for model servers
- Why cold start dominates scale-up time
- Configuring KEDA or an HPA on custom metrics
- Controlling cost with limits and schedules

## The signal

Scale on what users feel. Good signals are **queue depth**, **running requests per replica** and **time to first token**. GPU utilization alone can look high while a replica is perfectly healthy, and CPU says almost nothing.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: llm-scaler
spec:
  scaleTargetRef:
    name: llm-server
  minReplicaCount: 2
  maxReplicaCount: 12
  cooldownPeriod: 600
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring:9090
        query: sum(vllm:num_requests_waiting)
        threshold: "8"
```

## Cold start

Adding capacity needs a new GPU node, then an image pull, then a model download and weight load. That can take minutes. Reduce it with pre-pulled images, models on a fast local or shared volume, a pool of warm spare replicas and cluster autoscaler or Karpenter settings that keep GPU nodes ready.

## Cost control

Set a **maximum replica count** and a budget alert. Use a long scale-down delay so replicas are not removed during short dips, because reloading is costly. For predictable peaks, scale up on a schedule before the peak:

```bash
kubectl get scaledobject,hpa -n ai
kubectl get nodes -l node.kubernetes.io/instance-type=gpu -o wide
```

Review the cost per thousand requests monthly.

## Incident: Ten minutes of timeouts

> **Incident:** A traffic spike outran GPU node startup.

```console
09:00 queue depth 340
09:01 scale up 2 -> 8
09:09 replicas ready
429 rate 41% until then
```

Scaling worked, but new replicas needed minutes to start. The team kept a warm pool, moved model files to a local cache, added a scheduled scale-up before the known morning peak and rate-limited low-priority traffic during spikes.

## Common mistakes

- Scaling on CPU
- No warm capacity for slow-starting models
- Aggressive scale-down that causes reloads
- No maximum replicas or budget alert

```quiz
Q: Which signal reflects inference load?
+ Queue depth or time to first token
- Disk size :: No.
- Pod name :: No.
- Node age :: No.
> They track user experience.

Q: What dominates scale-up time?
+ Node start and model loading
- DNS :: No.
- Logging :: No.
- Scheduling labels :: No.
> Large files take time.

Q: Why keep warm replicas?
+ To absorb spikes while new ones start
- To waste money :: No.
- To avoid metrics :: No.
- To stop updates :: No.
> They bridge the cold start gap.

Q: How handle predictable peaks?
+ Scheduled scale-up before them
- Do nothing :: No.
- Reduce replicas :: No.
- Disable autoscaling :: No.
> Forecast known load.
```

```cards
Queue depth :: Requests waiting to be processed
KEDA :: Event-driven autoscaler for Kubernetes
Warm pool :: Spare replicas ready to serve
Cold start :: Time to bring a new replica into service
```
