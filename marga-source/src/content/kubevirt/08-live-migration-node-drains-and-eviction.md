---
title: Live migration, node drains and eviction
minutes: 13
summary: Move running VMs between nodes with live migration, control it with migration policies, and keep node drains and upgrades from stopping VMs.
---

Live migration is the feature that makes maintenance painless. It also has the most ways to fail, so it pays to know how it works and how to read its failures.

## What you will learn

- How live migration works step by step
- Eviction strategy and node drains
- Migration policies and limits
- Why a migration fails or never finishes

## How it works

KubeVirt starts a second virt-launcher pod on the target node and attaches the same disks. QEMU copies the guest's memory pages to the target while the VM keeps running, re-copying pages that change. When the remaining difference is small, the VM is paused for a brief moment, the last state is sent, and the target takes over.

```diagram
title: A live migration
node: src | Source virt-launcher | 0 | 1 | Runs the VM and sends memory pages. | A busy VM can change memory faster than it is copied. | service
node: net | Migration network | 1 | 0 | Carries the memory copy between the nodes. | A slow or shared link stretches the migration. | edge
node: disk | Shared RWX disk | 1 | 2 | Both pods attach the same disk. | RWO storage makes migration impossible. | store
node: tgt | Target virt-launcher | 2 | 1 | Receives pages and takes over after a short pause. | Missing CPU features on the target abort the move. | service
node: ctrl | virt-controller | 1 | 1 | Creates the target pod and tracks progress. | Cluster limits queue extra migrations. | process
edge: src | net
edge: net | tgt
edge: src | disk
edge: tgt | disk
edge: ctrl | tgt
```

## Starting and draining

```bash
virtctl migrate web01
kubectl get vmim
kubectl drain node2 --ignore-daemonsets --delete-emptydir-data
```

Set `evictionStrategy: LiveMigrate` on the VM, or as a cluster default. A drain then creates migrations for VMs on the node instead of shutting them down. VMs that cannot migrate block the drain, which is safer than killing them.

## Migration policies

```yaml
apiVersion: migrations.kubevirt.io/v1alpha1
kind: MigrationPolicy
metadata:
  name: db-policy
spec:
  allowAutoConverge: true
  bandwidthPerMigration: 512Mi
  completionTimeoutPerGiB: 800
  selectors:
    virtualMachineInstanceSelector:
      workload: database
```

Auto-converge slows the guest's CPU so pages stop changing as fast. Post-copy switches early and fetches the rest on demand, which is faster but risky if the network fails. Cluster limits such as parallel migrations per node stop a drain from saturating the network.

## Why they fail

Storage not shared, CPU model differing between nodes, a passthrough device (GPU) attached, a node selector that matches only one node, a network too slow for the dirty rate, or a timeout shorter than the copy needs.

## Incident: The drain that would not finish

> **Incident:** A node drain hung for an hour with one VM left.

```console
$ kubectl get vmim -o wide
NAME           PHASE     VMI
kubevirt-m1    Running   db1
$ kubectl logs virt-launcher-db1 | tail -n 1
migration is not progressing, dirty rate is higher than transfer rate
```

The database dirtied memory faster than the 64 MiB per second bandwidth limit could copy. A policy with auto-converge and a higher limit let the migration complete in minutes.

## Common mistakes

- Draining nodes before checking LiveMigratable
- Leaving a low bandwidth limit on busy VMs
- Passing through a device and expecting migration
- Running the first migration test during an outage

```quiz
Q: What does evictionStrategy LiveMigrate do?
+ Migrates VMs when a node drains
- Deletes the VM :: No.
- Resizes memory :: No.
- Backs up disks :: No.
> Drains move VMs instead of stopping them.

Q: What can make a migration never finish?
+ Memory changing faster than it is copied
- A short name :: No.
- Too many labels :: No.
- A big image :: No.
> The dirty rate exceeds the transfer rate.

Q: What does auto-converge do?
+ Slows the guest so migration can finish
- Adds nodes :: No.
- Compresses disks :: No.
- Changes DNS :: No.
> It throttles guest CPU.

Q: What blocks migration of a VM with a GPU?
+ The passthrough device
- The VM name :: No.
- The namespace :: No.
- The label :: No.
> Passed-through devices cannot move.
```

```cards
Live migration :: Moving a running VM to another node with a short pause
VMIM :: VirtualMachineInstanceMigration, the object that starts a migration
MigrationPolicy :: Rules for bandwidth, timeouts and options
Auto-converge :: Throttling the guest CPU to let migration finish
Post-copy :: Switching early and fetching memory on demand
```
