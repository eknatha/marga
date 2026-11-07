---
title: mTLS and traffic management
minutes: 15
summary: Turn on mutual TLS, route traffic by weight for canaries, and set timeouts, retries and circuit breaking with VirtualService and DestinationRule.
---

Once the proxies are in place, the mesh gives you two big powers: every call can be encrypted and authenticated, and you can steer traffic with configuration instead of code.

## What you will learn

- Mutual TLS, identity and the PeerAuthentication modes
- Authorisation policy
- VirtualService and DestinationRule for routing
- Canary releases with weights
- Timeouts, retries and circuit breaking, and how they can hurt

## Mutual TLS

With ordinary TLS only the server proves who it is. In **mutual TLS (mTLS)** both sides do. The mesh gives each workload an identity (based on its service account), a short-lived certificate, and rotates it automatically.

`PeerAuthentication` sets the mode:

- **PERMISSIVE**: accepts both mTLS and plain text. Good while you migrate.
- **STRICT**: only mTLS. Plain text callers are rejected.

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: shop
spec:
  mtls:
    mode: STRICT
```

An `AuthorizationPolicy` then says who may call what, for example only the `web` service account may call `GET /orders`.

## Routing: VirtualService and DestinationRule

- A **DestinationRule** defines **subsets** of a service, usually by pod label (`version: v1`, `version: v2`), and policies such as connection limits.
- A **VirtualService** decides where requests go: by weight, by header, by path.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: reviews
  namespace: shop
spec:
  host: reviews
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: reviews
  namespace: shop
spec:
  hosts:
  - reviews
  http:
  - route:
    - destination:
        host: reviews
        subset: v1
      weight: 90
    - destination:
        host: reviews
        subset: v2
      weight: 10
```

This sends 10 percent of calls to version 2: a **canary**. Raise the weight as metrics stay healthy. The weights in one route must add up to 100, and a subset named in a VirtualService must exist in a DestinationRule, or the proxy returns errors.

```console
$ istioctl analyze -n shop
Error [IST0101] (VirtualService shop/reviews) Referenced host+subset in destinationrule not found: "reviews+v2"
```

## Timeouts, retries and circuit breaking

- A **timeout** stops a call from waiting forever.
- A **retry** repeats a failed call, which hides short faults but can multiply load.
- **Circuit breaking** (connection limits and outlier detection) stops sending traffic to a pod that keeps failing.

If service A retries three times and calls B, which retries three times and calls C, one slow C produces up to nine calls for each request: a **retry storm**. Put retries at one layer, use short per-try timeouts and cap the total.

```wrongpath
@goal Send 10 percent of reviews traffic to version 2 as a canary.
@wrong
# apply only the VirtualService
kubectl apply -f reviews-virtualservice.yaml
@result
$ curl -s http://reviews:9080/ -o /dev/null -w "%{http_code}
"
503
$ istioctl analyze -n shop
Error [IST0101] (VirtualService shop/reviews) Referenced host+subset in destinationrule not found: "reviews+v2"
@why A VirtualService can name a subset, but the subset is defined in a DestinationRule. Without it the proxy has no endpoints for "v2" and answers 503 to the requests routed there.
@right
kubectl apply -f reviews-destinationrule.yaml
kubectl apply -f reviews-virtualservice.yaml
istioctl analyze -n shop
@after Create the DestinationRule first, then the VirtualService, and run analyze before you watch the dashboards.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How mTLS and traffic management fits together
node: n1 | Mutual TLS | 0 | 0 | With ordinary TLS only the server proves who it is. | Switching to STRICT before every caller has a sidecar. | security
node: n2 | Routing: VirtualService and | 1 | 1 | A DestinationRule defines subsets of a service, usually by pod label (version: v1, version: v2), and policies such as connection limits. | Forgetting that a VirtualService needs its subsets to exist. | process
node: n3 | Timeouts, retries and circuit | 2 | 0 | A timeout stops a call from waiting forever. | Weights that do not add up to 100. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Retries made the outage worse

> **Incident:** A slow database caused a full outage of the storefront.

Three layers each retried failed calls three times with no limit. When the database slowed, each user request became dozens of calls, which overloaded it further. Removing retries from the inner layers, adding per-try timeouts, and enabling outlier detection restored stability.

## Common mistakes

- Switching to STRICT before every caller has a sidecar
- Weights that do not add up to 100
- Retries at several layers
- Forgetting that a VirtualService needs its subsets to exist

```quiz
Q: What is the difference between PERMISSIVE and STRICT mTLS?
+ PERMISSIVE accepts mTLS and plain text; STRICT accepts only mTLS
- They are the same :: No.
- STRICT accepts plain text :: No.
- PERMISSIVE turns off encryption everywhere :: It accepts both.
> Use PERMISSIVE while migrating and STRICT afterwards.

Q: Where are subsets such as v1 and v2 defined?
+ In a DestinationRule
- In a Deployment :: Labels are on pods; subsets are named in a DestinationRule.
- In a Namespace :: No.
- In a ConfigMap :: No.
> A DestinationRule maps subset names to labels.

Q: Why can nested retries be dangerous?
+ They multiply load and can turn a slowdown into an outage
- They encrypt traffic twice :: No.
- They disable timeouts :: No.
- They break DNS :: No.
> Retry storms overload the struggling service.

Q: What must the weights in a single route add up to?
+ 100
- 10 :: Not required.
- Any number :: Istio checks it.
- 1000 :: No.
> The total destination weight must equal 100.
```

```cards
mTLS :: Both sides prove their identity with certificates
PeerAuthentication :: Sets the mTLS mode for workloads
VirtualService :: Rules that route requests
DestinationRule :: Defines subsets and traffic policy
Canary :: Sending a small share of traffic to a new version
Circuit breaker :: Stops calls to a failing pod
```
