---
title: Mesh performance, cost and resource tuning
minutes: 12
summary: Measure the latency and resource cost of a mesh, scope proxy configuration and tune limits and telemetry to keep it affordable.
---

A mesh is software in the request path, so it needs capacity planning like any other service. Most surprises come from proxies holding too much configuration or from too many metric labels.

## What you will learn

- Measuring added latency and resource use
- Scoping proxy configuration to what a workload needs
- Reducing telemetry cost
- Sizing the control plane and proxies

## Measure

Run the same load test against a service with and without the mesh, and compare p50 and p99 latency, CPU and memory. Typical sidecar overhead is small per request, but it adds up across many hops and many pods.

```bash
kubectl top pod -n shop --containers
istioctl proxy-status
istioctl proxy-config clusters deploy/web -n shop | wc -l
```

The last line counts how many clusters, meaning upstream services, the proxy holds. A large number means high memory.

## Scope configuration

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: shop
spec:
  egress:
    - hosts:
        - "./*"
        - "platform/*"
```

By default each proxy learns about every service in the mesh. A **Sidecar** resource limits it to the namespaces a workload really calls, which saves memory and speeds configuration pushes.

## Telemetry

High-cardinality labels, such as user IDs or full paths, can explode metric series. Remove unneeded dimensions, sample traces and access logs, and keep detailed telemetry for important services only.

## Sizing

Set requests and limits on proxies based on measurements, and size the control plane for the number of proxies and changes. Watch control plane push latency and rejected configuration, since slow pushes mean stale routing.

## Incident: Gigabytes of proxy memory

> **Incident:** Each proxy held configuration for every service in a large cluster.

```console
istio-proxy memory: 1.4Gi
clusters in config: 6900
pods OOMKilled in the last hour: 31
```

Nobody had scoped proxy configuration, so each sidecar tracked thousands of services. Proxies hit memory limits and restarted. A default Sidecar resource per namespace reduced configuration and memory sharply, and the team added a dashboard of proxy memory and config size.

## Common mistakes

- Never benchmarking with and without the mesh
- Leaving every proxy with global configuration
- Keeping all metric labels
- Proxy limits copied from examples

```quiz
Q: What does a Sidecar resource limit?
+ What a proxy knows about
- Pod names :: No.
- Node CPU :: No.
- Image tags :: No.
> It scopes egress configuration.

Q: Why measure both p50 and p99?
+ Tail latency shows added hops
- They are the same :: No.
- Only p50 matters :: No.
- To hide errors :: No.
> The tail is where users hurt.

Q: What causes metric cost to explode?
+ High-cardinality labels
- Short names :: No.
- Few pods :: No.
- TLS :: No.
> Each label value creates a series.

Q: What should size proxy limits?
+ Measured use
- Examples copied online :: No.
- Zero :: No.
- The node size :: No.
> Use real data. The lesson section above explains why.
```

```cards
Overhead :: Extra latency and resources added by a proxy
Sidecar resource :: Scopes the configuration a proxy receives
Cardinality :: Number of distinct label combinations
Config push :: Sending routing configuration to proxies
```
