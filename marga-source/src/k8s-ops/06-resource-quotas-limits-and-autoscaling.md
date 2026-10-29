---
title: Resource quotas, limits and autoscaling
minutes: 13
summary: Share a cluster fairly with requests, limits, quotas and LimitRanges, and scale pods and nodes automatically.
---

A shared cluster needs rules about how much each team and workload can use. Without them, one runaway deployment can starve everything else. With sensible requests, limits, quotas and autoscaling, the cluster stays predictable and cost under control.

## What you will learn

- Set requests and limits and know their effects
- Apply ResourceQuotas and LimitRanges per namespace
- Use the Horizontal Pod Autoscaler
- Understand node autoscaling

## Requests and limits

A **request** is what the scheduler reserves; a **limit** is the ceiling. Exceeding the memory limit gets a container OOM-killed. Exceeding the CPU limit throttles it. The ratio of requests to limits sets the quality of service class: Guaranteed (equal), Burstable, or BestEffort (none), which is evicted first under pressure. Many teams set memory request equal to limit, and set CPU requests without a tight CPU limit to avoid throttling.

## Quotas and defaults

A **ResourceQuota** caps the total CPU, memory, storage or object counts in a namespace. A **LimitRange** sets default requests and limits and minimums or maximums per container, so pods without values still get sensible ones. With a quota on CPU or memory, pods must declare those resources or be rejected.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a
  namespace: team-a
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 64Gi
    pods: "100"
```

## Horizontal Pod Autoscaler

The HPA changes the replica count based on metrics such as CPU use compared with the request, or custom metrics. It needs the metrics server and CPU requests set. Set sensible minimum and maximum replicas, and remember it reacts over minutes: for sudden spikes keep enough baseline. Vertical autoscaling resizes requests and is useful for right-sizing, but changes may restart pods.

## Node autoscaling

The cluster autoscaler or Karpenter adds nodes when pods are Pending for lack of capacity and removes under-used ones. It relies on accurate requests: if requests are inflated you pay for idle nodes, and if they are too low pods are packed too tightly and suffer. Watch for pods that cannot be moved (local storage, strict budgets) which block scale-down.

```predict
Q: A pod is killed with reason OOMKilled. What changed or is wrong?
???
It exceeded its memory limit; raise the limit based on observed usage or fix a memory leak.
> Memory limits are hard.
```

## Incident: Namespace full

> **Incident:** A deployment could not create pods and showed "exceeded quota" events.

```console
$ kubectl describe quota team-a -n team-a
Resource          Used  Hard
requests.memory   63Gi  64Gi
$ kubectl get events -n team-a | tail -1
FailedCreate  exceeded quota: team-a, requested: requests.memory=4Gi, used: 63Gi, limited: 64Gi
```

The team had grown beyond its quota. They checked actual use, found three over-sized deployments, reduced their requests, and agreed a higher quota through a review rather than deleting the limit.

## Common mistakes

- No requests set
- CPU limits that cause throttling
- Quotas without defaults
- HPA without requests

```quiz
Q: What does the scheduler use?
+ Requests
- Limits :: No.
- Names :: No.
- Labels only :: No.
> Reserved amount. Re-read the matching lesson section for the full reasoning.

Q: What happens when a container exceeds its memory limit?
+ It is OOM-killed
- Throttled :: That is CPU.
- Ignored :: False.
- Paused :: False.
> Hard ceiling. Re-read the matching lesson section for the full reasoning.

Q: What does a LimitRange provide?
+ Default and bounds for containers
- A network rule :: No.
- A DNS name :: No.
- A secret :: No.
> Sensible defaults. Re-read the matching lesson section for the full reasoning.

Q: What does the HPA need to scale on CPU?
+ CPU requests and a metrics source
- A larger cluster :: No.
- A load balancer only :: No.
- A database :: No.
> Based on utilisation. Re-read the matching lesson section for the full reasoning.
```

```cards
Request :: reserved for scheduling
Limit :: ceiling
OOMKilled :: memory limit exceeded
ResourceQuota :: namespace total cap
LimitRange :: defaults and bounds
HPA :: scale replicas by metric
```
