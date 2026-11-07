---
title: Why VMs on Kubernetes and how KubeVirt works
minutes: 13
summary: Learn why teams run virtual machines on Kubernetes and how KubeVirt turns a VM into a pod with the virt-api, virt-controller, virt-handler and virt-launcher components.
---

Containers share the host kernel. Some software needs its own kernel, a different operating system, or a vendor-supported VM image. KubeVirt runs those workloads on the Kubernetes you already operate.

## What you will learn

- Why teams run VMs on Kubernetes
- The KubeVirt components and what each does
- How a VM becomes a pod
- What KubeVirt does not do for you

## Why run VMs on Kubernetes

One platform, one set of tools. Teams move VMs from a separate hypervisor estate onto Kubernetes to share scheduling, delivery pipelines, RBAC, monitoring and networking with their containers. It suits legacy software that cannot be containerised, mixed Windows and Linux estates, and a gradual exit from a costly virtualization platform. It does not make a VM lighter than a container: each VM still carries its own guest operating system.

## The components

| Component | Where it runs | Job |
|-----------|---------------|-----|
| **virt-operator** | Deployment | Installs and upgrades KubeVirt |
| **virt-api** | Deployment | Validates VM objects, serves console and VNC subresources |
| **virt-controller** | Deployment | Watches VMs and creates the virt-launcher pod |
| **virt-handler** | DaemonSet, one per node | Tells the node's libvirt to start, stop and migrate the domain |
| **virt-launcher** | One pod per running VM | Runs libvirt and QEMU for that single VM |

```diagram
title: From a VirtualMachine object to a running guest
node: user | kubectl / virtctl | 0 | 1 | Applies a VirtualMachine object or runs virtctl start. | A wrong spec is accepted by the API but the VM may not schedule. | client
node: api | Kubernetes API + virt-api | 1 | 1 | Stores the VM and validates it with admission webhooks. | If virt-api is down, VM changes are rejected. | service
node: ctrl | virt-controller | 2 | 0 | Creates a VirtualMachineInstance and its virt-launcher pod. | A pod stuck Pending leaves the VM in Scheduling. | service
node: handler | virt-handler (per node) | 2 | 2 | Starts the libvirt domain on the node that was chosen. | A node without /dev/kvm cannot run the VM at full speed. | service
node: pod | virt-launcher pod | 3 | 1 | Runs libvirt and QEMU, and holds the VM's disks and network. | Pod memory limits must include VM memory plus overhead. | process
edge: user | api
edge: api | ctrl
edge: ctrl | pod
edge: api | handler
edge: handler | pod
```

## One VM, one pod

When you start a VirtualMachine, KubeVirt creates a VirtualMachineInstance (VMI) and a virt-launcher pod. The scheduler places the pod like any other. The pod's disks are PersistentVolumeClaims, its network comes from the CNI, and deleting the VMI deletes the pod. This is why `kubectl get pods` shows a `virt-launcher-<name>` pod for each running VM.

## What it does not do

KubeVirt is not a full virtualization management suite. It does not ship backup, a cost console or a vSphere-style UI. You compose those from Kubernetes tools such as CSI snapshots, Velero and Prometheus.

## Incident: The VM that stayed Pending

> **Incident:** A new VM sat in the Scheduling phase for an hour.

```console
$ kubectl get vmi
NAME   AGE   PHASE        IP   NODENAME
db1    58m   Scheduling
$ kubectl describe pod virt-launcher-db1-x7k2p | grep -A2 Events
Warning  FailedScheduling  0/6 nodes are available: 6 Insufficient devices.kubevirt.io/kvm.
```

The cluster nodes were virtual machines without nested virtualization, so no node offered the kvm device. The team moved the VM to bare-metal nodes with a node selector and the VMI started within a minute.

## Common mistakes

- Treating a VM as lighter than a container
- Expecting a hypervisor feature to exist because the old platform had it
- Running on nodes without hardware virtualization and wondering why it is slow
- Forgetting that pod limits and VM memory are linked

```quiz
Q: What runs inside a virt-launcher pod?
+ libvirt and QEMU for one VM
- The Kubernetes scheduler :: No.
- The whole cluster :: No.
- A container registry :: No.
> Each VM has its own launcher pod.

Q: Which component runs on every node as a DaemonSet?
+ virt-handler
- virt-api :: No.
- virt-operator :: No.
- virt-controller :: No.
> virt-handler manages domains on its node.

Q: What does virt-controller create for a started VM?
+ A VMI and a virt-launcher pod
- A new node :: No.
- A StorageClass :: No.
- A Helm chart :: No.
> It turns the VM into a running instance.

Q: Why might a VM stay in Scheduling?
+ No node offers the needed resources such as the kvm device
- The image is too small :: No.
- DNS is slow :: No.
- Git is down :: No.
> The launcher pod is Pending.
```

```cards
KubeVirt :: An add-on that runs virtual machines as Kubernetes workloads
VMI :: VirtualMachineInstance, the running copy of a VM
virt-launcher :: The pod that runs libvirt and QEMU for one VM
virt-handler :: The node agent that manages VM domains
virt-api :: The API component that validates VMs and serves console access
```
