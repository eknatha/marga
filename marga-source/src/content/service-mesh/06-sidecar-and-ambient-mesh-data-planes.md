---
title: Sidecar and ambient mesh data planes
minutes: 12
summary: Compare the sidecar proxy model with the ambient, sidecar-free model and what each costs in resources, upgrades and isolation.
---

The data plane is the set of proxies that carry traffic. How they are deployed decides what the mesh costs and how risky it is to operate, so it is worth understanding both main designs.

## What you will learn

- How sidecar injection works
- How ambient mode splits layer 4 and layer 7
- Overhead, upgrades and isolation trade-offs
- Choosing a model for your cluster

## Sidecar model

A mutating webhook adds a proxy container to each pod. Traffic in and out is redirected through it, so it can encrypt, retry, route and measure every call.

```bash
kubectl label namespace shop istio-injection=enabled
kubectl rollout restart deployment -n shop
kubectl get pod -n shop -o jsonpath='{.items[0].spec.containers[*].name}'
```

The cost is one proxy per pod: extra memory, CPU, start-up time and a rolling restart of every workload to upgrade proxies. The benefit is strong isolation, because each workload has its own proxy and policy point.

## Ambient model

In **ambient mode** a small per-node component handles encryption and basic layer 4 policy for all pods on that node. If you need layer 7 features such as header routing or retries, you add a **waypoint** proxy for a namespace or service.

```bash
kubectl label namespace shop istio.io/dataplane-mode=ambient
istioctl waypoint apply -n shop --enroll-namespace
```

Applications are not restarted to join, and the shared proxies are upgraded without touching pods. Trade-offs include a shared node component with a wider blast radius and fewer years of production experience than sidecars.

## Choosing

Measure the real overhead of proxies in a test cluster. Use sidecars for strict per-workload isolation and mature features. Consider ambient for many small pods or when restarting workloads is costly. Whichever you choose, keep a plan for upgrading the data plane safely.

## Incident: Memory eaten by proxies

> **Incident:** Sidecar proxies used more memory than the applications they served.

```console
kubectl top pod --containers -n shop
app          38Mi
istio-proxy  96Mi
4200 pods in the cluster
```

Small services were wrapped with a default proxy that needed more memory than the service. The team tuned proxy limits for small workloads, scoped sidecar configuration to reduce memory use and moved low-risk namespaces to the shared node model after testing.

## Common mistakes

- Enabling a mesh everywhere before measuring cost
- Forgetting that proxy upgrades need pod restarts in the sidecar model
- Using layer 7 features without a waypoint in ambient mode
- Ignoring the blast radius of a shared node component

```quiz
Q: What is a sidecar?
+ A proxy container in each pod
- A cluster :: No.
- A node pool :: No.
- A DNS record :: No.
> It handles the pod's traffic.

Q: What does ambient mode remove?
+ Per-pod sidecar proxies
- Kubernetes :: No.
- Encryption :: No.
- Services :: No.
> It uses shared proxies.

Q: What provides layer 7 features in ambient mode?
+ A waypoint proxy
- A kernel module :: No.
- A database :: No.
- A load balancer only :: No.
> Optional per namespace or service.

Q: Why measure overhead first?
+ Proxies can cost more than small apps
- Meshes are free :: No.
- It avoids YAML :: No.
- It speeds DNS :: No.
> Cost depends on your workloads.
```

```cards
Sidecar :: A proxy container injected into each pod
Ambient mode :: Mesh mode with shared node proxies
Waypoint :: Layer 7 proxy used in ambient mode
Data plane :: The proxies that carry traffic
```
