---
title: Resource requests, limits, QoS and quotas
minutes: 16
summary: Size Pods with requests and limits, understand QoS classes and OOM kills, and use LimitRange and ResourceQuota to keep a shared cluster fair.
---

The scheduler places Pods using what they **request**, and the kernel enforces what they are **limited** to. Misunderstanding the difference causes some of the most common Kubernetes incidents: Pods stuck Pending, CPU throttling, and containers killed with "OOMKilled".

## What you will learn

- What requests and limits mean for scheduling and for enforcement
- CPU and memory behave differently when a limit is hit
- QoS classes and eviction order
- Namespace controls: LimitRange and ResourceQuota

## Requests versus limits

A **request** is the amount the scheduler reserves for the container. A Pod fits on a node only if the sum of requests fits in the node's allocatable resources. A **limit** is the maximum the container may use at runtime.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop-api
  template:
    metadata:
      labels:
        app: shop-api
    spec:
      containers:
        - name: api
          image: registry.example.com/shop/api:1.8.2
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              memory: 512Mi
```

CPU is measured in cores: `250m` is a quarter of a core. Memory is in bytes: `256Mi` is mebibytes. CPU is **compressible**: if a container tries to use more than its CPU limit, it is throttled and slows down. Memory is **incompressible**: if a container exceeds its memory limit the kernel kills it, and the status shows `OOMKilled` with exit code 137.

Many teams set memory requests equal to memory limits, and set CPU requests but omit CPU limits so containers can use idle CPU without throttling. Whatever you choose, measure first and set requests near typical usage.

## Seeing real usage

```console
$ kubectl top nodes
$ kubectl top pods -n shop --containers
$ kubectl describe node worker-2 | sed -n '/Allocated resources/,/Events/p'
$ kubectl get pod shop-api-7d9c-abcde -n shop -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason}'
OOMKilled
```

`kubectl top` needs the metrics server. Compare usage over days in Prometheus, not a single moment, before changing requests.

## QoS classes

Kubernetes assigns each Pod a Quality of Service class from its requests and limits, which determines who is evicted first under node memory pressure.

| Class | Condition | Evicted |
|-------|-----------|---------|
| Guaranteed | Every container has requests equal to limits for CPU and memory | Last |
| Burstable | At least one request or limit set, but not Guaranteed | Middle |
| BestEffort | No requests or limits at all | First |

Production workloads should never be BestEffort. Check a Pod's class with `kubectl get pod NAME -o jsonpath='{.status.qosClass}'`.

## LimitRange and ResourceQuota

Without guard rails, one team can consume a whole shared cluster. Two namespace-level objects set boundaries.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: shop
spec:
  limits:
    - type: Container
      default:
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        memory: 2Gi
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: shop-quota
  namespace: shop
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.memory: 32Gi
    pods: "40"
    persistentvolumeclaims: "10"
```

A **LimitRange** supplies defaults for containers that omit them and rejects unreasonable sizes. A **ResourceQuota** caps the total a namespace may request. When a quota covers CPU or memory, every Pod must declare them or it is rejected.

```console
$ kubectl describe quota shop-quota -n shop
$ kubectl describe limitrange defaults -n shop
```

## Incident: Pending Pods and a cluster that looks empty

> **Incident:** New Pods stay `Pending` with `0/6 nodes are available: 6 Insufficient cpu`. Yet `kubectl top nodes` shows every node at 15 percent CPU use. A finance meeting is waiting on the new reporting service.

The scheduler counts **requests**, not usage. Teams had set generous CPU requests years ago, and the nodes are fully reserved while mostly idle.

```console
$ kubectl describe node worker-1 | sed -n '/Allocated resources/,/Events/p'
  cpu                7800m (97%)    0 (0%)
$ kubectl top pods -A --sort-by=cpu | head -5
```

Right-size by lowering requests to match measured usage, using the Vertical Pod Autoscaler in recommendation mode as a guide. Meanwhile add nodes if the service is urgent. Prevent drift with quotas and a periodic review of requested versus used.

## Common mistakes

- Setting memory limits far below real peak usage, causing OOM kills
- Setting huge CPU requests "to be safe", wasting capacity
- Leaving workloads BestEffort
- Believing `kubectl top` usage determines scheduling
- Forgetting that a quota forces every Pod to declare resources

```quiz
Q: What does the scheduler use to decide whether a Pod fits on a node?
- Actual CPU usage
+ The sum of container resource requests
- Container limits
- Node name
> Scheduling is based on reserved requests, not current usage.

Q: What happens when a container exceeds its memory limit?
- It is throttled
+ It is OOM-killed and restarted
- Nothing
- The node reboots
> Memory cannot be throttled, so the kernel terminates the process.

Q: Which QoS class is evicted first under memory pressure?
+ BestEffort
- Guaranteed
- Burstable
- All are equal
> Pods with no requests or limits are the first to go.

Q: What does a ResourceQuota do?
- Sets default container sizes
+ Caps the total resources and object counts a namespace may use
- Limits network traffic
- Schedules Pods to nodes
> LimitRange sets per-container defaults; ResourceQuota sets the namespace total.
```

```cards
Exit code and reason for an OOM kill? :: 137 and OOMKilled
CPU limit exceeded means? :: The container is throttled, not killed
Guaranteed QoS requires? :: Requests equal to limits for CPU and memory in every container
LimitRange versus ResourceQuota? :: Per-container defaults and bounds versus namespace totals
```
