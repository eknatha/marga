---
title: A cluster disaster recovery runbook
minutes: 13
summary: Plan for losing a cluster: what to back up, how to rebuild from code and how to restore state, with tests and clear recovery targets.
---

Most clusters are cattle if you built them from code, but their data is not. A good disaster plan treats the two separately, gives each a target time and tests both.

## What you will learn

- What lives where: code, config, secrets and data
- Rebuilding the platform from infrastructure code
- Restoring state from etcd and volume backups
- Rehearsing and timing the recovery

## Classify what you have

- **Infrastructure:** networks, nodes and control plane, defined in code.
- **Cluster configuration:** add-ons, policies and applications, defined in Git.
- **Secrets and certificates:** in a secret manager and a protected backup.
- **State:** databases and volumes, covered by backups and snapshots.

Define an **RPO** (how much data loss is acceptable) and an **RTO** (how long recovery may take) for each tier of service.

## Rebuild

```bash
terraform -chdir=infra/prod apply            # network, control plane, node pools
./bootstrap/install-delivery-agent.sh          # installs the delivery agent
kubectl apply -f bootstrap/root-app.yaml     # pulls platform add-ons and apps from Git
kubectl get nodes,pods -A | head -30
```

The order matters: infrastructure, cluster add-ons such as networking and storage drivers, secrets operator, then applications. Write the steps as an executable runbook.

## Restore state

```bash
# etcd restore is a last resort for a self-managed control plane
ETCDCTL_API=3 etcdctl snapshot restore snapshot.db --data-dir /var/lib/etcd-restore
# volumes: restore from snapshot or backup tool
velero restore create --from-backup nightly-2026-11-04 --include-namespaces shop
```

Managed control planes do not give you etcd, so rely on application manifests in Git and a backup tool for namespaces and volumes. Databases should have their own backups and point-in-time recovery.

## Rehearse

Run a game day in an empty account or region at least twice a year. Time each step, record surprises and fix the gaps. Keep the runbook and credentials available outside the cluster being recovered.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How A cluster disaster recovery runbook fits together
node: n1 | Classify what you have | 0 | 0 | Infrastructure: networks, nodes and control plane, defined in code. | Backups that were never restored. | process
node: n2 | Rebuild | 1 | 1 | The order matters: infrastructure, cluster add-ons such as networking and storage drivers, secrets operator, then applications. | No order of steps for the rebuild. | process
node: n3 | Restore state | 2 | 0 | Managed control planes do not give you etcd, so rely on application manifests in Git and a backup tool for namespaces and volumes. | Restore state Managed control planes do not give you etcd, so rely on application manifests in Git and a backup tool for namespaces and... | store
node: n4 | Rehearse | 3 | 1 | Run a game day in an empty account or region at least twice a year. | Runbooks stored only inside the failed cluster. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The database nobody had restored

> **Incident:** A cluster rebuilt quickly but databases took a day to recover.

```console
cluster rebuilt in 2h05m
restore database: backup chain incomplete
database online after 26h
```

The platform was fully automated and rehearsed, but the databases were only assumed to be backed up. A missing archive segment lengthened the recovery. The team added monthly restore tests per database and included them in the disaster drill.

## Common mistakes

- Backups that were never restored
- Runbooks stored only inside the failed cluster
- No order of steps for the rebuild
- Treating secrets as an afterthought

```quiz
Q: What are the two halves of cluster DR?
+ Rebuild from code and restore state
- Restart and wait :: No.
- Delete and recreate :: No.
- Scale and drain :: No.
> Both must be tested.

Q: What does RTO mean?
+ How long recovery may take
- How much data can be lost :: No.
- Disk speed :: No.
- Node count :: No.
> Recovery time objective.

Q: Where keep the runbook?
+ Outside the cluster it recovers
- Only on the failed cluster :: No.
- Nowhere :: No.
- In a pod :: No.
> You must reach it in a disaster.

Q: How find gaps?
+ Rehearse the recovery
- Read the runbook once :: No.
- Hope :: No.
- Skip tests :: No.
> Practice reveals surprises.
```

```cards
RPO :: Recovery point objective, acceptable data loss
RTO :: Recovery time objective
Game day :: Planned exercise of a failure and recovery
Bootstrap :: First steps that bring a platform up
```
