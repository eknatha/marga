---
title: Storage for VMs: access modes, block mode and snapshots
minutes: 13
summary: Choose StorageClasses, access modes and volume modes for VM disks, and understand why live migration needs shared ReadWriteMany storage.
---

Compute is the easy part of running VMs on Kubernetes. Storage decides what you can actually do with them: migrate, snapshot, clone and survive a node failure.

## What you will learn

- Access modes and why migration needs ReadWriteMany
- Block mode versus filesystem mode
- What to ask of a CSI driver
- Reading the LiveMigratable condition

## Access modes

| Mode | Meaning for a VM |
|------|------------------|
| `ReadWriteOnce` | One node at a time: a running VM cannot move without stopping |
| `ReadWriteMany` | Several nodes at once: required for live migration with shared storage |
| `ReadWriteOncePod` | One pod: not suitable for migration |

During live migration the source and target virt-launcher pods both attach the disk, so the storage must allow it. Ceph RBD in block mode, many SAN CSI drivers and some NFS setups do. Plain local disks do not.

## Volume mode

`volumeMode: Block` hands the raw device to QEMU, which avoids a second file system layer and usually gives better latency. `Filesystem` mode stores a disk image file in a mounted volume; it is simpler but slower and does not support RWX on most block backends. For production VMs prefer Block with an RWX capable driver.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db1-data
spec:
  accessModes: [ReadWriteMany]
  volumeMode: Block
  storageClassName: ceph-rbd
  resources:
    requests:
      storage: 100Gi
```

```diagram
title: Why migration needs a shared disk
node: src | Source node | 0 | 1 | Runs the VM and has the disk attached. | A failing node ends the VM if the disk cannot attach elsewhere. | service
node: tgt | Target node | 2 | 1 | Starts a second launcher and attaches the same disk. | With RWO the second attach is refused. | service
node: disk | Shared RWX disk | 1 | 0 | One block device reachable from both nodes. | A slow storage network slows every VM. | store
node: csi | CSI driver | 1 | 2 | Provides snapshots, clones and expansion. | A driver without snapshots blocks VM backup. | store
edge: src | disk
edge: tgt | disk
edge: disk | csi
```

## What to ask of the driver

Does it support RWX Block, snapshots, cloning and online expansion? Is there a fast clone path for golden images? Can it be monitored and what is the failure mode when a node loses the storage network?

## The LiveMigratable condition

KubeVirt marks each VMI with a `LiveMigratable` condition. If it is False the message says why, for example "cannot migrate VMI which does not use a shared ReadWriteMany PVC". Check it before a maintenance window, not during.

## Incident: The drain that stopped every VM

> **Incident:** Draining a node for maintenance shut down all its VMs.

```console
$ kubectl get vmi db1 -o jsonpath='{.status.conditions[?(@.type=="LiveMigratable")].message}'
cannot migrate VMI which does not use a shared ReadWriteMany PVC
$ kubectl get pvc db1-data -o jsonpath='{.spec.accessModes}'
["ReadWriteOnce"]
```

The disks were created on a ReadWriteOnce class, so KubeVirt could not migrate them during the drain. The team moved the disks to an RWX block class and rehearsed a drain before the next window.

## Common mistakes

- Choosing ReadWriteOnce and expecting live migration
- Using filesystem mode for latency sensitive databases
- Not testing a drain before maintenance
- Picking a CSI driver without snapshot support

```quiz
Q: Which access mode lets a VM live-migrate with shared storage?
+ ReadWriteMany
- ReadWriteOnce :: No.
- ReadOnlyOnce :: No.
- None :: No.
> Both nodes must attach the disk.

Q: What does Block volume mode give QEMU?
+ The raw device
- A mounted directory :: No.
- An NFS share :: No.
- A container image :: No.
> It avoids a file system layer.

Q: Where do you see why a VM cannot migrate?
+ The LiveMigratable condition
- The node name :: No.
- The service type :: No.
- The ingress :: No.
> The condition message names the reason.

Q: What must a CSI driver support to snapshot VMs?
+ VolumeSnapshots
- Only NFS :: No.
- Only local disks :: No.
- Nothing :: No.
> Snapshots rely on the CSI feature.
```

```cards
RWX :: ReadWriteMany, a volume that several nodes can mount at once
Block mode :: A volume handed to a pod as a raw device
CSI :: Container Storage Interface, the plugin API for storage drivers
LiveMigratable :: A VMI condition that says whether live migration is possible
Storage class :: A named set of storage settings for creating volumes
```
