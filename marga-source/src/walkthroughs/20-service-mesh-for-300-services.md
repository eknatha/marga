# A service mesh for 300 services
level: Advanced
modules: service-mesh, kubernetes
lessons: service-mesh/what-a-service-mesh-is-and-how-it-works, service-mesh/mtls-and-traffic-management
summary: How a platform team adds encryption, identity and traffic control to hundreds of services without changing application code.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Encrypt and authenticate all service-to-service traffic
- Control retries, timeouts and canary releases centrally
- Show who calls whom and how well it goes
- Add the mesh gradually without outages

## The big picture

```diagram
title: Service mesh reference design
node: app | Application pods | 0 | 1 | Business code that calls other services by name. | Apps may add their own retries on top, multiplying load.
node: side | Sidecar or node proxy | 1 | 1 | Intercepts traffic, applies mTLS, routing and retries. | Memory and latency add up across thousands of pods.
node: cp | Control plane (istiod) | 2 | 0 | Pushes configuration and issues certificates to proxies. | If it is down, existing proxies keep working but cannot change.
node: ca | Certificate authority | 2 | 2 | Signs short-lived workload certificates. | A leaked root key breaks trust for every service.
node: gw | Ingress gateway | 3 | 1 | Brings external traffic in with TLS and routing rules. | A bad rule here affects every user.
node: tel | Telemetry stack | 4 | 0 | Metrics, traces and access logs from proxies. | High cardinality labels make it costly.
node: pol | Policy and rollout rules | 4 | 2 | Authorisation policies, canary weights, retry budgets. | A wrong rule silently breaks one path.
edge: app | side
edge: side | cp
edge: cp | ca
edge: side | gw
edge: side | tel
edge: cp | pol
edge: pol | side
```

## A request, step by step

1. A pod starts and the proxy gets a certificate for its service account from the control plane.
2. The app calls payments by name. The proxy resolves the name and picks a healthy endpoint.
3. The proxies set up mTLS, each checking the other side certificate.
4. The proxy applies the routing rule, such as 95 percent to v1 and 5 percent to v2, with a timeout and one retry.
5. An authorisation policy decides whether the caller identity may call this path.
6. Both proxies record metrics and a trace span, so the call appears on dashboards and in traces.

## Why the design looks like this

- **Proxies beside the app** add security and traffic control without code changes.
- **Short-lived certificates** limit the damage of a stolen key and avoid manual rotation.
- **A central control plane** gives one place to set policy.
- **Permissive mode first** lets teams adopt mTLS without breaking old clients.
- **Retry budgets** stop retries from turning a slowdown into an outage.

## Scaling decisions

1. Start with one namespace and permissive mTLS, and measure the added latency.
2. Turn on strict mTLS per namespace after checking that all traffic comes through proxies.
3. Add traffic rules for the services that release often.
4. Add authorisation policies starting from deny by default for sensitive services.
5. Consider ambient mode if sidecar cost is a problem.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Control plane outage | No new config or certificates | Run multiple replicas and watch certificate expiry |
| Sidecar not injected | Pod bypasses the mesh and fails strict mTLS | Namespace labels, admission checks, dashboards for unmeshed pods |
| Retry storm | A slow service is overwhelmed | Retry budgets and timeouts at one layer |
| Wrong DestinationRule | 503 for a subset that does not exist | Validate configuration in CI |
| Certificate expiry | Handshakes fail across services | Alerts well before expiry, tested renewal |
| Upgrade skew | Proxies and control plane disagree | Upgrade in order with canary revisions |

## Trade-offs

- A mesh gives uniform control and adds an operational layer to learn.
- Sidecars isolate cleanly and cost resources in every pod.
- Central policy is powerful and a mistake spreads quickly.

```predict
Q: After enabling strict mTLS, one old job gets connection reset errors. What is the likely cause and the safe fix?
???
The job talks plaintext from a pod without a sidecar, so strict mode rejects it. Switch that namespace back to permissive, inject the proxy or add an exception, then retry strict.
> Strict mTLS accepts only mutually authenticated traffic, so unmeshed clients fail first.
```
