---
title: Migrating from VMware to KubeVirt
minutes: 13
summary: Plan a move from VMware to KubeVirt: inventory, conversion tools such as the Migration Toolkit for Virtualization, driver and network changes, and what has no direct equivalent.
---

Many teams look at KubeVirt because of licensing changes on their current hypervisor. The technology move is manageable. The harder part is the people, process and tooling around the VMs.

## What you will learn

- Inventory and migration waves
- Tools that convert VMs
- Drivers, networks and storage mapping
- What has no direct equivalent

## Inventory and waves

List every VM with its operating system, size, disks, networks, dependencies, owner and downtime tolerance. Group them in waves: start with low risk Linux VMs, then application tiers, and leave the hardest (clustered databases, special hardware, old operating systems) for last. Each wave has a cutover plan, a test and a rollback.

## Conversion

The **Migration Toolkit for Virtualization** (upstream: Forklift) connects to vCenter, reads VMs and converts them into KubeVirt VirtualMachines. It uses `virt-v2v` to adapt the guest: it installs virtio drivers, removes VMware tools hooks and rewrites boot configuration. It supports a cold migration (VM off during the copy) and a warm migration (copy while running, then a short final sync).

```diagram
title: A migration plan, wave by wave
node: inv | Inventory | 0 | 1 | Every VM, its dependencies and its owner. | Missing a dependency breaks the application at cutover. | store
node: plan | Migration plan | 1 | 0 | Maps networks, storage and waves. | A wrong network map isolates the VM. | process
node: conv | Conversion (Forklift) | 2 | 1 | Copies disks and adapts the guest with virt-v2v. | A missing driver stops the guest booting. | process
node: test | Test in the cluster | 3 | 0 | Boots the VM, checks the application and performance. | Skipping the test moves the failure to cutover. | observe
node: cut | Cutover and rollback | 3 | 2 | Switches users to the new VM and keeps the old one for a while. | Deleting the source too early removes the rollback. | process
edge: inv | plan
edge: plan | conv
edge: conv | test
edge: test | cut
```

## Drivers, networks and storage

Linux guests usually have virtio drivers already. Windows guests need them installed, and boot problems usually mean a missing storage driver. Map each vSphere port group to a bridge or Multus network, and each datastore to a StorageClass. Replace VMware Tools with the qemu guest agent. Re-check IP addresses, MAC address based licences and monitoring agents.

## No direct equivalent

Distributed resource scheduling becomes the Kubernetes scheduler plus a descheduler. Backup moves from a VMware API product to CSI snapshots and Velero. Network virtualization such as NSX becomes network policies and CNI features. Plan training and runbooks, because operators will use kubectl instead of a vSphere client.

## Incident: The Windows VMs that would not boot

> **Incident:** Converted Windows VMs showed a blue screen after the first start.

```console
$ virtctl vnc win01
STOP: 0x0000007B INACCESSIBLE_BOOT_DEVICE
$ kubectl get vm win01 -o jsonpath='{.spec.template.spec.domain.devices.disks[0].disk.bus}'
virtio
```

The guests were converted to a virtio disk bus but no virtio storage driver was installed. The team installed the driver in the source VM before conversion, or temporarily used a SATA bus, then switched to virtio.

## Common mistakes

- Migrating the largest VMs first
- Deleting source VMs right after cutover
- Forgetting drivers for Windows guests
- Planning only the VMs and not the operations around them

```quiz
Q: Which tool upstream of the Migration Toolkit converts VMs?
+ Forklift
- Velero :: No.
- Multus :: No.
- Packer :: No.
> Forklift is the community project.

Q: What does a warm migration do?
+ Copies while the VM runs, then a short final sync
- Copies only when off :: No.
- Skips disks :: No.
- Deletes the source :: No.
> It reduces downtime.

Q: What commonly stops a converted Windows VM booting?
+ A missing virtio storage driver
- A long name :: No.
- A wrong label :: No.
- A big image :: No.
> The driver must exist before boot.

Q: How should migrations be ordered?
+ Low risk waves first, hardest last
- All at once :: No.
- Largest first :: No.
- Random :: No.
> Learn on easy VMs. The lesson section above explains why.
```

```cards
Forklift :: The upstream project behind the Migration Toolkit for Virtualization
virt-v2v :: A tool that converts guests and adds virtio drivers
Warm migration :: Copying a VM while it runs, then a short final sync
Wave :: A group of VMs migrated together
Rollback :: Returning users to the source VM if the migration fails
```
