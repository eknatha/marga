---
title: VirtualMachines, VMIs and run strategies
minutes: 13
summary: Read and write a VirtualMachine manifest, understand how it differs from a VirtualMachineInstance, and pick a run strategy such as Always or Manual.
---

Two objects confuse newcomers: VirtualMachine and VirtualMachineInstance. Think of a Deployment and a Pod. One is the intent, the other is the running thing.

## What you will learn

- VirtualMachine versus VirtualMachineInstance
- The structure of a VM manifest
- Run strategies and what each does
- Phases and where to look when a VM does not start

## VM and VMI

A **VirtualMachine** is stored in the cluster and survives stops and restarts. When it should run, KubeVirt creates a **VirtualMachineInstance** from its template. When it stops, the VMI is deleted and the VM remains. Changes to the template apply at the next start, except for a few hot-pluggable settings.

## A minimal VM

```yaml
apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: web01
spec:
  runStrategy: Halted
  template:
    spec:
      domain:
        cpu:
          cores: 2
        memory:
          guest: 4Gi
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
          interfaces:
            - name: default
              masquerade: {}
      networks:
        - name: default
          pod: {}
      volumes:
        - name: rootdisk
          persistentVolumeClaim:
            claimName: web01-root
```

## Run strategies

| Strategy | Behaviour |
|----------|-----------|
| `Always` | Start and keep the VM running; restart it if it stops |
| `RerunOnFailure` | Restart only after a crash, not after a clean shutdown |
| `Manual` | Start and stop only on request with virtctl |
| `Halted` | Keep the VM stopped |
| `Once` | Run once and do not restart |

```diagram
title: Lifecycle of a VirtualMachine
node: halted | Halted | 0 | 1 | The VM object exists with no instance. | Disks and config remain; nothing runs. | store
node: sched | Scheduling | 1 | 0 | A VMI and launcher pod are created and placed on a node. | Stuck here means no node fits, or storage is not ready. | process
node: run | Running | 2 | 1 | The guest is booted and the VMI has an IP. | Guest crashes are visible through the Ready condition. | service
node: stop | Stopping | 1 | 2 | virt-handler shuts the guest down and the VMI is removed. | A force stop can corrupt the guest filesystem. | process
edge: halted | sched
edge: sched | run
edge: run | stop
edge: stop | halted
```

## When it will not start

Read the conditions first: `kubectl get vm,vmi` and `kubectl describe vmi web01`. Pending storage, an unsatisfiable node selector and a missing image are the common causes. `kubectl get events` often names the exact reason.

## Incident: A change that disappeared

> **Incident:** Extra memory added to a running VMI vanished after a restart.

```console
$ kubectl edit vmi web01
virtualmachineinstance.kubevirt.io/web01 edited
$ virtctl restart web01
$ kubectl get vmi web01 -o jsonpath='{.spec.domain.memory.guest}'
4Gi
```

The edit changed only the instance. On restart, KubeVirt built a new VMI from the VirtualMachine, which still said 4Gi. Editing the VirtualMachine and restarting kept the change.

## Common mistakes

- Editing the VMI instead of the VM
- Using Always for a VM that must stay stopped during maintenance
- Leaving the guest memory smaller than the application needs
- Ignoring events when a VM stays in Scheduling

```quiz
Q: Which object is the durable definition?
+ VirtualMachine
- VirtualMachineInstance :: No.
- Pod :: No.
- Node :: No.
> The VM owns the instance.

Q: Which run strategy keeps a VM stopped?
+ Halted
- Always :: No.
- Once :: No.
- RerunOnFailure :: No.
> Halted means no instance runs.

Q: Where should a permanent memory change be made?
+ In the VirtualMachine template
- In the VMI :: No.
- In the node :: No.
- In the pod IP :: No.
> Instances are built from the VM.

Q: What shows why a VM is stuck in Scheduling?
+ kubectl describe vmi and events
- The guest console only :: No.
- The registry :: No.
- A cheat sheet :: No.
> Conditions and events give the reason.
```

```cards
VirtualMachine :: The durable definition of a VM
VirtualMachineInstance :: One running copy of a VM
runStrategy :: The setting that controls when a VM starts and restarts
Halted :: A run strategy that keeps the VM stopped
Guest :: The operating system running inside the VM
```
