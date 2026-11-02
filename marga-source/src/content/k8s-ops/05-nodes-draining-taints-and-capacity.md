---
title: Nodes: draining, taints and capacity
minutes: 12
summary: Maintain nodes without downtime, control placement with taints and affinity, and plan capacity.
---

Nodes need patching, replacing and resizing. Doing this without dropping traffic depends on understanding how Kubernetes evicts pods, respects disruption budgets and places workloads. It also helps to keep special nodes (GPUs, large memory, spot capacity) for the workloads that need them.

## What you will learn

- Cordon, drain and uncordon
- Use PodDisruptionBudgets
- Control placement with taints, tolerations and affinity
- Read node capacity and allocatable resources

## Cordon and drain

`kubectl cordon node-1` marks the node unschedulable but leaves pods running. `kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data` evicts pods so they are recreated elsewhere, respecting their disruption budgets. After maintenance, `kubectl uncordon node-1` makes it schedulable again. Pods that are not managed by a controller are not recreated, so drain warns about them.

## PodDisruptionBudgets

A **PodDisruptionBudget** says how many replicas of an application must remain available (`minAvailable: 2`) or may be unavailable (`maxUnavailable: 1`) during voluntary disruptions like drains. A drain waits instead of violating the budget. A budget that requires all replicas makes drains hang forever, and with a single replica a strict budget blocks maintenance.

## Taints and tolerations

A **taint** on a node repels pods unless they have a matching **toleration**. For example, `kubectl taint nodes gpu-1 gpu=true:NoSchedule` keeps ordinary pods away from GPU nodes; GPU workloads tolerate the taint. Effects are NoSchedule, PreferNoSchedule and NoExecute (which also evicts running pods). Kubernetes itself adds taints such as `node.kubernetes.io/not-ready`.

## Affinity and spread

Node affinity attracts pods to labelled nodes. Pod anti-affinity and topology spread constraints spread replicas across nodes and zones so one failure does not remove them all. Taints keep others out; affinity pulls pods in; use both for dedicated pools.

## Capacity

`kubectl describe node` shows **capacity**, **allocatable** (what pods can use after system reservations) and what is already requested. Scheduling uses requests, not usage. Leave headroom for draining a node: if the cluster cannot absorb the pods of one node, maintenance will leave pods Pending.

```predict
Q: A drain hangs on a Deployment with 2 replicas and a PodDisruptionBudget of minAvailable 2. Why?
???
The budget requires both replicas, so no pod may be evicted. Lower the budget or add a replica.
> Budgets can block drains.
```

## Incident: The drain that never finished

> **Incident:** Node maintenance stalled for an hour with the message "Cannot evict pod as it would violate the pod's disruption budget".

```console
$ kubectl drain node-3 --ignore-daemonsets
error when evicting pods/"api-7f6c" -n shop: Cannot evict pod as it would violate the pod's disruption budget.
$ kubectl get pdb -n shop
NAME  MIN AVAILABLE  ALLOWED DISRUPTIONS
api   3              0
```

The deployment had 3 replicas and required 3. The team scaled it to 4, changed the budget to minAvailable 2, and the drain continued. They added a review check for budgets that allow zero disruptions.

## Common mistakes

- PDBs that allow zero disruptions
- Draining without enough spare capacity
- Forgetting daemonsets and local data flags
- Using taints without tolerations

```quiz
Q: What does cordon do?
+ Stops new pods from scheduling to the node
- Deletes pods :: No.
- Reboots the node :: No.
- Encrypts it :: No.
> Existing pods stay. Re-read the matching lesson section for the full reasoning.

Q: What does a PDB protect?
+ Availability during voluntary disruptions
- Disk space :: No.
- Secrets :: No.
- DNS :: No.
> Drains respect it. Re-read the matching lesson section for the full reasoning.

Q: What is a taint?
+ A node mark that repels pods without a toleration
- A label for billing :: No.
- A secret :: No.
- A network rule :: No.
> Dedicated nodes. Re-read the matching lesson section for the full reasoning.

Q: What does the scheduler use to place pods?
+ Resource requests
- Actual CPU use :: No, requests.
- Pod names :: No.
- Colours :: No.
> Set requests. Re-read the matching lesson section for the full reasoning.
```

```cards
cordon :: unschedulable
drain :: evict safely
uncordon :: schedulable again
PDB :: availability budget
Taint/toleration :: dedicated nodes
Allocatable :: what pods can use
```
