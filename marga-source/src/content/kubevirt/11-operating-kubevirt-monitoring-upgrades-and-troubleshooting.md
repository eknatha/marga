---
title: Operating KubeVirt: monitoring, upgrades and troubleshooting
minutes: 13
summary: Monitor KubeVirt with metrics and alerts, upgrade it and its running VMs safely, and follow a fixed order to troubleshoot a VM that will not start or perform.
---

A KubeVirt cluster has two layers to watch: the control plane that runs the VMs and the guests themselves. Knowing where to look first saves hours.

## What you will learn

- Metrics and alerts
- Upgrading the operator and the running VMs
- A fixed troubleshooting order
- Day two checklist

## Monitoring

KubeVirt exposes Prometheus metrics for its components and for each VMI, for example vCPU time, memory usage and network traffic. Alert on virt-api or virt-controller down, virt-handler not ready on a node, failed or stuck migrations, VMs stuck in Scheduling, and guests with sustained CPU throttling. Also watch the storage layer, since it is the usual source of slow VMs.

## Upgrades

Apply a newer operator manifest and the KubeVirt resource follows. The control plane components roll. Running VMs keep their old virt-launcher until restarted or migrated. Set `workloadUpdateStrategy.workloadUpdateMethods: [LiveMigrate]` so KubeVirt migrates VMs to launchers of the new version in batches. VMs that cannot migrate need a planned restart.

```diagram
title: Upgrading KubeVirt without stopping VMs
node: op | New operator | 0 | 1 | Rolls the control plane to the new version. | Skipping versions can break the upgrade path. | process
node: ctl | New control plane | 1 | 1 | virt-api, virt-controller and virt-handler updated. | Check all pods are Ready before the next step. | service
node: old | VMs on old launchers | 2 | 0 | Still running the previous launcher version. | They stay old until restarted or migrated. | service
node: mig | Batch live migration | 2 | 2 | Moves VMs to new launchers a few at a time. | Non migratable VMs block and need a restart. | process
node: new | VMs on new launchers | 3 | 1 | The goal state with the new version everywhere. | Verify with the launcher image on each VMI. | service
edge: op | ctl
edge: ctl | old
edge: ctl | mig
edge: old | mig
edge: mig | new
```

## Troubleshooting order

1. `kubectl get vm,vmi`: phase and conditions.
2. `kubectl describe vmi` and events: reasons for Pending or failed.
3. The virt-launcher pod: scheduling, image pull, OOMKilled.
4. The node and virt-handler logs.
5. Storage: PVC bound, DataVolume phase, CSI health.
6. Network: bindings, Multus, Service selectors.
7. The guest: `virtctl console`, guest logs, guest agent.

## Day two checklist

Alerts in place, a tested drain, a tested restore, images versioned, upgrade rehearsed in a test cluster, and a record of which VMs cannot migrate.

## Incident: The upgrade that left old launchers

> **Incident:** Weeks after an upgrade, VMs still ran the old launcher image.

```console
$ kubectl get vmi -o custom-columns=NAME:.metadata.name,LAUNCHER:.status.launcherContainerImageVersion
NAME    LAUNCHER
web01   quay.io/kubevirt/virt-launcher:v1.2.0
$ kubectl get kv -n kubevirt kubevirt -o jsonpath='{.status.observedKubeVirtVersion}'
v1.3.0
```

The control plane was on v1.3.0, but the VMs still used v1.2.0 launchers because no workload update method was set. Enabling LiveMigrate moved them over in a weekend window.

## Common mistakes

- Assuming an operator upgrade upgrades the VMs
- Skipping alerts on stuck migrations
- Troubleshooting the guest before checking storage and scheduling
- Upgrading production first

```quiz
Q: What does an operator upgrade not change by itself?
+ Running virt-launcher versions
- The CRDs :: No.
- The API :: No.
- The namespace :: No.
> VMs keep old launchers until moved.

Q: Which setting moves VMs to new launchers?
+ workloadUpdateStrategy with LiveMigrate
- runStrategy Halted :: No.
- useEmulation :: No.
- dedicatedCpuPlacement :: No.
> It migrates VMs in batches.

Q: Where do you start troubleshooting a VM?
+ kubectl get vm,vmi and events
- The guest logs only :: No.
- The CI server :: No.
- The DNS server :: No.
> Work from the top down.

Q: What often causes slow VMs?
+ The storage layer
- A short VM name :: No.
- A long label :: No.
- A big namespace :: No.
> Check storage before the guest.
```

```cards
Workload update strategy :: The setting that decides how running VMs get a new launcher
Component monitoring :: Metrics and alerts for KubeVirt itself
Stuck migration :: A migration that never reaches the target
Rehearsal :: Testing an upgrade or drain in a non production cluster
Launcher image :: The container image that runs a VM's pod
```
