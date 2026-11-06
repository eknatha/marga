---
title: Mesh authorization and zero trust policy
minutes: 13
summary: Use mTLS identities and authorization policies to allow only the calls you intend, with deny by default and safe rollout.
---

Encryption proves who is on the other end. Authorization decides what they may do. A mesh gives you both, replacing network location rules with identities that follow the workload.

## What you will learn

- How mesh identities are issued and verified
- Strict mTLS and migration from permissive mode
- Writing allow policies and default deny
- Rolling out policy without breaking traffic

## Identity and mTLS

Each workload gets a certificate tied to its Kubernetes **service account**, for example `spiffe://cluster.local/ns/shop/sa/checkout`. Start with **permissive** mode, which accepts both plain and mTLS traffic, then move to **strict** after you confirm every client uses the mesh.

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

## Allow policies

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payments-allow-checkout
  namespace: payments
spec:
  selector:
    matchLabels:
      app: payments
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/shop/sa/checkout"]
      to:
        - operation:
            methods: ["POST"]
            paths: ["/charge"]
```

Once any ALLOW policy applies to a workload, requests that match no rule are denied. Add a namespace-wide default deny and allow each needed path explicitly.

## Rollout

Inventory real traffic from mesh metrics first. Apply policies in audit or dry-run mode if your mesh supports it, watch denials in access logs and fix legitimate callers, then enforce. Keep policies in Git with owners and review, and alert on a sudden rise in denied requests.

```bash
kubectl get authorizationpolicy -A
kubectl logs -n payments deploy/payments -c istio-proxy | grep RBAC
```

## Incident: Strict mode broke the batch job

> **Incident:** Enabling strict mTLS stopped a job that sent plain traffic.

```console
upstream connect error or disconnect/reset before headers
reset reason: connection termination
caller: batch-export (no sidecar)
```

The nightly export ran outside the mesh and sent plain traffic. When the namespace switched to strict, its requests were rejected. The team now inventories callers from mesh metrics before enforcing, adds exceptions with a deadline for legacy clients and tests policy changes in staging.

## Common mistakes

- Switching to strict mTLS without finding non-mesh callers
- Allow rules with wildcards for everything
- No default deny
- Policies nobody owns or reviews

```quiz
Q: What identity does a workload present?
+ A certificate tied to its service account
- Its pod name only :: No.
- A password :: No.
- An IP address :: No.
> Identity follows the workload.

Q: What happens when an ALLOW policy exists and no rule matches?
+ The request is denied
- The request passes :: No.
- The pod restarts :: No.
- The mesh turns off :: No.
> ALLOW policies are exclusive.

Q: What is permissive mTLS for?
+ Migration before strict mode
- Production forever :: No.
- Disabling TLS :: No.
- Faster pods :: No.
> It accepts both kinds of traffic.

Q: How do you find legitimate callers?
+ Mesh metrics and access logs
- Guessing :: No.
- Pod count :: No.
- Node names :: No.
> Use real traffic data.
```

```cards
Principal :: The authenticated identity of a caller
Strict mTLS :: Only mutual TLS connections are accepted
Default deny :: Block everything not explicitly allowed
AuthorizationPolicy :: Rule that allows or denies requests
```
