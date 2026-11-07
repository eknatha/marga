---
title: Traffic shifting, retries and timeouts
minutes: 13
summary: Shift traffic gradually between versions, set safe retries and timeouts and avoid retry storms in a service mesh.
---

Mesh routing rules let you release gradually and add resilience without changing code. They also let you hurt yourself with a single setting, so you need to understand how weights, retries and timeouts combine.

## What you will learn

- Weighted routing for canary releases
- Timeouts and retries that respect idempotency
- Circuit breaking and outlier detection
- Preventing retry storms

## Weighted routing

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts: [api]
  http:
    - route:
        - destination: {host: api, subset: v1}
          weight: 95
        - destination: {host: api, subset: v2}
          weight: 5
      timeout: 3s
      retries:
        attempts: 2
        perTryTimeout: 1s
        retryOn: connect-failure,refused-stream,503
```

Start the canary at a small weight, compare error rate and latency of the two subsets, and increase in steps. Roll back by setting the weight to zero.

## Timeouts and retries

Work backwards from the user's deadline. If the caller waits 3 seconds, three tries at 3 seconds each are pointless. Retry only **idempotent** operations or failures that happened before the request was processed, such as connection failures. Retrying a payment POST can charge twice.

## Protecting the dependency

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api
spec:
  host: api
  trafficPolicy:
    connectionPool:
      http: {http1MaxPendingRequests: 100, maxRequestsPerConnection: 50}
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

**Connection limits** act as circuit breakers by failing fast when a service is overloaded. **Outlier detection** ejects unhealthy endpoints for a time. Together with a **retry budget**, they stop callers from piling more load onto a failing service.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Traffic shifting, retries and timeouts fits together
node: n1 | Weighted routing | 0 | 0 | Start the canary at a small weight, compare error rate and latency of the two subsets, and increase in steps. | Per-try timeouts longer than the overall timeout. | process
node: n2 | Timeouts and retries | 1 | 1 | Work backwards from the user's deadline. | Retrying non-idempotent requests. | process
node: n3 | Protecting the dependency | 2 | 0 | Connection limits act as circuit breakers by failing fast when a service is overloaded. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Retries tripled the load

> **Incident:** A small slowdown became an outage because every layer retried.

```console
frontend -> api       attempts: 3
api -> db-proxy       attempts: 3
db-proxy requests per second: 9x normal
```

Each layer added its own retries. A brief slowdown at the database was multiplied by nine, which kept it overloaded. The team kept retries at one layer, added timeouts that fit inside the caller's deadline and set circuit breakers so overloaded services reject quickly.

## Common mistakes

- Retrying at every layer
- Retrying non-idempotent requests
- Per-try timeouts longer than the overall timeout
- Moving canary weights without watching per-version errors

```quiz
Q: What should retries respect?
+ Idempotency and the caller's deadline
- Only DNS :: No.
- Nothing :: No.
- Pod names :: No.
> Unsafe retries duplicate effects.

Q: What does outlier detection do?
+ Ejects unhealthy endpoints temporarily
- Adds nodes :: No.
- Encrypts traffic :: No.
- Scales pods :: No.
> It removes bad instances from rotation.

Q: How should a canary start?
+ At a small weight with monitoring
- At 100 percent :: No.
- With no metrics :: No.
- By deleting v1 :: No.
> Increase in steps. The lesson section above explains why.

Q: What causes a retry storm?
+ Layers multiplying retries during a slowdown
- Too few pods :: No.
- A new label :: No.
- Short DNS TTLs :: No.
> Load grows exponentially.
```

```cards
Weighted routing :: Splitting traffic by percentage between versions
Retry budget :: A cap on how many retries are allowed
Circuit breaker :: Fails fast when a service is overloaded
Outlier detection :: Ejecting unhealthy endpoints
```
