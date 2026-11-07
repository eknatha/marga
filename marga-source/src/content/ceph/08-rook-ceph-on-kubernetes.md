---
title: Rook: running Ceph on Kubernetes
minutes: 13
summary: Deploy and operate Ceph inside Kubernetes with the Rook operator, define clusters, pools and storage classes as custom resources, and use the toolbox for ceph commands.
---

Running Ceph inside Kubernetes is attractive: one platform, declarative storage, and the operator replaces daemons that fail. It also couples your storage lifecycle to cluster operations, which needs care.

## What you will learn

- What the Rook operator manages
- Defining the cluster and its pools
- Hyperconverged and dedicated storage nodes
- Day two: toolbox, upgrades and safe node maintenance

## The operator

Rook runs as a Deployment. You create a `CephCluster` custom resource and it starts monitors, managers and OSD pods, one OSD per device. If a pod dies, Kubernetes and the operator restart it. Rook also installs ceph-csi so PVCs can use the pools.

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: storage1
        devices:
          - name: nvme1n1
```

## Pools and classes

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
```

A StorageClass then points at this pool. PVCs from it become RBD images.

```diagram
title: Rook turning a custom resource into storage
node: cr | CephCluster resource | 0 | 1 | Declares monitors, devices and the Ceph version. | A wrong device list can wipe a disk. | store
node: op | Rook operator | 1 | 0 | Creates and heals the Ceph pods. | If the operator is down nothing is repaired. | process
node: pods | MON, MGR and OSD pods | 2 | 1 | The running Ceph daemons. | Pods on one node share a failure. | service
node: sc | StorageClass + CSI | 2 | 2 | Turns PVCs into RBD or CephFS volumes. | Wrong pool names leave PVCs Pending. | process
node: app | Application PVC | 3 | 2 | Uses the storage like any volume. | Heavy writers need their own pool or class. | client
edge: cr | op
edge: op | pods
edge: op | sc
edge: sc | app
```

## Where to run it

Hyperconverged means storage and applications share nodes, which saves hardware but couples CPU and memory use. Dedicated storage nodes, selected with labels and taints, give steadier performance. Either way, OSD pods need local disks or PVCs from a fast class.

## Day two

The **toolbox** pod gives you the `ceph` command: `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph -s`. Upgrade the operator first, then the Ceph image. Before draining a node, check that the cluster is healthy and that removing the node's OSDs keeps enough replicas.

## Incident: The drain that took data offline

> **Incident:** A node drain started a cascade of warnings.

```console
$ kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph -s
    health: HEALTH_WARN
            Degraded data redundancy: 412/9120 objects degraded
$ kubectl get nodes
storage2   Ready,SchedulingDisabled
```

A second node was drained before recovery from the first finished, so some data had one copy. The team now waits for HEALTH_OK between drains and uses Pod Disruption Budgets that Rook creates.

## Common mistakes

- Draining a second storage node before the cluster is healthy again
- Using useAllDevices on nodes with data disks
- Mixing storage and heavy application load without limits
- Upgrading Ceph before the operator

```quiz
Q: What does the Rook operator watch?
+ Custom resources such as CephCluster
- Only Pods :: No.
- Only Nodes :: No.
- DNS :: No.
> It reconciles the declared cluster.

Q: How do you run ceph commands in Rook?
+ Through the toolbox pod
- On the laptop :: No.
- With kubectl apply :: No.
- In the registry :: No.
> The toolbox has the CLI.

Q: What does a CephBlockPool define?
+ A pool and its replica settings
- A node :: No.
- A secret :: No.
- An ingress :: No.
> It creates an RBD pool.

Q: What should you check before draining a storage node?
+ That the cluster is HEALTH_OK
- The label colour :: No.
- The DNS TTL :: No.
- The image size :: No.
> Recovery must finish first.
```

```cards
Rook :: A Kubernetes operator for running Ceph
CephCluster :: The resource that declares a Ceph cluster in Rook
Toolbox :: A pod with the ceph command line tools
Hyperconverged :: Storage and applications share the same nodes
Operator :: A controller that manages a complex application
```
