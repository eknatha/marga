---
title: Persistent storage and CSI operations
minutes: 13
summary: Operate persistent volumes with storage classes and CSI drivers, handle expansion, snapshots and stuck volumes, and keep stateful workloads safe.
---

Kubernetes separates what an app asks for, a claim, from what the platform provides, a volume. The Container Storage Interface connects that model to real storage systems, and most operational problems come from the seams between them.

## What you will learn

- StorageClass, PVC, PV and the CSI driver
- Expanding volumes and reclaim policies
- Snapshots and restore
- Debugging attach, mount and stuck volume problems

## The objects

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: csi.example.com
allowVolumeExpansion: true
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: ssd
```

`WaitForFirstConsumer` delays creating the volume until a pod is scheduled, so it is created in the right zone. `reclaimPolicy: Retain` keeps the data when a claim is deleted, which is safer for important data than `Delete`.

## Expand and snapshot

```bash
kubectl patch pvc data-db-0 -n shop -p '{"spec":{"resources":{"requests":{"storage":"200Gi"}}}}'
kubectl get pvc data-db-0 -n shop -w
```

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: db-before-upgrade
  namespace: shop
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: data-db-0
```

Volumes can usually only grow. Snapshots are not backups on their own if they live in the same storage system, so copy important data elsewhere too.

## Debugging

```bash
kubectl describe pod db-0 -n shop | tail -20
kubectl get volumeattachment | grep db
kubectl logs -n kube-system ds/csi-node -c driver | tail
```

Typical errors are `FailedAttachVolume` (the volume is still attached to another node), `FailedMount` (a node or driver problem) and a PVC stuck in `Pending` (no matching class or no capacity). Read pod events first, then VolumeAttachment objects, then the driver logs. Never delete a VolumeAttachment or force detach without making sure the old node no longer writes to the disk.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Persistent storage and CSI operations fits together
node: n1 | The objects | 0 | 0 | WaitForFirstConsumer delays creating the volume until a pod is scheduled, so it is created in the right zone. | Reclaim policy Delete for critical data. | process
node: n2 | Expand and snapshot | 1 | 1 | Volumes can usually only grow. Snapshots are not backups on their own if they live in the same storage system, so copy important data elsewhere too. | Snapshots as the only backup. | process
node: n3 | Debugging | 2 | 0 | Typical errors are FailedAttachVolume (the volume is still attached to another node), FailedMount (a node or driver problem) and a PVC stuck in Pending (no matching... | Forcing detach without fencing the node. | observe
edge: n1 | n2
edge: n2 | n3
```

## Incident: Multi-attach error

> **Incident:** A pod could not start because the volume still belonged to a failed node.

```console
Warning FailedAttachVolume: Multi-Attach error for volume "pvc-5c1f"
Volume is already exclusively attached to one node
node worker-7 is NotReady
```

The old node stopped reporting but could still be writing. The team waited for the detach timeout and confirmed the node was powered off before forcing detachment. They later added fencing and documented the procedure.

## Common mistakes

- Reclaim policy Delete for critical data
- Snapshots as the only backup
- Forcing detach without fencing the node
- Expanding volumes without checking filesystem support

```quiz
Q: What does WaitForFirstConsumer do?
+ Creates the volume where the pod is scheduled
- Deletes volumes :: No.
- Disables CSI :: No.
- Copies data :: No.
> It respects zones. The lesson section above explains why.

Q: What does Retain keep?
+ The volume data after the claim is deleted
- The pod :: No.
- The node :: No.
- The class :: No.
> Safer for important data.

Q: What does FailedAttachVolume often mean?
+ It is still attached elsewhere
- DNS failed :: No.
- Image missing :: No.
- CPU full :: No.
> Check VolumeAttachment.

Q: Why add backups beyond snapshots?
+ Snapshots may share the same failure domain
- Snapshots are slow :: No.
- They cost nothing :: No.
- They are illegal :: No.
> Copy data elsewhere.
```

```cards
StorageClass :: Defines how volumes are provisioned
PVC :: A request for storage
CSI :: Container Storage Interface
VolumeAttachment :: Object recording a volume attached to a node
```
