---
title: What a service mesh is and how it works
minutes: 14
summary: Understand the problem a mesh solves, the sidecar and ambient models, the control plane and data plane, and when you should not use one.
---

When a company has hundreds of services, every one needs the same things: encrypted calls, retries, timeouts, metrics, access rules. A service mesh moves those jobs out of the application code and into the platform.

## What you will learn

- The problem a mesh solves, and what it costs
- Data plane and control plane
- Sidecar proxies, and the newer ambient mode
- The main meshes: Istio, Linkerd, Cilium
- How to decide whether you need one

## The problem

Without a mesh, each team writes its own retry logic, its own TLS setup and its own metrics. They differ by language, and a fix means redeploying every service. With a mesh, a proxy beside each service handles the network side the same way for everyone.

## Two planes

- The **data plane** is the proxies that carry the real traffic. In Istio the proxy is **Envoy**.
- The **control plane** (Istio's `istiod`) is the brain. It watches Kubernetes and your mesh configuration, turns them into proxy configuration and pushes it out. It also issues the certificates used for mTLS.

```console
$ kubectl get pods -n shop
NAME          READY   STATUS    RESTARTS
web-7d9f-x2   2/2     Running   0
$ kubectl get pod web-7d9f-x2 -n shop -o jsonpath='{.spec.containers[*].name}'
web istio-proxy
```

`2/2` ready means the pod runs the app and a proxy sidecar. Traffic in and out of the app is redirected through the proxy automatically.

## Sidecar and ambient

- **Sidecar**: a proxy in every pod. It is simple to reason about and gives per-pod control, but it costs memory and CPU in every pod, and pods must be restarted to pick up proxy upgrades.
- **Ambient** (Istio): a shared node-level component handles encryption and basic policy (L4), and an optional per-namespace proxy handles HTTP features (L7). It lowers the per-pod cost.

Injection works through a label on the namespace (`istio-injection=enabled`). Pods created **before** the label do not get a sidecar until they restart.

## The main meshes

| Mesh | Style | Known for |
|---|---|---|
| Istio | Envoy, rich features | Powerful traffic control, larger to operate |
| Linkerd | Small Rust proxy | Simplicity, low overhead |
| Cilium | eBPF, sidecar-free option | Network integration |

## When not to use one

A mesh adds moving parts, a new failure mode and a learning curve. If you have a handful of services, or need only TLS, a library or an ingress may be enough. Adopt a mesh for a clear need: mutual TLS everywhere, uniform telemetry, or fine traffic control.

```wrongpath
@goal Turn on the mesh for the shop namespace and get mTLS for all services.
@wrong
# label the namespace and expect everything to change
kubectl label namespace shop istio-injection=enabled
@result
$ kubectl get pods -n shop
NAME          READY   STATUS
web-7d9f-x2   1/1     Running
# still one container: no sidecar, no mTLS
@why Injection happens when a pod is created. Pods that already existed were never changed. The label only affects new pods.
@right
kubectl label namespace shop istio-injection=enabled
kubectl rollout restart deployment -n shop
kubectl get pods -n shop
istioctl proxy-status
@after Restart the workloads so the webhook can add the sidecar, then check that every pod reads 2/2 and every proxy shows SYNCED.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How What a service mesh is and how it works fits together
node: n1 | The problem | 0 | 0 | Without a mesh, each team writes its own retry logic, its own TLS setup and its own metrics. | Adopting a mesh with no concrete problem to solve. | process
node: n2 | Two planes | 1 | 1 | The data plane is the proxies that carry the real traffic. | Upgrading the control plane with no staged rollout. | process
node: n3 | Sidecar and ambient | 2 | 0 | Sidecar: a proxy in every pod. It is simple to reason about and gives per-pod control, but it costs memory and CPU in every pod, and pods must be restarted to pick up... | Expecting existing pods to get sidecars without a restart. | process
node: n4 | The main meshes | 3 | 1 | . | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | When not to use one | 4 | 0 | A mesh adds moving parts, a new failure mode and a learning curve. | Ignoring the extra CPU and memory the proxies need. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: A mesh upgrade that took the checkout down

> **Incident:** After a control plane upgrade, some services returned 503 errors.

```console
$ istioctl proxy-status
NAME            CDS      LDS      EDS      RDS
checkout-1.shop STALE    SYNCED   SYNCED   SYNCED
```

Some proxies were stuck on old configuration because the control plane restarted before they reconnected. Rolling the control plane one replica at a time, and waiting for proxy-status to show SYNCED before each next step, avoided the problem on the next upgrade.

## Common mistakes

- Adopting a mesh with no concrete problem to solve
- Expecting existing pods to get sidecars without a restart
- Ignoring the extra CPU and memory the proxies need
- Upgrading the control plane with no staged rollout

```quiz
Q: What carries real traffic in a service mesh?
+ The data plane: the proxies beside the services
- The control plane :: It configures proxies.
- The API server :: Not the mesh data path.
- CoreDNS :: It handles names, not mesh traffic.
> The data plane is the set of proxies such as Envoy.

Q: What does the control plane do?
+ Turns your configuration into proxy settings, pushes them and issues certificates
- Runs the app code :: No.
- Stores images :: No.
- Replaces Kubernetes :: No.
> Istiod configures the proxies and manages mTLS identities.

Q: You label a namespace for injection. Existing pods still show 1/1. Why?
+ Injection happens at pod creation, so they must be restarted
- The label is wrong :: Possibly but not the usual reason.
- Sidecars are disabled in Kubernetes :: No.
- The mesh is broken :: Not necessarily.
> The webhook only affects new pods.

Q: When might you avoid a service mesh?
+ With very few services or when you only need simple TLS
- When you have many teams :: That is when a mesh helps.
- When you need mTLS everywhere :: A mesh helps there.
- Never :: A mesh has real costs.
> A mesh adds complexity, so use it for a clear need.
```

```cards
Service mesh :: Platform layer that handles calls between services
Sidecar :: A proxy that runs inside each pod
Envoy :: The proxy used by Istio
Control plane :: Part that configures proxies
Data plane :: Part that carries the traffic
Ambient mesh :: Istio mode without a proxy in every pod
```
