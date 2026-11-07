---
title: Ingress gateways and the Gateway API
minutes: 12
summary: Bring outside traffic into a mesh with gateways, use the Kubernetes Gateway API and secure the edge with TLS and routing rules.
---

Traffic enters a cluster through a gateway before it meets the mesh. The older Ingress resource was limited, and the Gateway API replaces it with roles, richer routing and a standard that many implementations share.

## What you will learn

- The roles of GatewayClass, Gateway and routes
- Routing by host, path and header
- TLS termination and certificate handling
- Timeouts, limits and safe change control

## Resources

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: infra
spec:
  gatewayClassName: istio
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: shop.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: shop-cert
      allowedRoutes:
        namespaces:
          from: Selector
          selector:
            matchLabels:
              expose: "true"
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop-web
  namespace: shop
spec:
  parentRefs:
    - name: public
      namespace: infra
  hostnames: ["shop.example.com"]
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api
          port: 8080
    - backendRefs:
        - name: web
          port: 80
```

The **GatewayClass** names the implementation, the **Gateway** defines listeners and is owned by the platform team, and **HTTPRoute** objects are owned by application teams and attach to the gateway. Selectors limit which namespaces may attach.

## TLS and limits

Terminate TLS at the gateway with certificates managed by an automated issuer, and keep mTLS inside the mesh. Set request timeouts, maximum body sizes and rate limits at the edge. Redirect HTTP to HTTPS and restrict allowed hosts.

## Operating

```bash
kubectl get gateway,httproute -A
kubectl describe httproute shop-web -n shop
```

Read the route **status conditions**: they say whether it was accepted and which parent it attached to. Roll out route changes with review, and test a canary host before moving real traffic.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Ingress gateways and the Gateway API fits together
node: n1 | Resources | 0 | 0 | The GatewayClass names the implementation, the Gateway defines listeners and is owned by the platform team, and HTTPRoute objects are owned by application teams and... | One shared route object edited by many teams. | process
node: n2 | TLS and limits | 1 | 1 | Terminate TLS at the gateway with certificates managed by an automated issuer, and keep mTLS inside the mesh. | No timeouts or limits at the edge. | security
node: n3 | Operating | 2 | 0 | Read the route status conditions: they say whether it was accepted and which parent it attached to. | Not reading route status conditions. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: One route hid another

> **Incident:** A new route with an overlapping prefix took traffic from the checkout service.

```console
HTTPRoute shop-web: Accepted=True
/api          -> api
/api/checkout -> checkout-v2 (backend has no such path)
checkout errors: 3% returned 404
```

A team added a more specific rule that pointed to a backend with a different path layout. Because the longest prefix wins, checkout traffic moved to it. The team added route tests in CI, reviews by the owning team and a canary hostname for new routes.

## Common mistakes

- One shared route object edited by many teams
- Not reading route status conditions
- Terminating TLS without automatic renewal
- No timeouts or limits at the edge

```quiz
Q: Who usually owns the Gateway?
+ The platform team
- Every developer :: No.
- No one :: No.
- The database :: No.
> It defines listeners.

Q: What do HTTPRoute objects do?
+ Define routing rules for a gateway
- Create nodes :: No.
- Store secrets :: No.
- Run builds :: No.
> They attach to a Gateway.

Q: Where do you see why a route did not apply?
+ Status conditions
- Node labels :: No.
- Pod logs only :: No.
- DNS :: No.
> Check Accepted and ResolvedRefs.

Q: Why automate certificate renewal?
+ Expired certificates break the edge
- To hide hosts :: No.
- To avoid DNS :: No.
- To skip TLS :: No.
> Renew before expiry.
```

```cards
Gateway :: Resource that defines listeners and entry points
HTTPRoute :: Routing rules attached to a gateway
GatewayClass :: Names the controller implementing gateways
TLS termination :: Decrypting traffic at the gateway
```
