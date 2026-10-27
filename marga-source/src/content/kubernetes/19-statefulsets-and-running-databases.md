---
title: StatefulSets and stateful workloads
minutes: 14
summary: Run workloads that need stable names and their own storage, and decide honestly when not to run a database on Kubernetes.
---

A Deployment treats pods as interchangeable. A database node is not interchangeable: it has its own data, a name the others know it by, and a role (primary or replica). StatefulSets give pods a stable identity and storage, but they do not make a database safe by themselves. This lesson covers what they provide and what you still have to do.

## What you will learn

- What a StatefulSet guarantees: names, order and storage
- Headless services and stable DNS names
- Volume claim templates and what happens when a pod moves
- When to use an operator or a managed database instead

## Stable identity

A StatefulSet creates pods named `name-0`, `name-1`, `name-2`. If `db-1` is deleted, the replacement is again called `db-1` and gets the same storage. By default pods start in order (0 first) and stop in reverse order, which suits clusters where the first node bootstraps the others.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: db }
spec:
  serviceName: db-headless
  replicas: 3
  selector: { matchLabels: { app: db } }
  template:
    metadata: { labels: { app: db } }
    spec:
      containers:
        - name: db
          image: postgres:16
          volumeMounts: [{ name: data, mountPath: /var/lib/postgresql/data }]
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast
        resources: { requests: { storage: 100Gi } }
```

## Headless service and DNS

A **headless service** (`clusterIP: None`) does not load balance. Instead, DNS returns a record per pod: `db-0.db-headless.shop.svc.cluster.local`. Peers and clients can therefore reach one specific member, for example the primary at `db-0`. Use a normal service in front for clients that need any healthy node.

## Storage and what happens on failure

Each pod gets its own PersistentVolumeClaim from the `volumeClaimTemplates`. If the pod is deleted or rescheduled, the new pod attaches the same claim. Note two things:

- Deleting a StatefulSet does **not** delete the claims, so data survives, and you must remove them deliberately. Newer versions allow a retention policy for this.
- A volume is tied to a zone in most clouds. If the zone fails, the pod cannot start elsewhere without that data, so replication across zones is the database's job, not Kubernetes'.

A PodDisruptionBudget stops a node drain from taking down too many members at once, for example `maxUnavailable: 1`.

## Be honest about databases

StatefulSets give identity and storage. They do not give you backups, failover, upgrades, tuning or point-in-time recovery. For databases you have three choices:

1. A **managed service** from your cloud: least work, usually the right default for important data.
2. A Kubernetes **operator** for that database, which encodes failover, backups and upgrades as automation. Use a well-maintained one, and test restores.
3. A hand-written StatefulSet: only for learning or simple, replaceable data such as a cache.

Whichever you choose, rehearse: kill the primary, restore from backup into a fresh cluster, and measure how long it takes.

```predict
Q: You delete a StatefulSet to recreate it with a new setting. What happens to its data volumes by default?
???
The PersistentVolumeClaims remain, so data is kept, and the recreated pods reattach to them.
> Claims are not deleted with the StatefulSet unless you configure a retention policy.
```

## Incident: The replica that came back empty

> **Incident:** After a node failure, a database replica restarted and began a full resync that took six hours and slowed the primary.

```console
$ kubectl get pvc -l app=db
NAME        STATUS   VOLUME     CAPACITY
data-db-0   Bound    pvc-a1     100Gi
data-db-1   Pending  <none>     100Gi
```

The volume for `db-1` lived in a zone that was down, and the claim could not be bound elsewhere, so the replacement pod started with a new empty volume created by the storage class. The team switched to an operator with zone-aware replicas, added a PodDisruptionBudget, and scheduled a monthly restore drill. They also moved the main production database to a managed service, and kept the StatefulSet for a rebuildable analytics store.

## Common mistakes

- Treating a StatefulSet as a complete database solution
- Forgetting backups and restore tests
- Assuming storage can follow a pod to another zone
- Deleting claims by accident while cleaning up

```quiz
Q: What does a StatefulSet give each pod?
+ A stable name and its own persistent volume
- A public IP :: Pods do not get one by default.
- Automatic backups :: It does not back up data.
- Faster storage :: Speed depends on the storage class.
> Identity and storage, nothing more.

Q: What is a headless service used for?
+ DNS records for individual pods, not load balancing
- Encrypting traffic :: It does not encrypt.
- Hiding the cluster :: It does not hide anything.
- Running without pods :: It still selects pods.
> It lets peers address db-0 directly.

Q: What happens to PVCs when a StatefulSet is deleted by default?
+ They stay until you delete them
- They are deleted at once :: That would lose data.
- They are moved to another namespace :: They are not moved.
- They are encrypted :: Encryption is separate.
> Data survives, which is safer.

Q: Which option usually needs the least operational work for an important database?
+ A managed database service
- A hand-written StatefulSet :: You build every feature yourself.
- A single pod with emptyDir :: Data is lost with the pod.
- A Deployment with one replica :: It has no stable identity or per-pod storage.
> Buy operations where it makes sense.
```

```cards
Stable pod names :: name-0, name-1, name-2
Per-pod storage :: volumeClaimTemplates
Headless service :: clusterIP: None
Limit simultaneous disruption :: PodDisruptionBudget
Test regularly :: restore from backup
```
