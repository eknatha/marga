---
title: Kubernetes
summary: kubectl essentials, manifests, troubleshooting order, RBAC and exam-speed tricks.
module: kubernetes
---

## Setup for speed

```bash
alias k=kubectl
source <(kubectl completion bash)
export do="--dry-run=client -o yaml"
k config get-contexts
k config use-context CONTEXT
k config set-context --current --namespace=shop
```

Always confirm the context with `k config current-context` before changing anything.

## Read cluster state

```bash
k get nodes -o wide
k get pods -A
k get pods -n shop -o wide --show-labels
k get deploy,svc,ingress,pvc -n shop
k get events -n shop --sort-by=.lastTimestamp
k describe pod NAME -n shop
k explain pod.spec.containers.resources
k api-resources
k top pod -n shop
```

## Create and change

```bash
k create deployment api --image=nginx:1.27 --replicas=3 $do > deploy.yaml
k run tmp --rm -it --image=busybox:1.36 --restart=Never -- sh
k expose deployment api --port=80 --target-port=8080
k scale deployment api --replicas=5
k set image deployment/api nginx=nginx:1.27.1
k apply -f deploy.yaml
k delete -f deploy.yaml
k label pod NAME tier=backend
k annotate pod NAME note=checked
k edit deployment api
```

## Rollouts

```bash
k rollout status deployment/api
k rollout history deployment/api
k rollout undo deployment/api
k rollout undo deployment/api --to-revision=2
k rollout restart deployment/api
```

## Debugging order

```bash
k get pods -n shop                       # status and restarts
k describe pod NAME -n shop              # events at the bottom
k logs NAME -n shop --previous           # logs of the crashed container
k logs NAME -c CONTAINER -n shop         # a specific container
k exec -it NAME -n shop -- sh
k get endpoints SERVICE -n shop          # empty means selector or readiness problem
k debug NAME -it --image=busybox:1.36    # ephemeral debug container
```

| Status | Likely cause |
|--------|--------------|
| `Pending` | No node fits, or an unbound PVC |
| `ImagePullBackOff` | Wrong image or missing registry credentials |
| `CrashLoopBackOff` | Application error; read `--previous` logs |
| `CreateContainerConfigError` | Missing ConfigMap, Secret or key |
| `OOMKilled` | Memory limit exceeded |
| Running, `0/1` ready | Readiness probe failing |

## Pod template essentials

```yaml
resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits: { memory: 256Mi }
readinessProbe:
  httpGet: { path: /healthz/ready, port: 8080 }
livenessProbe:
  httpGet: { path: /healthz/live, port: 8080 }
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities: { drop: ["ALL"] }
```

## Services

| Type | Reachable from |
|------|----------------|
| `ClusterIP` | Inside the cluster |
| `NodePort` | Node IP on a high port |
| `LoadBalancer` | Cloud load balancer address |
| `ExternalName` | DNS alias for an external name |

Service DNS name: `SERVICE.NAMESPACE.svc.cluster.local`.

## RBAC

```bash
k create role reader --verb=get,list,watch --resource=pods -n shop
k create rolebinding rb --role=reader --serviceaccount=shop:app -n shop
k auth can-i list pods -n shop --as=system:serviceaccount:shop:app
k auth can-i --list -n shop
```

## Nodes and maintenance

```bash
k cordon NODE                                     # stop new scheduling
k drain NODE --ignore-daemonsets --delete-emptydir-data
k uncordon NODE
k taint nodes NODE dedicated=gpu:NoSchedule
k label node NODE disktype=ssd
```

## Storage

| Item | Note |
|------|------|
| PVC `ReadWriteOnce` | One node at a time |
| PVC `ReadWriteMany` | Needs a file-capable storage class |
| Reclaim `Delete` | Claim deletion deletes the disk |
| StatefulSet | Stable names and a volume per Pod |

## JSONPath and output

```bash
k get pods -o jsonpath='{.items[*].metadata.name}'
k get pod NAME -o jsonpath='{.status.containerStatuses[0].lastState}'
k get secret NAME -o jsonpath='{.data.password}' | base64 -d
k get pods -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName
```
