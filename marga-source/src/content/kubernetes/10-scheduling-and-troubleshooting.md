---
title: Scheduling and troubleshooting
minutes: 18
summary: Control where Pods run with selectors, taints and affinity, and work through the common failure states in a repeatable order.
---

Two skills separate someone who uses Kubernetes from someone who can run it: placing workloads on purpose, and diagnosing a broken Pod quickly without guessing. This lesson gives you a method for the second, and the tools for the first.

## What you will learn

- nodeSelector, affinity, taints and tolerations
- Spreading replicas for availability
- A fixed diagnostic order for failing Pods
- What each common Pod status means

## Placement

| Tool | Purpose |
|------|---------|
| `nodeSelector` | Run only on nodes with a given label |
| **Node affinity** | Same, with richer rules and "preferred" versus "required" |
| **Taint** (on a node) | Repel Pods unless they tolerate it |
| **Toleration** (on a Pod) | Allows scheduling onto a tainted node |
| **Pod anti-affinity / topology spread** | Keep replicas on different nodes or zones |

Taints and tolerations are for *keeping others away*: dedicate GPU nodes by tainting them, and only GPU workloads tolerate the taint. Affinity is for *attracting* Pods.

```console
$ kubectl label node worker-3 disktype=ssd
$ kubectl taint nodes worker-3 dedicated=gpu:NoSchedule
```

Spread replicas so one node or zone failure does not take all of them:

```yaml
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: shop-api
```

Protect availability during voluntary disruptions such as node drains with a **PodDisruptionBudget**:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: shop-api
  namespace: shop
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: shop-api
```

## The diagnostic order

Do the same steps every time, from broad to specific:

```console
$ kubectl get pods -n shop                      # status and restarts
$ kubectl describe pod NAME -n shop             # events at the bottom
$ kubectl logs NAME -n shop --previous          # logs of the crashed container
$ kubectl get events -n shop --sort-by=.lastTimestamp
$ kubectl get endpoints,svc -n shop             # networking
$ kubectl top pod -n shop                       # resource use, if metrics are installed
```

| Status | Meaning | Usual cause and first step |
|--------|---------|----------------------------|
| `Pending` | Not scheduled yet | No node fits (requests too big, taints, unbound PVC). `describe` shows `FailedScheduling` |
| `ImagePullBackOff` / `ErrImagePull` | Cannot fetch the image | Wrong name or tag, or missing registry credentials |
| `CrashLoopBackOff` | Container keeps exiting | Application error or bad config. Read `logs --previous` |
| `OOMKilled` (in last state) | Exceeded memory limit | Raise the limit or fix the leak |
| `CreateContainerConfigError` | Missing ConfigMap, Secret or key | Create it or correct the reference |
| `Running` but `0/1` ready | Readiness probe failing | Check probe path, port, app start-up |
| `Terminating` for long | Finalizer or stuck process | Investigate the cause before forcing deletion |

For a node that is unhealthy, `kubectl describe node` shows conditions such as `MemoryPressure` and `DiskPressure`. To empty a node for maintenance without downtime, use `kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data`, which respects PodDisruptionBudgets, then `kubectl uncordon worker-2` when finished.

## Incident: a Pod will not schedule

> **Incident:** The new `batch` Deployment shows 0 of 3 Pods running. All three are `Pending`.

```console
$ kubectl describe pod batch-5f9c7b8d6-abcde -n shop | tail -4
Events:
  Warning  FailedScheduling  default-scheduler  0/4 nodes are available: 1 node(s) had untolerated taint {dedicated: gpu}, 3 Insufficient memory.
```

Read the message literally: of four nodes, one is tainted and the Pod has no toleration, and the other three do not have enough free memory for the **request** (the scheduler places by requests, not by current use). Check what is being asked and what is free:

```console
$ kubectl get deploy batch -n shop -o jsonpath='{.spec.template.spec.containers[0].resources}'
$ kubectl describe node worker-1 | grep -A6 "Allocated resources"
```

If the request of 8Gi is far larger than the workload needs, lower it. If it is genuinely needed, add capacity or let a cluster autoscaler add a node. Do not add a toleration for the GPU taint just to get scheduled, since that defeats the reason the taint exists.

## Common mistakes

- Reading `kubectl logs` without `--previous` after a crash
- Skipping `describe` and its events
- Putting every replica on one node
- Draining nodes with no PodDisruptionBudget on critical services
- Forcing deletion of Pods without understanding why they are stuck

```quiz
Q: A Pod is CrashLoopBackOff. Which command shows why the previous container exited?
- kubectl get pods
+ kubectl logs POD --previous
- kubectl top pod
- kubectl cordon
> The current container may have just restarted and have no logs. --previous returns the crashed one's output.

Q: What do taints and tolerations do?
- Attract Pods to a node
+ A taint repels Pods from a node unless they have a matching toleration
- Limit Pod CPU
- Encrypt Pod traffic
> Taints keep unsuitable Pods away; tolerations permit specific Pods through.

Q: FailedScheduling says Insufficient memory but the nodes look mostly idle. Why?
- The metrics server is broken
+ The scheduler places Pods by their resource requests, not current usage
- Memory limits are ignored
- The nodes are not Ready
> Requests reserve capacity even when real use is lower.

Q: What does a PodDisruptionBudget protect against?
- Application crashes
+ Too many Pods being voluntarily evicted at once, such as during a drain
- Image pull failures
- Node hardware faults
> It limits voluntary disruptions so a minimum number of replicas stays available.
```

```cards
Diagnostic order for a broken Pod? :: get, describe (events), logs --previous, events, then service and endpoint checks
ImagePullBackOff means? :: The image cannot be pulled: wrong name or tag, or missing registry credentials
Safe way to empty a node? :: kubectl drain NODE --ignore-daemonsets --delete-emptydir-data, then uncordon after
Why does the scheduler look at requests? :: It reserves capacity based on declared requests, not on live usage
```
