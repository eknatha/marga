---
title: Service mesh, mutual TLS and traffic control
minutes: 14
summary: Understand what a service mesh adds to a cluster, how sidecar and sidecarless data planes work, how mutual TLS and traffic policies are applied, and when a mesh is not worth its cost.
---

As services multiply, the same needs appear in all of them: encrypt traffic between services, know who is calling whom, retry failed calls sensibly, and shift traffic gradually between versions. A service mesh moves these concerns out of application code and into the platform. It is powerful and it is costly, so you should know both sides.

## What you will learn

- What a mesh adds: identity, encryption, traffic control and telemetry
- Data plane and control plane
- Mutual TLS and authorization policy
- Traffic splitting, retries and timeouts
- The cost: complexity, resources and debugging

## Parts of a mesh

The **data plane** is a set of proxies that handle service-to-service traffic. In the sidecar model each Pod gets a proxy container (often Envoy); newer designs use a per-node proxy or an eBPF-based approach to avoid a sidecar in every Pod. The **control plane** (Istio, Linkerd, Cilium service mesh and others) configures the proxies, issues certificates and collects telemetry.

Applications keep making plain calls to `http://payments`; the proxy intercepts and adds behaviour.

## Mutual TLS and identity

With mutual TLS (mTLS) both sides present certificates, so each service knows who is calling and the traffic is encrypted. The mesh gives each workload an identity (for example, based on its Kubernetes service account) and rotates short-lived certificates automatically. You get encryption between services without changing code.

On top of identity you can write authorization rules: only the `checkout` workload may call `POST /charge` on `payments`.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata: { name: payments-allow-checkout, namespace: shop }
spec:
  selector: { matchLabels: { app: payments } }
  action: ALLOW
  rules:
    - from: [{ source: { principals: ["cluster.local/ns/shop/sa/checkout"] } }]
      to:   [{ operation: { methods: ["POST"], paths: ["/charge"] } }]
```

Roll out mTLS in permissive mode first (accept both plain and mTLS), check that nothing still sends plain traffic, then switch to strict.

## Traffic control

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata: { name: reviews }
spec:
  hosts: [reviews]
  http:
    - route:
        - destination: { host: reviews, subset: v1 }
          weight: 90
        - destination: { host: reviews, subset: v2 }
          weight: 10
      timeout: 2s
      retries: { attempts: 2, perTryTimeout: 500ms, retryOn: "5xx,connect-failure" }
```

This sends 10 percent of traffic to version 2, with a timeout and limited retries. Be careful with retries: they multiply load during an outage (a retry storm) and are only safe for requests that can be repeated. Circuit breaking and outlier detection remove failing instances from rotation.

## Telemetry

Because proxies see every call, the mesh can report request rate, errors and latency per service pair without code changes, and can create trace spans. Applications must still pass trace headers along for full traces.

## The cost

- Extra resources: each sidecar uses CPU and memory, and adds a little latency.
- More moving parts to upgrade, and a new class of failures (certificate expiry, proxy misconfiguration).
- Debugging has another layer: a 503 may come from the proxy, not the app.
- Skills: the team must understand the mesh.

A mesh pays off with many services, strict security needs (mTLS everywhere, fine-grained policy) or frequent progressive delivery. For a handful of services, simpler tools may be enough: network policies, an ingress controller, and application-level TLS.

```predict
Q: You switch a namespace to strict mTLS and a legacy job outside the mesh can no longer reach a service. Why?
???
The job sends plain traffic and has no mesh certificate, and strict mode rejects connections that are not mutual TLS.
> Use permissive mode while migrating, find non-mesh clients from telemetry, then enable strict.
```

## Incident: the certificate that expired inside the mesh

> **Incident:** At 02:10 many internal calls fail with 503 and "upstream connect error", but applications look healthy.

```console
$ istioctl proxy-status | head -3
NAME                CLUSTER  CDS     LDS     EDS     RDS
api-7d9f.shop       prod     STALE   STALE   STALE   STALE
$ kubectl logs deploy/istiod -n istio-system --since=1h | grep -i cert
x509: certificate has expired
```

The mesh's root certificate had expired because rotation had been left manual. Proxies could not get new configuration or certificates. The team issued a new root, rolled the control plane and proxies, and then automated rotation with an alert on certificate expiry 30 days ahead.

## Common mistakes

- Enabling strict mTLS without migration
- Unlimited retries
- No alert on mesh certificate expiry
- Adopting a mesh for two services

```quiz
Q: What does mutual TLS add compared with ordinary TLS?
+ Both client and server prove their identity with certificates
- Faster connections :: It costs a little time.
- Compression :: Unrelated.
- Caching :: Unrelated.
> Both sides are authenticated, so policy can use the caller's identity.

Q: What is the control plane responsible for?
- Carrying every request :: That is the data plane.
+ Configuring proxies, issuing certificates and collecting telemetry
- Storing container images :: A registry does that.
- Scheduling Pods :: The Kubernetes scheduler does that.
> The control plane tells the proxies what to do.

Q: Why can retries be dangerous?
- They are slow :: Not the main danger.
+ They multiply load during an outage and may repeat non-repeatable requests
- They use TLS :: Unrelated.
- They hide logs :: Unrelated.
> Limit attempts and retry only safe requests.

Q: When might a mesh be more than you need?
+ For a few services, where network policies and ingress already meet the need
- For hundreds of services :: That is where it helps.
- When you need mTLS everywhere :: A mesh helps there.
- When you do canary releases often :: A mesh helps there.
> Weigh the cost against the benefits.
```

```cards
Data plane versus control plane? :: Data plane: proxies carrying traffic. Control plane: configures them
What is mTLS? :: Both sides present certificates
Safe mTLS migration? :: Permissive mode first, then strict
Risk of retries? :: Retry storms and repeated side effects
Mesh cost? :: Resources, complexity and a new failure layer
```
