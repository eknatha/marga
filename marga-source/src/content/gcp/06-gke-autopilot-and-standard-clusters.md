---
title: GKE: Autopilot and Standard clusters
minutes: 13
summary: Compare GKE Autopilot and Standard modes, create a cluster, use Workload Identity, node pools and release channels, and avoid common cost and upgrade traps.
---

GKE removes the hardest part of Kubernetes, running the control plane, and offers two levels of further help. Choosing the right mode and securing identity early prevents most surprises.

## What you will learn

- Autopilot and Standard modes
- Regional clusters, release channels and upgrades
- Workload Identity and private clusters
- Ingress, Gateway and cost habits

## Two modes

| | Autopilot | Standard |
|---|---|---|
| Nodes | Managed by Google | You manage node pools |
| Billing | Pod resource requests | Node VMs |
| Privileged pods, custom kernel | Limited | Allowed |
| Hardened defaults | Yes | You configure |

## Create a cluster

```console
$ gcloud container clusters create-auto prod --region=europe-west1 --release-channel=regular
$ gcloud container clusters get-credentials prod --region=europe-west1
$ kubectl get nodes
```

**Regional** clusters replicate the control plane across zones. A **release channel** (rapid, regular, stable) gets automatic upgrades; set **maintenance windows** and **exclusions** for busy periods.

## Identity

**Workload Identity Federation for GKE** lets a Kubernetes service account act as a Google service account, so pods get short-lived tokens without key files.

```console
$ kubectl annotate serviceaccount web -n shop \
    iam.gke.io/gcp-service-account=web@acme-pay-prod.iam.gserviceaccount.com
```

Use **private clusters** (nodes without public IPs) and authorised networks for the API endpoint.

## Traffic and cost

Expose services through the **Gateway API** or Ingress to a Google load balancer. In Autopilot, set accurate resource **requests**, since they decide the bill. In Standard, use cluster autoscaler, Spot node pools for tolerant workloads and bin packing to avoid idle nodes.

```diagram
title: A GKE cluster
node: dev | kubectl and CI | 0 | 0 | Talks to the Kubernetes API. | A public API with no network limits is exposed.
node: cp | Managed control plane | 1 | 0 | Run by Google; regional for high availability. | Version skew blocks old APIs after upgrade.
node: pool | Nodes | 2 | 0 | Autopilot-managed or your node pools. | Idle nodes cost money in Standard. | service
node: wi | Workload Identity | 2 | 1 | Maps a Kubernetes service account to a Google one. | Without it pods share the node account. | security
node: lb | Google load balancer | 3 | 0 | Sends external traffic to pods via Gateway. | Wrong health-check path marks pods unhealthy. | edge
edge: dev | cp
edge: cp | pool
edge: wi | pool
edge: pool | lb
```

## Incident: Pods stuck pending

> **Incident:** New pods stayed pending because requests exceeded what the cluster could provide in Standard mode.

```console
$ kubectl describe pod web-7d9f
Warning FailedScheduling  0/3 nodes are available: 3 Insufficient cpu.
cluster-autoscaler: node pool at maximum size 3
```

The node pool maximum was too low for the new requests. Raising the maximum and rightsizing requests let pods schedule. The team later moved the workload to Autopilot to remove node sizing.

## Common mistakes

- Using node service account keys instead of Workload Identity
- Requests copied from examples, inflating the bill in Autopilot
- Disabling auto-upgrades and falling far behind
- A public API endpoint with no authorised networks

```quiz
Q: What does Autopilot bill by?
+ Pod resource requests
- Node count :: No.
- Disk labels :: No.
- Region :: No.
> Per-pod pricing. The lesson section above explains why.

Q: What does Workload Identity avoid?
+ Key files for pods
- Pods :: No.
- Load balancers :: No.
- Health checks :: No.
> Short-lived tokens replace keys.

Q: What is a release channel?
+ A stream of automatic upgrades
- A network :: No.
- A node type :: No.
- A load balancer :: No.
> Rapid, regular or stable.

Q: When choose Standard?
+ You need privileged pods or custom nodes
- Never :: No.
- Only for tiny apps :: No.
- For free tier :: No.
> It offers more control.
```

```cards
Autopilot :: GKE mode where Google manages nodes
Node pool :: A group of nodes with the same configuration
Release channel :: A track of automatic cluster upgrades
Workload Identity :: Pods acting as Google service accounts without keys
Private cluster :: A cluster whose nodes have no public IPs
```
