---
title: Custom resources, controllers and operators
minutes: 15
summary: Extend the Kubernetes API with CustomResourceDefinitions, understand the controller reconcile loop, and run production software with operators.
---

Kubernetes ships with Deployments, Services and Pods, but its API is extensible. Databases, certificate managers, service meshes and delivery tools all add their own resource kinds. Understanding this model explains how most of the cloud-native ecosystem works.

## What you will learn

- What a CustomResourceDefinition (CRD) is
- The reconcile loop that powers every controller
- How operators automate running complex software
- Inspecting and troubleshooting custom resources

## CustomResourceDefinitions

A **CRD** registers a new resource type with the API server. After that, you can create, list, watch and delete objects of that type with `kubectl`, and they get RBAC, validation and storage like built-in kinds.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.ops.example.com
spec:
  group: ops.example.com
  scope: Namespaced
  names:
    plural: backups
    singular: backup
    kind: Backup
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              required: ["schedule", "target"]
              properties:
                schedule:
                  type: string
                target:
                  type: string
                retentionDays:
                  type: integer
                  minimum: 1
```

The schema gives validation: a Backup without a `schedule` is rejected at creation. A custom resource is only data until something acts on it.

```yaml
apiVersion: ops.example.com/v1
kind: Backup
metadata:
  name: orders-db
  namespace: shop
spec:
  schedule: "0 2 * * *"
  target: orders-db
  retentionDays: 14
```

## The controller pattern

A **controller** is a program that runs a loop: observe the actual state, compare it with the desired state in the object's `spec`, and act to close the gap. This is **reconciliation**, and it is level-based: the controller does not need to know what changed, only what is wanted now.

```text
watch Backup objects
for each Backup:
    desired = spec (schedule, target, retention)
    actual  = existing CronJob, storage, last status
    if actual != desired: create or patch resources
    write result to status
```

Built-in controllers work the same way. The Deployment controller sees `replicas: 3`, finds two Pods and creates a third. Because the loop repeats continuously, the system heals itself after failures. Controllers report progress in `status` and `conditions`, which is where you look first when something is wrong.

## Operators

An **operator** is a controller plus a CRD that encodes human operational knowledge for a specific application: how to install it, back it up, scale it, upgrade it and recover it. A PostgreSQL operator might turn this into a running, replicated, backed-up cluster:

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: orders-db
  namespace: shop
spec:
  instances: 3
  storage:
    size: 50Gi
  backup:
    retentionPolicy: "14d"
```

Operators exist for databases, message queues, certificate management (cert-manager), monitoring (Prometheus Operator) and many other systems. They are the usual way to run stateful software on Kubernetes, because they capture failure handling you would otherwise do by hand.

## Working with custom resources

```console
$ kubectl get crd | head
$ kubectl get crd backups.ops.example.com -o jsonpath='{.spec.versions[*].name}'
$ kubectl api-resources --api-group=ops.example.com
$ kubectl explain backup.spec
$ kubectl get backups -n shop
$ kubectl describe backup orders-db -n shop
$ kubectl get backup orders-db -n shop -o jsonpath='{.status.conditions}'
```

`kubectl explain` documents the schema of any resource, including custom ones. When an object misbehaves, read its `status`, then the events, then the **controller's logs**.

```console
$ kubectl get pods -A | grep -i operator
$ kubectl logs deploy/backup-operator -n ops-system --tail=50
$ kubectl get events -n shop --sort-by=.lastTimestamp | tail
```

## Running operators responsibly

- Pin operator and CRD versions and test upgrades in staging
- Upgrade CRDs before the operator that uses them
- Deleting a CRD **deletes every object of that kind**, and sometimes their managed resources
- Give operators only the RBAC they need; they are powerful controllers
- Back up the data operators manage, not just their YAML

## Incident: the CRD that took the database with it

> **Incident:** During a clean-up an engineer deletes the PostgreSQL operator's CRDs with `kubectl delete crd` to "reinstall them fresh". Every database custom resource disappears, and the operator, seeing them removed, begins deleting the managed clusters.

Deleting a CRD cascades to all its objects. Stop the damage and recover:

```console
$ kubectl scale deploy/cnpg-controller-manager -n cnpg-system --replicas=0
$ kubectl get pvc -n shop
$ kubectl get volumesnapshot -n shop
```

Stop the operator first so it cannot delete more, check whether the PersistentVolumes survived (reclaim policy `Retain` saves them), and restore from backup or snapshots. Afterwards protect against it: use RBAC so only a few people can delete CRDs, set PV reclaim policy to `Retain` for databases, take backups outside the cluster and rehearse the restore.

## Common mistakes

- Deleting CRDs without understanding the cascade
- Treating a custom resource as if it had no controller behind it
- Installing operators from unreviewed manifests with cluster-admin rights
- Skipping CRD upgrades documented in the release notes
- Debugging only the custom resource and never the operator's logs

```quiz
Q: What does a CustomResourceDefinition do?
- Creates a Pod
+ Registers a new resource type with the Kubernetes API
- Installs a node
- Changes RBAC
> After a CRD is created, objects of the new kind can be managed with kubectl.

Q: What is the reconcile loop?
+ A controller repeatedly compares desired and actual state and corrects differences
- A kind of backup
- A scheduling algorithm
- A network protocol
> This level-based approach is what makes Kubernetes self-healing.

Q: What is an operator?
- A cluster administrator account
+ A controller and CRD that automate running a specific application
- A type of node
- A kubectl plugin only
> Operators encode operational knowledge such as backup, upgrade and failover.

Q: What happens when you delete a CRD?
- Nothing
+ All custom resources of that kind are deleted too
- Only the schema is removed
- It is blocked by default
> Deleting the definition removes every object of that type.
```

```cards
Where do you look first when a custom resource misbehaves? :: Its status and conditions, then events, then the controller logs
Command to read a resource schema? :: kubectl explain RESOURCE.spec
Why set PV reclaim policy Retain for databases? :: So the data volume survives if the claim or resource is deleted
Examples of popular operators? :: cert-manager, Prometheus Operator, database operators such as CloudNativePG
```
