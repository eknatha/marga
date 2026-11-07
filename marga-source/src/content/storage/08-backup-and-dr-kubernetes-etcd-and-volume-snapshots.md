---
title: Backup and DR: Kubernetes, etcd and volume snapshots
minutes: 12
summary: Protect a Kubernetes cluster by backing up etcd, declarative manifests and persistent volumes, and know what each backup can and cannot restore.
---

A cluster is made of several things that fail differently: the control plane state in etcd, the manifests that describe your applications, the data in persistent volumes and the cloud resources around it. A good plan covers each of these and makes rebuilding the cluster from code a normal operation.

## What you will learn

- What to protect in a cluster and in which layer
- Backing up and restoring etcd
- Volume snapshots with the CSI snapshot API
- Application-level backups and cluster rebuild strategy

## Layers of a cluster

1. **Declarative config**: manifests, Helm values and Terraform in version control. This is the main source for rebuilding workloads, and it is why you do not rely on etcd for application recovery in most cases.
2. **Cluster state in etcd**: needed for self-managed control planes. Managed services (EKS, AKS, GKE) run it for you, so check what the provider backs up and what you must keep yourself.
3. **Persistent data**: volumes and external databases. This is the part that cannot be recreated from code.
4. **Secrets and keys**: encryption keys, certificates and external secret stores. Back these up in a safe way that works if the cluster is gone.

## etcd snapshots

```console
$ ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-2026-03-04.db --endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key
$ ETCDCTL_API=3 etcdctl snapshot status /backup/etcd-2026-03-04.db --write-out=table
```

Take snapshots on a schedule (for example every 30 minutes), copy them off the node, encrypt them (they contain Secrets), and test restoring on a throwaway cluster. Restoring etcd on a multi-node control plane needs a documented procedure: stop the API servers, restore the same snapshot on every member with a new data directory and cluster settings, then restart. Practice it before you need it.

## Volume snapshots

The CSI snapshot API takes storage-level snapshots of PersistentVolumeClaims, if the driver supports it.

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: orders-db-2026-03-04
  namespace: shop
spec:
  volumeSnapshotClassName: csi-snapclass
  source:
    persistentVolumeClaimName: orders-db-data
```

To restore, create a new PVC with `dataSource` pointing at the snapshot. A storage snapshot is **crash-consistent**: it looks like the machine lost power, which databases can usually recover from but may take time. For **application-consistent** backups, flush or quiesce first, or use the database's own backup tool and store the result off the cluster. Snapshots usually live in the same storage system, so copy important ones to another region or account.

## Tools and rebuild strategy

Tools such as Velero back up namespaced resources and volumes to object storage and can restore to another cluster, which also helps migrations. A mature approach is: rebuild the cluster from infrastructure code, let your normal delivery pipeline reapply manifests from version control, then restore data volumes and databases from backups. Rehearse this end to end and measure the time.

```predict
Q: Your cluster is destroyed. Manifests are in version control and the data is in a managed database with backups. What is the fastest safe recovery path?
???
Recreate the cluster from infrastructure code, redeploy manifests from version control, and restore the database from its backup. An etcd snapshot is not necessary for stateless workloads.
> Rebuild from code, restore the data.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Backup and DR: Kubernetes, etcd and volume... fits together
node: n1 | Layers of a cluster | 0 | 0 | Declarative config: manifests, Helm values and Terraform in version control. | Backing up etcd but never testing a restore. | process
node: n2 | etcd snapshots | 1 | 1 | Take snapshots on a schedule (for example every 30 minutes), copy them off the node, encrypt them (they contain Secrets), and test restoring on a throwaway cluster. | Storing etcd snapshots unencrypted on the node. | process
node: n3 | Volume snapshots | 2 | 0 | The CSI snapshot API takes storage-level snapshots of PersistentVolumeClaims, if the driver supports it. | Assuming a volume snapshot is application-consistent. | store
node: n4 | Tools and rebuild strategy | 3 | 1 | Tools such as Velero back up namespaced resources and volumes to object storage and can restore to another cluster, which also helps migrations. | Keeping snapshots only in the same storage system. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The snapshot that restored a broken database

> **Incident:** A team restored a volume snapshot of their database after a failed upgrade, and the database then needed hours of crash recovery and lost recent transactions.

```console
$ kubectl get volumesnapshot -n shop
NAME                    READYTOUSE  SOURCEPVC       CREATIONTIME
orders-db-2026-03-04    true        orders-db-data  3h12m
$ kubectl logs orders-db-0 | tail -3
database system was interrupted; last known up at 2026-03-04 09:47:12
redo starts at 0/5A0D2F8
```

The snapshot was taken while the database was writing, so it was crash-consistent and recovery had to replay a long log. The team had never practiced it and had no logical or WAL-based backup as a second path. Afterward they used the database's native backups with log archiving for data, kept snapshots as a fast first option, and added a pre-snapshot hook and a restore drill each quarter.

## Common mistakes

- Backing up etcd but never testing a restore
- Storing etcd snapshots unencrypted on the node
- Assuming a volume snapshot is application-consistent
- Keeping snapshots only in the same storage system

```quiz
Q: What is the main source to rebuild stateless workloads?
+ Declarative manifests in version control
- Only an etcd snapshot :: Possible but not primary.
- Developer laptops :: Not reliable.
- Chat history :: Not a source of truth.
> Start from the code in version control.

Q: Why encrypt etcd backups?
+ They contain Secrets and cluster state
- To make them smaller :: Not the reason.
- To avoid restoring :: Opposite.
- Because etcd is slow :: Unrelated.
> Treat them as sensitive.

Q: What does crash-consistent mean?
+ The volume looks like the machine lost power at that moment
- All applications flushed their data :: That is application-consistent.
- It is encrypted :: Different property.
- It is in another region :: Different property.
> Databases must recover from it.

Q: How do you restore from a CSI VolumeSnapshot?
+ Create a new PVC whose dataSource points to the snapshot
- Edit the snapshot object :: It is a record, not a disk.
- Restart the node :: Does not restore.
- Delete the namespace :: Destroys data.
> Snapshots become volumes through a PVC.
```

```cards
Layers :: config, etcd, persistent data, secrets and keys
etcdctl snapshot save :: consistent copy of cluster state
VolumeSnapshot :: storage-level point-in-time copy of a PVC
Crash-consistent :: like a power cut, recoverable but not clean
Rebuild path :: infrastructure code, manifests, then data restore
```
