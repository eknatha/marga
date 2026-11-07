---
title: GPU passthrough and device assignment
minutes: 12
summary: Give a VM direct access to a GPU or network card with VFIO and IOMMU, and understand groups, limitations and security.
---

Some workloads need real hardware speed, such as GPU compute or high-rate networking. Passthrough gives a VM direct control of a device, at the cost of the usual virtualization conveniences.

## What you will learn

- IOMMU, VFIO and IOMMU groups
- Assigning a device to a VM
- Limits: migration, reset and sharing
- Security considerations

## How it works

The **IOMMU** translates and isolates device memory access. **VFIO** is the kernel framework that lets user space, such as QEMU, own a device safely. Devices that share an **IOMMU group** must be assigned together, because the hardware cannot isolate them from each other.

```bash
# enable in kernel command line: intel_iommu=on iommu=pt  (or amd_iommu=on)
dmesg | grep -i -E "iommu|dmar"
for g in /sys/kernel/iommu_groups/*; do echo "group ${g##*/}:"; ls "$g/devices"; done
lspci -nnk -s 3b:00.0
```

## Assign a device

```bash
echo "options vfio-pci ids=10de:2330" > /etc/modprobe.d/vfio.conf
update-initramfs -u && reboot
virsh nodedev-list --cap pci | grep 3b
```

```xml
<hostdev mode='subsystem' type='pci' managed='yes'>
  <source>
    <address domain='0x0000' bus='0x3b' slot='0x00' function='0x0'/>
  </source>
</hostdev>
```

With `managed='yes'`, libvirt binds the device to VFIO when the VM starts and returns it afterwards.

## Limits

A passed-through device belongs to one VM at a time. **Live migration** is generally not possible with it attached. Reset behavior varies by device, so test repeated start and stop cycles. Large device memory needs matching guest settings, such as huge pages and a large BAR configuration.

## Security

Assignment relies on the IOMMU for isolation. Keep firmware and drivers updated, restrict who can attach devices and prefer hardware partitioning, such as MIG or SR-IOV, when several tenants share a device.

```bash
virsh dumpxml gpu-vm | grep -A3 hostdev
nvidia-smi -L        # run inside the guest
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GPU passthrough and device assignment fits together
node: n1 | How it works | 0 | 0 | The IOMMU translates and isolates device memory access. | Not checking IOMMU groups. | process
node: n2 | Assign a device | 1 | 1 | With managed='yes', libvirt binds the device to VFIO when the VM starts and returns it afterwards. | Expecting live migration with passthrough devices. | process
node: n3 | Limits | 2 | 0 | A passed-through device belongs to one VM at a time. | Skipping reset tests. | process
node: n4 | Security | 3 | 1 | Assignment relies on the IOMMU for isolation. | Sharing a passthrough device between tenants. | security
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The host that froze on shutdown

> **Incident:** A VM shutdown hung the whole host because the GPU could not reset.

```console
vfio-pci 0000:3b:00.0: not ready 65535ms after FLR; giving up
qemu-kvm: terminating on signal 15
host unresponsive for 4 minutes
```

The device did not support a clean function-level reset in that firmware version. The team updated the firmware, chose a different reset method, added a stop-and-start test to acceptance and wrote a runbook for recovering a stuck device.

## Common mistakes

- Not checking IOMMU groups
- Expecting live migration with passthrough devices
- Skipping reset tests
- Sharing a passthrough device between tenants

```quiz
Q: What does the IOMMU provide?
+ Device memory isolation and translation
- More RAM :: No.
- Faster disks :: No.
- DNS :: No.
> It protects the host.

Q: What is VFIO?
+ Framework for safe device access from user space
- A filesystem :: No.
- A hypervisor :: No.
- A backup tool :: No.
> QEMU uses it. The lesson section above explains why.

Q: What must be assigned together?
+ Devices in the same IOMMU group
- Any two devices :: No.
- Only disks :: No.
- Only networks :: No.
> Hardware cannot isolate them.

Q: What is usually impossible with passthrough?
+ Live migration
- Boot :: No.
- Logging :: No.
- Networking :: No.
> The device is tied to the host.
```

```cards
IOMMU :: Hardware that isolates device memory access
VFIO :: Linux framework for device assignment
IOMMU group :: Devices that cannot be isolated from each other
SR-IOV :: Splits a device into virtual functions
```
