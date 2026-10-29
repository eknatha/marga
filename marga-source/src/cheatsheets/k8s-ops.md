---
title: Kubernetes administration and operations
summary: etcd backup, upgrades, node maintenance, RBAC, quotas, policies and a cluster debugging checklist.
module: k8s-ops
---

## etcd snapshot

```bash
ETCDCTL_API=3 etcdctl snapshot save /backup/etcd.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key
etcdutl snapshot status /backup/etcd.db -w table
```

> **Warning:** Snapshots contain Secrets. Encrypt them, copy them off the node and test a restore on a schedule.

## Upgrade with kubeadm

```bash
kubeadm upgrade plan
kubeadm upgrade apply v1.NN.X
kubeadm upgrade node
kubeadm certs check-expiration
```

> **Warning:** Upgrade one minor version at a time, control plane first, and scan for removed APIs before you begin.

## Node maintenance

```bash
kubectl cordon node-1
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
kubectl uncordon node-1
kubectl taint nodes gpu-1 gpu=true:NoSchedule
```

> **Warning:** A PodDisruptionBudget that allows zero disruptions makes drain hang. Check budgets before maintenance.

## RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: shop
subjects:
  - kind: Group
    name: shop-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

> **Warning:** Do not bind cluster-admin to fix a permission error. Read the Forbidden message and grant the one verb on the one resource.

## Check permissions

```bash
kubectl auth can-i delete pods -n shop --as=jane
kubectl auth can-i --list -n shop --as=system:serviceaccount:shop:web
```

## Quotas and autoscaling

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

> **Warning:** The scheduler uses requests, not usage. Without realistic requests, autoscalers and quotas mislead you.

## Default deny network policy

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
```

> **Warning:** After default deny, allow DNS egress and the specific flows you need, and confirm your network plugin enforces policies.

## Debugging order

```bash
kubectl describe pod NAME
kubectl get nodes
kubectl describe node NODE
journalctl -u kubelet -n 100
kubectl get --raw=/readyz?verbose
```
