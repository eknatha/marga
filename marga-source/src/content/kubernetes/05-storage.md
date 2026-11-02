---
title: Storage and StatefulSets
minutes: 15
summary: Persist data with PersistentVolumeClaims and StorageClasses, and know when a StatefulSet is the right controller.
---

Containers are disposable, but a database is not. When a Pod running PostgreSQL is rescheduled to another node, its data must follow it. Kubernetes separates the *request* for storage from the *supply* of storage, so applications do not need to know where disks come from.

## What you will learn

- PersistentVolume, PersistentVolumeClaim and StorageClass
- Access modes and reclaim policies
- When to use a StatefulSet instead of a Deployment
- How to diagnose a Pod stuck waiting for a volume

## The three objects

| Object | Role |
|--------|------|
| **StorageClass** | Describes a kind of storage (fast SSD, cheap HDD) and how to provision it |
| **PersistentVolumeClaim (PVC)** | An application's request: "I need 10Gi of this class" |
| **PersistentVolume (PV)** | The actual disk. Usually created automatically when a claim appears |

With dynamic provisioning you only write the claim; the StorageClass creates the disk and the PV for you.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shop-uploads
  namespace: shop
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: standard
  resources:
    requests:
      storage: 10Gi
```

```yaml
# In the Pod template
      containers:
        - name: api
          volumeMounts:
            - name: uploads
              mountPath: /var/lib/shop/uploads
      volumes:
        - name: uploads
          persistentVolumeClaim:
            claimName: shop-uploads
```

## Access modes and reclaim policy

| Access mode | Meaning |
|-------------|---------|
| `ReadWriteOnce` (RWO) | Mounted read-write by one node at a time |
| `ReadOnlyMany` (ROX) | Mounted read-only by many nodes |
| `ReadWriteMany` (RWX) | Mounted read-write by many nodes; needs a storage system that supports it, such as NFS or a managed file service |
| `ReadWriteOncePod` | Mounted read-write by a single Pod |

The **reclaim policy** decides what happens to the disk when the claim is deleted. `Delete` removes the disk and its data; `Retain` keeps it for manual recovery. Production databases should use a class with `Retain`, or you should take snapshots, because deleting a claim is one command.

## StatefulSets

A Deployment treats Pods as interchangeable. A **StatefulSet** gives each Pod a stable identity (`db-0`, `db-1`, `db-2`), starts and stops them in order, and creates a separate PVC for each through `volumeClaimTemplates`. Use it for databases and clustered systems where each member has its own data and name. A **headless Service** (`clusterIP: None`) gives each Pod its own DNS entry such as `db-0.db.shop.svc.cluster.local`.

```console
$ kubectl get pvc -n shop
NAME            STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS
data-db-0       Bound    pvc-2f1c8d0e-...                           20Gi       RWO            standard
data-db-1       Bound    pvc-7a93b1c4-...                           20Gi       RWO            standard
$ kubectl get sc
```

If you only need a single database for a small service, a managed database service from your cloud provider is usually safer than operating one yourself on Kubernetes.

## Incident: the Pod is stuck Pending with an unbound claim

> **Incident:** A new Pod stays `Pending` for ten minutes after you added a volume.

```console
$ kubectl get pvc shop-uploads -n shop
NAME           STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS
shop-uploads   Pending                                      fast-ssd
$ kubectl describe pvc shop-uploads -n shop | tail -4
Events:
  Warning  ProvisioningFailed  persistentvolume-controller  storageclass.storage.k8s.io "fast-ssd" not found
$ kubectl get sc
NAME                 PROVISIONER             RECLAIMPOLICY
standard (default)   ebs.csi.aws.com         Delete
```

The claim names a StorageClass that does not exist, so nothing provisions a disk and the Pod cannot be scheduled. Correct `storageClassName` to a real class (here `standard`), delete the pending claim and apply it again, since most claim fields cannot be changed after creation. Other frequent causes: the requested access mode is not supported by the class, the zone has no capacity, or the volume exists in a different availability zone than the node the Pod landed on. Always read the events at the bottom of `kubectl describe`.

## Common mistakes

- Assuming a PVC is deleted with its Pod (it is not) or that data survives claim deletion (it may not)
- Using ReadWriteOnce volumes for a multi-replica Deployment on different nodes
- Running databases on `emptyDir`, which dies with the Pod
- Skipping backups because "the disk is persistent"

```quiz
Q: What is a PersistentVolumeClaim?
- A physical disk
+ A request for storage made by an application
- A backup of a volume
- A type of Pod
> The claim asks for storage; a PV (often created automatically) satisfies it.

Q: Which controller gives each Pod a stable name and its own volume?
- Deployment
- DaemonSet
+ StatefulSet
- ReplicaSet
> StatefulSets provide ordered, stable identities and volumeClaimTemplates.

Q: A PVC stays Pending with ProvisioningFailed: storageclass not found. What is the fix?
- Restart the node
+ Reference a StorageClass that exists
- Increase CPU requests
- Delete the namespace
> Without a valid StorageClass, dynamic provisioning cannot create a disk.

Q: What does the Delete reclaim policy do when the claim is removed?
- Keeps the disk forever
+ Deletes the underlying disk and its data
- Moves data to another claim
- Does nothing
> Delete removes the disk. Use Retain or snapshots for valuable data.
```

```cards
PV vs PVC? :: A PV is the actual storage; a PVC is the application's request for it
When to use a StatefulSet? :: When each Pod needs a stable name and its own persistent volume
What is ReadWriteOnce? :: Mountable read-write by a single node at a time
First place to look for a Pending Pod? :: The Events section of kubectl describe pod
```
