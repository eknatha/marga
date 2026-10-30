---
title: Debugging Kubernetes workloads
minutes: 18
summary: Follow a fixed path from Pending to CrashLoopBackOff, ImagePullBackOff, failing probes and unreachable Services using describe, logs, events, exec and ephemeral debug containers.
---

Kubernetes reports problems in a small set of states: Pending, ImagePullBackOff, CrashLoopBackOff, Running but not Ready, and a Service that routes nowhere. Each state points to a different part of the system. Learn the state, then the one or two commands that explain it.

## What you will learn

- What each Pod state means and where to look
- `describe`, `logs --previous`, `get events`, `exec` and `kubectl debug`
- Checking Services, endpoints, DNS and network policy
- Node-level problems: pressure, taints and capacity

## Start with the Pod

```console
$ kubectl get pods -o wide
NAME            READY   STATUS             RESTARTS   AGE
shop-7d9f-abc   0/1     CrashLoopBackOff   6          9m
$ kubectl describe pod shop-7d9f-abc | sed -n '/State:/,/Ready:/p;/Events:/,$p'
$ kubectl logs shop-7d9f-abc --previous --tail=50
$ kubectl get events --sort-by=.lastTimestamp -n shop | tail -15
```

`describe` shows the last state, exit code and events. `logs --previous` shows the output of the container that just died, which `logs` alone does not.

| State | Meaning | First check |
|-------|---------|-------------|
| Pending | Not scheduled | Events: insufficient CPU or memory, taints, unbound volume claim |
| ImagePullBackOff | Cannot pull the image | Image name and tag, registry secret, network |
| CrashLoopBackOff | Starts and exits repeatedly | `logs --previous`, exit code, OOMKilled, config |
| Running, not Ready | Readiness probe fails | Probe path and port, app startup time |
| Evicted | Node under pressure | Node conditions, resource requests |
| Terminating forever | Finalizer or stuck volume | `get pod -o yaml` for finalizers |

## Get inside, even without a shell

```bash
kubectl exec -it shop-7d9f-abc -- sh
kubectl debug -it shop-7d9f-abc --image=busybox:1.36 --target=app   # ephemeral container
kubectl debug node/worker-2 -it --image=busybox:1.36                # look at a node
kubectl get pod shop-7d9f-abc -o yaml | less                         # the full spec and status
```

An ephemeral container shares the Pod's namespaces, so you can test with tools the production image does not ship.

## A Service that goes nowhere

```console
$ kubectl get svc shop -o wide
$ kubectl get endpoints shop
NAME   ENDPOINTS
shop   <none>
$ kubectl get pods --show-labels
```

Empty endpoints mean the Service selector matches no Ready Pod. Compare the selector with the Pod labels and check readiness. Then test from inside the cluster:

```bash
kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- http://shop.shop.svc.cluster.local
```

If the name does not resolve, check CoreDNS Pods. If it resolves but hangs, check NetworkPolicy and the target port.

```predict
Q: A Pod is Pending and the event says "0/3 nodes are available: 3 Insufficient memory". What are your options?
???
Lower the memory request, add node capacity, or free resources by scaling other workloads.
> The scheduler places Pods by requests, not by actual use. A request larger than any node's free allocatable memory can never schedule.
```

```diagram
title: From a broken Pod to a cause
node: get | Pod state | 0 | 1 | kubectl get pods shows Pending, CrashLoopBackOff or not Ready. | The state alone does not give the cause. | process
node: desc | Describe and events | 1 | 0 | Shows exit code, scheduling messages, probe failures and pull errors. | Events expire after about an hour, so look soon.
node: logs | Logs, previous run | 1 | 2 | logs --previous prints output from the crashed container. | Plain logs show only the new, empty container.
node: svc | Service and endpoints | 2 | 0 | Empty endpoints mean the selector or readiness is wrong. | A correct Pod behind a mismatched selector still receives no traffic.
node: node | Node and policy | 2 | 2 | Check node conditions, taints, quotas and NetworkPolicy. | The Pod can be fine while the node or policy blocks it.
edge: get | desc
edge: get | logs
edge: desc | svc
edge: logs | node
```

## Incident: healthy Pods, no traffic

> **Incident:** After a rollout, the shop returns 503 from the ingress although all Pods show Running.

```console
$ kubectl get pods
shop-8c4d-x2k   0/1   Running   0   4m
$ kubectl describe pod shop-8c4d-x2k | grep -i -A2 readiness
Readiness probe failed: Get "http://10.2.1.14:8080/healthz": connect: connection refused
$ kubectl get cm shop-config -o yaml | grep PORT
PORT: "9090"
```

A config change moved the application to port 9090, but the readiness probe still checked 8080. No Pod became Ready, so the Service had no endpoints. The fix was to align the probe and the config, and the team added a rollout check that fails if the new ReplicaSet does not become Ready.

## Common mistakes

- Reading `logs` instead of `logs --previous` after a crash
- Assuming Running means working
- Forgetting events disappear
- Editing Pods directly instead of the Deployment

```quiz
Q: A Pod is in CrashLoopBackOff. Which command shows why the last container died?
- kubectl get nodes :: It lists nodes, not container output.
+ kubectl logs POD --previous
- kubectl top nodes :: It shows node usage only.
- kubectl cordon :: It marks a node unschedulable.
> --previous prints the output of the terminated container, together with describe for the exit code.

Q: kubectl get endpoints shows <none> for a Service. What is the usual cause?
- DNS is slow :: Name resolution does not create endpoints.
+ The selector matches no Ready Pods
- The cluster has no nodes :: Pods would be Pending, a different symptom.
- The image is too big :: Size has no effect on endpoints.
> Endpoints list Ready Pods that match the selector, so check labels and readiness.

Q: A Pod is Pending with "Insufficient memory". What does the scheduler compare?
- Actual memory use :: It uses requests, not live usage.
+ The Pod's memory request against free allocatable memory on nodes
- The image size :: Image size is irrelevant to scheduling.
- The Service type :: Services do not affect scheduling.
> Requests are the scheduling input.

Q: How do you inspect a Pod whose image has no shell?
- Rebuild production with a shell :: That changes what you are debugging.
+ Attach an ephemeral container with kubectl debug
- Restart the node :: It does not give access.
- Delete the Pod :: That destroys the evidence.
> Ephemeral containers share the Pod's namespaces and bring their own tools.
```

```cards
CrashLoopBackOff, first command? :: kubectl logs POD --previous and describe
What does empty endpoints mean? :: Selector matches no Ready Pod
How to debug a Pod without a shell? :: kubectl debug with an ephemeral container
What do scheduling decisions use? :: Resource requests
Why check events early? :: They expire after about an hour
```
