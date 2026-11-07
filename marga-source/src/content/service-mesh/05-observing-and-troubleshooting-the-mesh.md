---
title: Observing and troubleshooting the mesh
minutes: 14
summary: Read mesh metrics and traces, check configuration sync with istioctl, and decode the common 503 and connection errors.
---

A mesh adds a hop to every call, which makes problems harder to place: is it the app, the proxy or the configuration? The same proxies that add the hop also give you the best visibility you will ever have.

## What you will learn

- The metrics and traces a mesh produces for free
- Checking sync with `istioctl proxy-status` and `analyze`
- Reading proxy response flags in access logs
- A step-by-step method for a failing call

## What you get for free

Every proxy reports the **golden signals** for each service pair: request rate, error rate, latency and saturation. Add distributed tracing headers and you can see a request's path through services. Dashboards such as Kiali (a topology graph), Grafana and Jaeger show it.

## Is the configuration there?

Before blaming the app, check that the proxy has the configuration you wrote.

```console
$ istioctl proxy-status
NAME             CLUSTER      CDS      LDS      EDS      RDS      ISTIOD
web-7d.shop      Kubernetes   SYNCED   SYNCED   SYNCED   SYNCED   istiod-6d4b9c7f5-xk2lp
reviews-9a.shop  Kubernetes   SYNCED   STALE    SYNCED   SYNCED   istiod-6d4b9c7f5-xk2lp
$ istioctl analyze -n shop
Info [IST0118] (Service shop/web) Port name  (port: 80, targetPort: 8080) doesn't follow the naming convention of Istio port.
```

- **STALE** or **NOT SENT** means the proxy has not received or accepted the latest configuration.
- `analyze` checks your configuration for mistakes. Port names that do not start with a protocol (`http-`, `grpc-`, `tcp-`) make the mesh treat the traffic as plain TCP, so HTTP features silently do not apply.

## Reading response flags

Envoy access logs show a short **response flag** that says why a request failed.

| Flag | Meaning | Look at |
|---|---|---|
| UF | Upstream connection failure | Is the destination pod up? mTLS mode mismatch? |
| UC | Upstream connection terminated | App closed the connection, timeouts |
| NR | No route configured | VirtualService host or Gateway |
| UH | No healthy upstream | Endpoints empty, readiness probes |
| URX | Retry limit exceeded | Backend failing; retries too high |
| DC | Downstream connection terminated | Client gave up |

```console
$ kubectl logs web-7d -c istio-proxy | tail -2
[2026-11-03T10:12:01.221Z] "GET /orders HTTP/1.1" 503 UH no_healthy_upstream - 0 19 0 - "-" "curl/8" "reviews.shop.svc.cluster.local:9080"
```

`503 UH` for the reviews service tells you no healthy endpoint exists, so check the selector, readiness and rollout of reviews.

## A method for a failing call

1. **Which hop?** Use the trace or the access logs to find the first failing hop.
2. **Does the proxy have current config?** `istioctl proxy-status`.
3. **Is the config valid?** `istioctl analyze`.
4. **What does the flag say?** Read the response flag in the log.
5. **Does the destination have endpoints?** `kubectl get endpoints`.
6. **Is it a policy?** Check PeerAuthentication and AuthorizationPolicy.
7. **Take the mesh out of the picture.** Call the pod IP directly to see whether the app is the problem.

```wrongpath
@goal Calls from web to reviews suddenly return 503. Find the cause.
@wrong
# assume the app is broken and redeploy reviews, then scale it up
kubectl rollout restart deployment/reviews -n shop
kubectl scale deployment/reviews --replicas=10 -n shop
@result
$ kubectl logs web-7d -c istio-proxy | tail -1
"GET /reviews HTTP/1.1" 503 UF upstream_reset_before_response_started{connection_termination}
# still failing with more pods
@why UF means the connection to the upstream failed. The new PeerAuthentication in reviews is STRICT, but web has no sidecar so it calls in plain text. More replicas cannot fix a protocol mismatch.
@right
kubectl get pods -n shop
istioctl proxy-status
kubectl get peerauthentication -A
# give web a sidecar, or set PERMISSIVE until it has one
@after Read the response flag before changing anything. UF with a recent mTLS change is a mismatch between a plain text caller and a STRICT destination.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Observing and troubleshooting the mesh fits together
node: n1 | What you get for free | 0 | 0 | Every proxy reports the golden signals for each service pair: request rate, error rate, latency and saturation. | Looking at the app first when the proxy configuration is stale. | process
node: n2 | Is the configuration there? | 1 | 1 | Before blaming the app, check that the proxy has the configuration you wrote. | Port names without a protocol prefix. | process
node: n3 | Reading response flags | 2 | 0 | Envoy access logs show a short response flag that says why a request failed. | Ignoring response flags. | process
node: n4 | A method for a failing call | 3 | 1 | Which hop?. Use the trace or the access logs to find the first failing hop. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Everything is up, nothing works

> **Incident:** The checkout page returned errors, but every pod was Running.

`istioctl proxy-status` showed 40 proxies STALE. The control plane had run out of memory and restarted, and it could not push new configuration. Raising its memory limit and adding a second replica fixed it. Without proxy-status the team would have spent hours inspecting healthy pods.

## Common mistakes

- Looking at the app first when the proxy configuration is stale
- Port names without a protocol prefix
- Ignoring response flags
- Running a single control plane replica

```quiz
Q: What does STALE mean in istioctl proxy-status?
+ The proxy has not received or accepted the latest configuration
- The pod is deleted :: No.
- The certificate is valid :: No.
- The app is slow :: No.
> STALE points at a configuration sync problem.

Q: In an Envoy log, what does UH mean?
+ No healthy upstream endpoints
- Unknown host in DNS :: Not exactly.
- User header missing :: No.
- Upgrade handled :: No.
> UH means the destination has no healthy endpoints.

Q: Why should Service ports be named like http-web?
+ So the mesh knows the protocol and can apply HTTP features
- To make names shorter :: No.
- Kubernetes requires it :: Not for plain Kubernetes.
- To change the port number :: No.
> Without a protocol prefix the traffic is treated as plain TCP.

Q: A call fails with UF right after STRICT mTLS was set. What is the likely cause?
+ A caller without a sidecar is calling in plain text
- The disk is full :: No.
- The cluster has too many nodes :: No.
- The image tag changed :: Not related.
> UF with mTLS changes usually means a protocol mismatch.
```

```cards
Response flag :: Short code in a proxy log saying why a request failed
proxy-status :: istioctl command showing config sync
analyze :: istioctl command that checks configuration
Golden signals :: Rate, errors, latency and saturation
Kiali :: Dashboard that draws the mesh topology
Trace :: The path of one request across services
```
