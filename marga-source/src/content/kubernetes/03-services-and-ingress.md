---
title: Services, DNS and Ingress
minutes: 16
summary: Give changing Pods a stable address with Services, understand cluster DNS, expose apps with Ingress and restrict traffic with NetworkPolicy.
---

Pods are disposable. Each replacement gets a new IP address, so nothing can rely on one. A **Service** solves that by providing a stable name and virtual IP in front of whichever Pods currently match. Most "it cannot connect" problems in Kubernetes come down to Services that select nothing.

## What you will learn

- The Service types and when to use each
- How labels connect a Service to Pods
- Cluster DNS names
- Ingress for HTTP routing, and NetworkPolicy for restriction

## Services

```yaml
apiVersion: v1
kind: Service
metadata:
  name: shop-api
  namespace: shop
spec:
  selector:
    app: shop-api
  ports:
    - port: 80
      targetPort: 8080
```

The Service sends traffic arriving on port 80 to port 8080 of every **ready** Pod that has the label `app: shop-api`. The list of those Pod addresses is called the Service's **endpoints**.

| Type | Reachable from | Typical use |
|------|----------------|-------------|
| `ClusterIP` (default) | Inside the cluster | Internal service-to-service calls |
| `NodePort` | Any node's IP on a high port | Simple tests, on-premises setups |
| `LoadBalancer` | A cloud load balancer's address | Exposing one service directly |
| `ExternalName` | Inside the cluster, as a DNS alias | Pointing at an external hostname |

## Cluster DNS

Every Service gets a DNS name: `<service>.<namespace>.svc.cluster.local`. Within the same namespace the short name `shop-api` works; from another namespace use `shop-api.shop`.

```console
$ kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -n shop -- nslookup shop-api
Name:      shop-api.shop.svc.cluster.local
Address 1: 10.96.142.7
```

This throwaway Pod is the standard way to test connectivity from inside the cluster.

## Ingress

Creating a `LoadBalancer` per service gets expensive. An **Ingress** routes HTTP and HTTPS traffic from one entry point to many Services by host or path. It needs an **Ingress controller** (for example ingress-nginx) running in the cluster; the Ingress object alone does nothing.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
  namespace: shop
spec:
  ingressClassName: nginx
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: shop-api
                port:
                  number: 80
```

## NetworkPolicy

By default every Pod can talk to every other Pod. A NetworkPolicy restricts that, but only if your network plugin enforces policies. A common pattern is to deny everything and then allow what is needed:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-allow-api-only
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes: [Ingress]
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: shop-api
      ports:
        - port: 5432
```

## Incident: the Service has no endpoints

> **Incident:** `curl http://shop-api` from another Pod times out or is refused, yet `kubectl get pods` shows all three Pods running.

```console
$ kubectl get endpoints shop-api -n shop
NAME       ENDPOINTS   AGE
shop-api   <none>      9m
$ kubectl get svc shop-api -n shop -o jsonpath='{.spec.selector}'
{"app":"shop-api"}
$ kubectl get pods -n shop --show-labels
NAME                       READY   STATUS    LABELS
shop-api-84c6b7d4f-ddddd   1/1     Running   app=shop-backend,pod-template-hash=84c6b7d4f
```

`<none>` is the clue. The Service selects `app=shop-api`, but the Pods carry `app=shop-backend`, so nothing matches. Fix the label in the Deployment template or the selector in the Service so they agree, apply, and check that the endpoints list appears. A second cause of empty endpoints is Pods that are running but not **ready**, so always look at both labels and the READY column. A third is the wrong `targetPort`, which gives you endpoints but connection refused.

## Common mistakes

- Mismatched labels between Service selector and Pods
- Using the Pod port as `port` and the Service port as `targetPort` the wrong way round
- Creating an Ingress without an Ingress controller
- Writing NetworkPolicies on a network plugin that does not enforce them

```quiz
Q: A Service shows ENDPOINTS <none>. What is the most likely cause?
- The Service type is ClusterIP
+ The selector does not match any ready Pod's labels
- DNS is disabled
- The namespace is empty
> Endpoints are built from ready Pods matching the selector.

Q: What is the full DNS name format of a Service?
- service.namespace.pod.cluster.local
+ service.namespace.svc.cluster.local
- namespace.service.cluster
- svc.service.local
> Services resolve as <service>.<namespace>.svc.cluster.local.

Q: What does an Ingress require to work?
- A NodePort Service on every node
+ An Ingress controller running in the cluster
- A database
- A LoadBalancer for every Service
> The Ingress object is only configuration; the controller implements it.

Q: In a Service, what does targetPort refer to?
- The port exposed on the Service
- The node port
+ The port the container listens on
- The Ingress port
> port is the Service's port; targetPort is where the Pods listen.
```

```cards
Why use a Service? :: It gives changing Pods a stable name and virtual IP
How do you test connectivity from inside the cluster? :: Run a temporary Pod with kubectl run --rm -it and use nslookup or curl
Ingress vs LoadBalancer Service? :: Ingress routes many hosts and paths through one entry point; a LoadBalancer exposes one Service
Default Pod network policy? :: All Pods can talk to all Pods until a NetworkPolicy restricts it
```
