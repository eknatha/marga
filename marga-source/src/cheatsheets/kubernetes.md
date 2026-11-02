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

## Context and namespaces

```bash
kubectl config get-contexts
kubectl config current-context
kubectl config use-context staging
kubectl config set-context --current --namespace=shop
kubectl get ns
kubectl api-resources --namespaced=true
kubectl explain deployment.spec.strategy
kubectl auth can-i delete pods -n shop
kubectl auth can-i --list -n shop
```

> **Warning:** Check `kubectl config current-context` before any change. Most production accidents are the right command on the wrong cluster. Consider a prompt that shows the context.

## Inspect and debug, more

```bash
kubectl get pods -A -o wide --field-selector status.phase!=Running
kubectl get events -n shop --sort-by=.lastTimestamp
kubectl describe pod api-0 -n shop
kubectl logs api-0 -c app --previous --tail=200
kubectl logs -l app=api --all-containers --since=15m
kubectl exec -it api-0 -c app -- sh
kubectl debug -it api-0 --image=busybox:1.36 --target=app
kubectl debug node/worker-1 -it --image=busybox:1.36
kubectl port-forward svc/api 8080:80 -n shop
kubectl cp shop/api-0:/tmp/dump.txt ./dump.txt
kubectl top pod -n shop --containers
kubectl top node
kubectl get pod api-0 -o yaml | less
```

> **Warning:** `kubectl exec` and `debug` give shell access to a running workload. Do not change files or install tools in a production container: the change is lost and may hide the real cause.

> **Warning:** `kubectl port-forward` exposes the service to your machine only, but anything you paste through it goes to production. Never point a test tool at it.

## Change safely

```bash
kubectl diff -f deploy.yaml
kubectl apply -f deploy.yaml --dry-run=server
kubectl apply -f deploy.yaml
kubectl rollout status deploy/api -n shop
kubectl rollout undo deploy/api -n shop
kubectl scale deploy/api --replicas=5 -n shop
kubectl set image deploy/api app=registry.example.com/api:1.5 -n shop
kubectl annotate deploy/api kubernetes.io/change-cause="bump to 1.5"
kubectl label pod api-0 debug=true
kubectl patch deploy api -p '{"spec":{"replicas":3}}'
```

> **Warning:** `kubectl edit` and `patch` change live objects that are not in your source files, so the next `apply` or pipeline run can undo them silently, or the cluster can drift. Prefer changing the manifest and applying it.

> **Warning:** `kubectl scale --replicas=0` stops the service. Do it only on purpose and say so in the incident channel.

## Nodes and maintenance, more

```bash
kubectl get nodes -o wide
kubectl describe node worker-1 | sed -n '/Taints/,/Conditions/p'
kubectl cordon worker-1
kubectl drain worker-1 --ignore-daemonsets --delete-emptydir-data --timeout=300s
kubectl uncordon worker-1
kubectl taint nodes worker-1 dedicated=gpu:NoSchedule
kubectl get pdb -A
```

> **Danger:** `kubectl drain` evicts pods. With `--delete-emptydir-data` the data in emptyDir volumes is lost, and a PodDisruptionBudget of 0 can block it forever. Drain one node at a time and watch the rollout.

> **Danger:** `kubectl delete node` removes the node object, not the machine. Drain first and confirm the cloud instance state.

## Secrets and config

```bash
kubectl create secret generic db --from-literal=password='change-me' -n shop --dry-run=client -o yaml
kubectl get secret db -n shop -o jsonpath='{.data.password}' | base64 -d
kubectl create configmap app-config --from-file=app.properties
kubectl get cm app-config -o yaml
kubectl rollout restart deploy/api -n shop
```

> **Warning:** Base64 is not encryption. Anyone who can read a Secret can read its value. Restrict access with RBAC, and do not paste decoded values into chat or tickets.

> **Warning:** Passwords on the command line end up in shell history. Prefer files or a secrets manager.

## Cautions for destructive commands

> **Danger:** `kubectl delete -f` and `kubectl delete ns shop` remove everything in the file or namespace, including volumes with `Delete` reclaim policy. Run `kubectl get all -n shop` and use `--dry-run=server` first.

> **Danger:** `kubectl delete pod --force --grace-period=0` skips graceful shutdown and can leave a StatefulSet pod running twice. Use it only for stuck terminating pods after you confirm the node is gone.

> **Danger:** `kubectl delete pvc` can delete the underlying disk. Check `kubectl get pv` for the reclaim policy first.

> **Danger:** Commands with `-A` or `--all` act on every namespace. Read the output of the matching `get` before you run `delete`.

> **Warning:** Do not bind `cluster-admin` to users or service accounts for convenience. Grant the smallest Role that works.
