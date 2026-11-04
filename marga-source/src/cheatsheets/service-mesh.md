---
title: Service mesh and Kubernetes networking
summary: Check Services and endpoints, DNS, network policy, sidecars, sync and the response flags in proxy logs.
module: service-mesh
---

## Service and endpoints

```bash
kubectl get svc,endpoints web -n shop
kubectl get svc web -n shop -o jsonpath='{.spec.selector}'
kubectl get pods -n shop --show-labels
kubectl get endpointslices -n shop
```

## DNS from a pod

```bash
kubectl exec -n shop deploy/web -- cat /etc/resolv.conf
kubectl exec -n shop deploy/web -- nslookup db.shop
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20
```

## Network policy

```bash
kubectl get networkpolicy -n shop
kubectl describe networkpolicy default-deny -n shop
kubectl exec -n shop deploy/web -- curl -s -m 2 http://db:5432
```

> **Tip:** A timeout where you expect a refusal often means a policy is dropping packets.

## Mesh health

```bash
istioctl version
istioctl proxy-status
istioctl analyze -n shop
kubectl get pods -n shop
kubectl label namespace shop istio-injection=enabled
kubectl rollout restart deployment -n shop
```

## Proxy logs and flags

```bash
kubectl logs web-7d -c istio-proxy --tail=20
```

| Flag | Meaning |
|---|---|
| UF | Upstream connection failure |
| UH | No healthy upstream |
| NR | No route configured |
| UC | Upstream connection terminated |
| URX | Retry limit exceeded |

## Method for a failing call

1. Find the first failing hop.
2. `istioctl proxy-status`: is the config SYNCED?
3. `istioctl analyze`: is the config valid?
4. Read the response flag.
5. Check endpoints, then policies (PeerAuthentication, AuthorizationPolicy).
6. Call the pod IP directly to take the mesh out of the picture.

## Quick mesh checks

```bash
istioctl analyze -n shop
istioctl proxy-status
istioctl proxy-config clusters POD.shop | head
kubectl get peerauthentication,authorizationpolicy -A
```

## Cautions

> **Danger:** Switching a namespace to STRICT mTLS rejects every client without a sidecar. Use PERMISSIVE first and check what is still plaintext.

> **Warning:** Retries at several layers multiply load. Keep one layer of retries and set a budget, or a slowdown becomes an outage.

> **Warning:** Weights in a VirtualService must add up to 100, and every subset must exist in a DestinationRule, or requests fail with 503.

> **Caution:** A default-deny network policy blocks DNS too. Allow egress to kube-dns or every lookup will fail.