---
title: Model loading, caching and cold starts
minutes: 12
summary: Load large model files quickly with local caches and fast storage, use safetensors and shared volumes and plan rollouts around start-up time.
---

A model server cannot serve until its weights are in GPU memory. Getting there involves pulling a large image, fetching files and moving them across the bus, and each step offers a chance to speed up or to fail.

## What you will learn

- Where start-up time goes
- Caching weights and images close to the GPU
- Readiness and startup probes for model servers
- Rolling updates that keep capacity

## Where time goes

1. Pull the container image, often many gigabytes with CUDA libraries.
2. Download or read the model weights.
3. Load weights to GPU memory and initialize kernels.
4. Warm up with a few requests.

Measure each step with timestamps so you know which to fix.

## Caching

```yaml
volumes:
  - name: models
    persistentVolumeClaim:
      claimName: model-cache      # fast shared or local NVMe volume
containers:
  - name: server
    image: registry.example.com/llm-server:1.8
    args: ["--model", "/models/llama-8b", "--load-format", "safetensors"]
    volumeMounts:
      - {name: models, mountPath: /models, readOnly: true}
```

Use **safetensors**, which load quickly and avoid unsafe code execution. Populate the volume once with a job, verify file checksums and mount it read-only. Pre-pull images onto GPU nodes, or use an image cache in the cluster.

## Probes and rollouts

```yaml
startupProbe:
  httpGet: {path: /health, port: 8000}
  failureThreshold: 60
  periodSeconds: 10
readinessProbe:
  httpGet: {path: /v1/models, port: 8000}
```

The startup probe allows a long load without being killed, and readiness keeps traffic away until the model answers. Roll out with `maxUnavailable: 0` and a small `maxSurge`, so old replicas keep serving until new ones are ready. Remember that a surge needs spare GPUs.

## Incident: Killed while still loading

> **Incident:** Pods restarted repeatedly because probes were too strict for a slow load.

```console
Liveness probe failed: connection refused
Container server failed liveness probe, will be restarted
Back-off restarting failed container (CrashLoopBackOff)
```

The liveness probe started after 30 seconds, but loading took four minutes, so Kubernetes kept killing the pod just before it was ready. A startup probe with a long allowance and a readiness probe on the model endpoint fixed the loop.

## Common mistakes

- Liveness probes that fire during model loading
- Downloading weights from the internet on every start
- Restarting all replicas together
- Writable model volumes shared by many pods

```quiz
Q: Which probe handles slow startup?
+ Startup probe
- DNS :: No.
- Ingress :: No.
- Namespace :: No.
> It delays liveness checks.

Q: Why use safetensors?
+ Fast, safe weight loading
- Larger files :: No.
- Slower start :: No.
- Encrypted logs :: No.
> It avoids pickle code execution.

Q: How keep capacity during updates?
+ maxUnavailable 0 with a surge
- Delete all pods :: No.
- Disable probes :: No.
- Scale to zero :: No.
> Old replicas keep serving.

Q: Why mount weights read-only?
+ Prevent accidental changes
- To save RAM :: No.
- To change drivers :: No.
- To speed DNS :: No.
> Weights should be immutable.
```

```cards
Startup probe :: Probe that allows slow application start
safetensors :: Safe, fast tensor file format
Warm-up :: Initial requests that prepare kernels
Model cache :: Local or shared storage for weights
```
