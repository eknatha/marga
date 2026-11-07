---
title: What virtualization is and the types of hypervisor
minutes: 14
summary: Understand how one physical server runs many virtual machines, and how KVM, VMware, Hyper-V and Proxmox differ.
---

A server with 64 CPU cores and 512 GB of memory usually runs far below its limits when it hosts one application. Virtualization lets one physical machine, the host, run many virtual machines, called guests, each with its own operating system, and shares the hardware between them.

## What you will learn

- What a hypervisor does and why modern CPUs help it
- Type 1 and type 2 hypervisors, with KVM, ESXi, Hyper-V and Proxmox as examples
- How a virtual machine differs from a container
- The pieces of a KVM host: kernel module, QEMU, libvirt

## What a hypervisor does

A **hypervisor** is the software that creates virtual machines and hands each one a share of CPU, memory, disk and network. A guest believes it owns a whole computer. The hypervisor keeps guests apart, so a crash or an attack inside one guest does not reach the others.

Fast virtualization depends on **hardware support**. On Intel this is VT-x, on AMD it is AMD-V. These CPU features let guest code run directly on the processor, and only a small set of sensitive operations is trapped by the hypervisor. Without them, virtualization is slow or needs tricks.

```console
$ grep -E -o 'vmx|svm' /proc/cpuinfo | sort -u
vmx
$ lsmod | grep kvm
kvm_intel             380928  0
kvm                  1142784  1 kvm_intel
```

`vmx` means Intel VT-x is present and `svm` means AMD-V. If neither appears, the feature may be off in the firmware settings, or you are already inside a virtual machine that does not pass it through.

## Type 1 and type 2

| Kind | Runs on | Examples | Typical use |
|---|---|---|---|
| Type 1 (bare metal) | Directly on hardware | VMware ESXi, Microsoft Hyper-V, KVM, Xen, Proxmox VE | Servers and private clouds |
| Type 2 (hosted) | Inside a normal operating system | VirtualBox, VMware Workstation, Parallels | Laptops, testing |

The line is not perfectly sharp. **KVM** is a part of the Linux kernel, so Linux itself becomes the hypervisor, which is why KVM is usually counted as type 1. **Proxmox VE** is a Debian-based system that bundles KVM virtual machines, containers, clustering and a web interface.

## The KVM stack

- **KVM** is the kernel module that uses the CPU features.
- **QEMU** is the user-space program that emulates the rest of the machine: devices, disks, network cards, and it is the process you see for each guest.
- **libvirt** is the management layer. Tools such as `virsh` and `virt-manager` talk to libvirt, which starts QEMU with the right options.
- **virtio** is a family of paravirtual drivers. A guest with virtio disk and network drivers is much faster than one that uses emulated hardware.

```console
$ virsh list --all
 Id   Name        State
------------------------------
 3    web-01      running
 -    batch-02    shut off
```

## Virtual machines and containers

A virtual machine includes a full guest kernel. A container shares the host kernel and isolates processes with namespaces and cgroups. That makes containers lighter and faster to start, and virtual machines a stronger boundary because an attacker has to escape a hypervisor, not just a shared kernel. Many platforms run containers inside virtual machines to get both.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How What virtualization is and the types of hypervisor fits together
node: n1 | What a hypervisor does | 0 | 0 | A hypervisor is the software that creates virtual machines and hands each one a share of CPU, memory, disk and network. | Forgetting that nested virtualization (a hypervisor inside a guest) needs the setting enabled on the outer host. | process
node: n2 | Type 1 and type 2 | 1 | 1 | The line is not perfectly sharp. KVM is a part of the Linux kernel, so Linux itself becomes the hypervisor, which is why KVM is usually counted as type 1. | Judging a host by CPU use alone and ignoring memory, which is usually the first limit. | process
node: n3 | The KVM stack | 2 | 0 | KVM is the kernel module that uses the CPU features. | Running guests on emulated disk and network devices instead of virtio. | process
node: n4 | Virtual machines and containers | 3 | 1 | A virtual machine includes a full guest kernel. | Treating a virtual machine as a security boundary that needs no patching. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The guest that would not start

> **Incident:** A new KVM host refused to start any guest and the team assumed the image was broken.

```console
$ virsh start web-01
error: Failed to start domain 'web-01'
error: unsupported configuration: Domain requires KVM, but it is not available. Check that virtualization is enabled in the host BIOS, and host configuration is setup to load the kvm modules.
$ lsmod | grep kvm
$ grep -c vmx /proc/cpuinfo
0
```

The image was fine. Hardware virtualization was switched off in the server firmware, so the CPU did not advertise `vmx` and the kvm module could not load. After the setting was enabled and the host restarted, the same command worked. When a guest will not start, check the host before the guest.

## Common mistakes

- Judging a host by CPU use alone and ignoring memory, which is usually the first limit
- Running guests on emulated disk and network devices instead of virtio
- Forgetting that nested virtualization (a hypervisor inside a guest) needs the setting enabled on the outer host
- Treating a virtual machine as a security boundary that needs no patching

```quiz
Q: What do VT-x and AMD-V provide?
+ CPU support that lets guest code run directly on the processor
- Extra memory for guests :: They are CPU features, not memory.
- A faster network card :: They concern the CPU.
- A container runtime :: They are unrelated to containers.
> Hardware assistance makes virtualization fast.

Q: Which part of the KVM stack emulates devices for a guest?
+ QEMU
- libvirt :: libvirt manages; QEMU emulates.
- virsh :: virsh is a command line client.
- The guest kernel :: The guest does not emulate its own hardware.
> QEMU is the process behind each guest.

Q: Why is KVM usually called a type 1 hypervisor?
+ It is part of the Linux kernel, which runs directly on the hardware
- It only runs on bare metal servers with no OS :: Linux is the OS.
- It does not need a CPU extension :: It does need one.
- It is made by VMware :: It is not.
> The kernel itself becomes the hypervisor.

Q: What is the main isolation difference between a VM and a container?
+ A VM has its own kernel; a container shares the host kernel
- Containers have their own kernel :: They share it.
- VMs share the host kernel :: They have their own.
- There is no difference :: The kernel boundary is the difference.
> A shared kernel is a thinner boundary.
```

```cards
Hypervisor :: software that runs virtual machines
Type 1 :: runs directly on hardware, for example ESXi or KVM
Type 2 :: runs inside a normal OS, for example VirtualBox
KVM :: Linux kernel module that uses CPU virtualization
QEMU :: emulates the devices of a guest
libvirt :: management layer used by virsh
```
