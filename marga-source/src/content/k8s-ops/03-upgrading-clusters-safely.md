---
title: Upgrading clusters safely
minutes: 13
summary: Plan and run a Kubernetes version upgrade: order of components, version skew, API deprecations, nodes and rollback options.
---

Kubernetes ships a new minor version about three times a year, and each version is supported for roughly a year. Staying on a supported version is a security and reliability task. Upgrades are routine when you plan them and painful when they are a surprise after two years.

## What you will learn

- Respect the supported upgrade path and version skew
- Find deprecated APIs before they break
- Upgrade the control plane, then nodes
- Prepare a rollback and test in a lower environment

## One minor version at a time

You upgrade from 1.N to 1.N+1, not across several minors at once. The control plane is upgraded first. Kubelets may be older than the API server by a limited number of minor versions (check the version skew policy for the current allowance) but never newer. Components such as kubectl, CNI plugins, ingress controllers and operators have their own compatibility tables: read them before you start.

## Deprecated APIs

Each release removes some API versions. A manifest using a removed version fails to apply. Before upgrading, scan the cluster and your repositories for deprecated APIs with tools such as `kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis` or dedicated scanners, update manifests and charts, and read the release notes for removals and behaviour changes.

## Control plane then nodes

With kubeadm: upgrade the first control plane node (`kubeadm upgrade plan`, then `apply`), then the others with `kubeadm upgrade node`, then upgrade kubelet and kubectl packages and restart the kubelet. For worker nodes, upgrade one or a few at a time: **cordon** and **drain** the node, upgrade it, **uncordon**. Managed services automate much of this; you still choose the timing and check workload health. An alternative is the surge approach: add new nodes at the new version and drain the old ones.

## Rollback and rehearsal

Control plane upgrades are hard to undo, so the real rollback plan is a restored etcd snapshot and a documented procedure. Take a fresh snapshot first. Rehearse in a staging cluster that matches production, and run smoke tests after each step. Use PodDisruptionBudgets so draining does not take down a service, and schedule the window when traffic is low.

```predict
Q: A manifest uses an API version removed in the next release. When do you find out the cheapest way?
???
Before the upgrade, by scanning the cluster and repositories for deprecated API use.
> Check first, not after.
```

## Incident: Ingress objects stopped working

> **Incident:** After an upgrade, a team's routes disappeared and the pipeline failed to apply them.

```console
$ kubectl apply -f ingress.yaml
error: unable to recognize "ingress.yaml": no matches for kind "Ingress" in version "extensions/v1beta1"
$ kubectl api-versions | grep networking.k8s.io
networking.k8s.io/v1
```

The old API version had been removed. The team updated the manifests to the stable version, added a deprecation scan to the pipeline, and wrote the check into the upgrade checklist so the next release would show problems weeks earlier.

## Common mistakes

- Skipping minor versions
- Ignoring plugin compatibility
- Upgrading without a snapshot
- Draining without disruption budgets

```quiz
Q: How do you upgrade across versions?
+ One minor version at a time
- Jump three at once :: Unsupported.
- Never :: Unsafe.
- Randomly :: No.
> Follow the path. Re-read the matching lesson section for the full reasoning.

Q: What goes first?
+ The control plane
- The nodes :: Wrong order.
- The apps :: Wrong order.
- The DNS provider :: No.
> Nodes follow. Re-read the matching lesson section for the full reasoning.

Q: What does draining do?
+ Evicts pods safely from a node
- Deletes the node :: No.
- Reboots it :: No.
- Encrypts it :: No.
> Cordon then drain. Re-read the matching lesson section for the full reasoning.

Q: What is the real rollback for the control plane?
+ A tested etcd snapshot restore
- Press undo :: No such button.
- Downgrade kubelet :: Not sufficient.
- Delete the cluster :: Extreme.
> Prepare it first. Re-read the matching lesson section for the full reasoning.
```

```cards
Skew :: kubelet not newer than the API server
Deprecations :: scan before upgrading
kubeadm upgrade :: plan, apply, node
cordon, drain, uncordon :: node maintenance
PDB :: protect availability while draining
Snapshot :: your rollback
```
