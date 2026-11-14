## OOMKilled
level: junior
A container restarts every few minutes.

```text
$ kubectl describe pod api-1 | grep -A4 "Last State"
Last State: Terminated
 Reason: OOMKilled
 Exit Code: 137
$ kubectl get pod api-1 -o jsonpath="{.spec.containers[0].resources.limits.memory}"
256Mi
```
? What happened and what is the next step?
+ The container exceeded its memory limit, so measure peak use and raise the limit with headroom
- The node ran out of disk
- The CPU limit was too low
- The image is corrupt
why: Exit code 137 with OOMKilled means the kernel killed the process at its memory limit. Measure real peaks before setting a new one.

## Latency with low CPU
level: mid
An API is slow but average CPU is thirty percent.

```text
$ kubectl exec api-1 -- cat /sys/fs/cgroup/cpu.stat
nr_periods 12000
nr_throttled 5400
throttled_usec 91000000
```
? What does this show?
+ About forty five percent of periods were throttled by the CPU limit
- The disk is slow
- Memory is full
- DNS is broken
why: nr_throttled over nr_periods is the throttled share. Average CPU hides short bursts that the quota cuts off.

## Pods missing, none pending
level: mid
A Deployment shows 2 of 5 replicas and no pending pods.

```text
$ kubectl describe rs web-7d9 | tail -3
Warning FailedCreate Error creating: pods "web-7d9-x" is forbidden: exceeded quota: team-a, requested: requests.cpu=500m, used: requests.cpu=3800m, limited: requests.cpu=4
```
? Where is the cause?
+ The namespace ResourceQuota is exhausted, so raise it or reduce requests
- The scheduler is down
- The nodes are tainted
- The image tag is wrong
why: When pods do not exist, read the ReplicaSet events. A quota refusal happens at admission, before the scheduler sees anything.

## HPA shows unknown
level: junior
Autoscaling does nothing.

```text
$ kubectl get hpa web
NAME REFERENCE TARGETS MINPODS MAXPODS REPLICAS
web Deployment/web <unknown>/70% 2 10 2
```
? What is the usual cause?
+ The containers have no CPU requests or metrics-server is missing
- The max replicas is too high
- The service type is wrong
- The namespace is too long
why: Utilization is measured against requests. Without a request, or without a metrics source, the HPA cannot compute a number.

## Node never scales down
level: senior
A cluster stays at twenty nodes at night.

```text
$ kubectl -n kube-system logs deploy/cluster-autoscaler | grep node-12
node-12 cannot be removed: pod kube-system/metrics-0 is not replicated
node-12 cannot be removed: pod with local storage
```
? What should you do?
+ Check what blocks each node and mark safe-to-evict or use a controller backed pod
- Delete the node by hand each night
- Lower the pod count to zero
- Raise the node size
why: Scale-down skips nodes with pods that cannot be moved. Fix the blockers with annotations or workload changes.
