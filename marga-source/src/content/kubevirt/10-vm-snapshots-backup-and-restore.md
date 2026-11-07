---
title: VM snapshots, backup and restore
minutes: 13
summary: Take consistent VM snapshots with CSI, restore and clone them, export disks, and combine snapshots with Velero for real backups.
---

Backing up a VM is not the same as backing up a container. The disk holds a running operating system with open files, so how you take the copy matters as much as where you store it.

## What you will learn

- Snapshots with the guest agent
- Restore and clone
- Backups that leave the cluster
- Testing a restore

## Snapshots

```yaml
apiVersion: snapshot.kubevirt.io/v1beta1
kind: VirtualMachineSnapshot
metadata:
  name: web01-before-upgrade
spec:
  source:
    apiGroup: kubevirt.io
    kind: VirtualMachine
    name: web01
```

KubeVirt creates a CSI VolumeSnapshot for each disk. With `qemu-guest-agent` running, it asks the guest to freeze its file systems briefly, so the snapshot is consistent. Without the agent, the snapshot is only crash consistent, like pulling the power. Applications such as databases need pre and post hooks for a clean state.

## Restore

A `VirtualMachineRestore` object points a VM at a snapshot. The VM must be stopped, and its disks are replaced from the snapshot. To keep the original, create a new VM from the snapshot instead. The snapshot also records the VM definition, so the configuration returns with the data.

```diagram
title: Snapshot versus backup
node: vm | Running VM | 0 | 1 | A guest with open files and memory state. | Copying the disk while it runs gives a torn copy. | service
node: agent | Guest agent freeze | 1 | 0 | Pauses writes for a moment. | Without it the snapshot is crash consistent. | process
node: snap | CSI snapshot | 2 | 0 | A fast point in time copy on the same storage. | A storage failure removes disk and snapshot together. | store
node: back | Backup on object storage | 2 | 2 | A copy in another place, made by Velero or an export. | An untested backup is only a hope. | store
node: rest | Restore | 3 | 1 | Returns the VM from a snapshot or backup. | Restoring over a running VM can overwrite newer data. | process
edge: vm | agent
edge: agent | snap
edge: snap | back
edge: snap | rest
edge: back | rest
```

## Backups that leave the cluster

Velero with the KubeVirt plugin backs up VM objects and, with a CSI data mover, copies volume snapshot data to object storage. `VirtualMachineExport` serves a disk over HTTP for ad hoc copies. Schedule backups, set retention, and keep at least one copy in another failure domain.

## Test restores

Schedule a restore into a test namespace each month and boot the VM. Check application data, not only that the VM starts.

## Incident: The backup on the same pool

> **Incident:** A storage pool failed and both the disks and snapshots were lost.

```console
$ kubectl get volumesnapshotcontent -o custom-columns=NAME:.metadata.name,POOL:.status.snapshotHandle
NAME             POOL
snapcontent-1   ceph-pool-a/csi-snap-77
$ ceph health
HEALTH_ERR 1 pool inconsistent
```

Every snapshot lived in the same Ceph pool as the disks it protected. The team added Velero backups to object storage in another site and a monthly restore test.

## Common mistakes

- Treating snapshots as backups
- Taking snapshots without the guest agent for databases
- Never testing a restore
- Restoring over a running VM without a plan

```quiz
Q: What makes a VM snapshot file system consistent?
+ The guest agent freeze
- A bigger disk :: No.
- Multus :: No.
- A label :: No.
> The agent pauses writes briefly.

Q: Why is a snapshot not a backup?
+ It usually lives on the same storage
- It is too slow :: No.
- It has no data :: No.
- It needs Multus :: No.
> A storage failure removes both.

Q: What is VirtualMachineRestore used for?
+ Returning a VM to a snapshot
- Creating a node :: No.
- Changing DNS :: No.
- Scaling pods :: No.
> It applies a snapshot to a stopped VM.

Q: What should you do with backups regularly?
+ Test a restore
- Delete them :: No.
- Rename them :: No.
- Encrypt the cluster :: No.
> Only a restore proves a backup.
```

```cards
VirtualMachineSnapshot :: A resource that captures VM disks and definition
Crash consistent :: A copy like a power cut: files are present but may be mid write
Velero :: A tool that backs up Kubernetes objects and volumes
VirtualMachineExport :: A way to serve VM disks for download
Restore test :: Booting a restored VM to prove the backup works
```
