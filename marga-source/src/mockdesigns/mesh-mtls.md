# Model answer: mTLS and traffic control for 300 services
prompt: mesh-mtls
summary: Roll out a mesh in permissive mode, issue short-lived workload certificates, then enforce strict mTLS and authorisation step by step.

## The answer in one minute

Install a mesh control plane, inject proxies by namespace, start in permissive mTLS, watch the traffic that is still plaintext, move namespaces to strict, then add authorisation policies and traffic rules. Set retry budgets and timeouts centrally and plan certificate renewal and upgrades.

## The design

```diagram
title: mTLS rollout design
node: app | Pods with proxies | 0 | 1 | Apps unchanged, proxy handles TLS. | Missing injection bypasses the mesh.
node: cp | Control plane | 1 | 0 | Distributes config and certs. | Needs multiple replicas.
node: ca | Mesh CA | 1 | 2 | Signs workload certificates. | Root key must be protected.
node: pol | Authorisation policy | 2 | 1 | Which identity may call which service. | Too open or too strict.
node: tr | Traffic rules | 3 | 0 | Timeouts, retries, canary weights. | Retry storms.
node: gw | Ingress and egress gateways | 3 | 2 | Entry and exit points. | Shared failure point.
node: tel | Telemetry | 4 | 1 | Golden signals per service pair. | High cardinality cost.
edge: app | cp
edge: cp | ca
edge: app | pol
edge: pol | tr
edge: tr | gw
edge: gw | tel
```

## Every component, explained

### Workload identity

Each pod gets an identity from its service account and a certificate that lasts hours, issued automatically.

Example: The checkout pod holds a certificate for spiffe://cluster/ns/shop/sa/checkout.

### Permissive then strict

Permissive mode accepts both plaintext and mTLS. Dashboards show the plaintext sources, and strict mode is enabled when none remain.

Example: Namespace shop moves to strict after the last cron job is fixed.

### Authorisation policy

Rules say which identities may call which paths. Start with deny by default on sensitive services.

Example: Only checkout may POST to /charge on payments.

### Traffic management

Timeouts, one retry layer, outlier detection and weighted routing live in the mesh configuration.

Example: A canary receives 5 percent of requests until its error rate is proven.

### Operations

Certificates are monitored for expiry, the control plane runs several replicas, and upgrades use canary revisions.

Example: A new control plane revision serves one namespace before all.

## Numbers to say out loud

- 300 services with 5 pods each is 1500 proxies.
- A sidecar costs about 50 to 100 MB and some CPU, so about 100 GB of memory across the fleet.
- Added latency per hop is usually a few milliseconds.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Missing sidecar | Strict mTLS rejects traffic | Injection checks and dashboards |
| Control plane down | No config changes | Replicas and runbook |
| Certificate expiry | Handshakes fail | Alerts and tested renewal |
| Retry storm | Overload | Budgets and timeouts |
| Policy typo | Traffic blocked | Dry run and tests in CI |

## Follow-up questions to expect

- How do you roll back?
- Sidecar or ambient?
- How do you handle traffic leaving the mesh?
