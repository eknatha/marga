---
title: KubeVirt
summary: Install, VM objects, disks, networking, live migration, snapshots and a troubleshooting order for VMs on Kubernetes.
module: kubevirt
---
## Check and install

```bash
ls -l /dev/kvm
kubectl apply -f kubevirt-operator.yaml
kubectl apply -f kubevirt-cr.yaml
kubectl -n kubevirt wait kv kubevirt --for condition=Available --timeout=10m
```

> **Warning:** `useEmulation: true` runs VMs in software and is for tests only. Real workloads need `/dev/kvm`.

## Day-to-day with virtctl

```bash
virtctl start web01
virtctl stop web01
virtctl console web01
virtctl vnc web01
virtctl ssh cloud-user@web01
virtctl expose vm web01 --port=80 --name=web01-svc
```

> **Warning:** Edit the VirtualMachine, not the VMI. Changes to a VMI vanish at the next start.

## Objects

| Object | Meaning |
|--------|---------|
| VirtualMachine | Durable definition |
| VirtualMachineInstance | One running copy |
| DataVolume | Disk created and filled by CDI |
| VirtualMachineSnapshot | Point in time copy of disks and definition |
| MigrationPolicy | Rules for bandwidth and timeouts |

## Disks

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: golden
spec:
  source:
    http:
      url: https://example.com/image.qcow2
  storage:
    resources:
      requests:
        storage: 20Gi
```

> **Danger:** `containerDisk` is ephemeral. Data written to it is lost when the VM restarts.

## Migration

```bash
virtctl migrate web01
kubectl get vmim
kubectl get vmi web01 -o jsonpath='{.status.conditions[?(@.type=="LiveMigratable")].message}'
```

> **Warning:** ReadWriteOnce disks and passthrough devices block live migration. Check LiveMigratable before a drain.

## Snapshots

```bash
kubectl apply -f snapshot.yaml
kubectl get vmsnapshot
```

> **Warning:** A snapshot on the same storage is not a backup. Copy data off the cluster with Velero or an export.

## Troubleshooting order

| Step | Look at |
|------|---------|
| 1 | `kubectl get vm,vmi` phase and conditions |
| 2 | `kubectl describe vmi` and events |
| 3 | The virt-launcher pod: scheduling, OOMKilled |
| 4 | Node and virt-handler logs |
| 5 | Storage: PVC bound, DataVolume phase |
| 6 | Network: binding, Multus, Service selector |
| 7 | The guest: console, guest agent |

## Quick health sweep

```bash
kubectl get kubevirt -n kubevirt
kubectl get vmi -A
kubectl get dv,pvc -A
kubectl get vmim -A
virtctl console VMNAME
```
