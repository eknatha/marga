---
title: UEFI, bootloaders and Secure Boot
minutes: 12
summary: Follow the boot path from firmware to kernel, manage UEFI boot entries and understand Secure Boot keys and signed bootloaders.
---

A server is only as trustworthy as the first code it runs. Modern machines use UEFI firmware, an EFI system partition and a chain of signed bootloaders. Knowing this chain makes boot failures and security questions much less mysterious.

## What you will learn

- The UEFI boot sequence from firmware to kernel
- Reading and changing boot entries with efibootmgr
- How Secure Boot verifies shim, bootloader and kernel
- Recovering from a machine that will not boot

## The chain

Firmware reads **boot entries** from NVRAM and starts the first valid one. That loads a bootloader such as GRUB from the **EFI system partition** (ESP), a small FAT partition mounted at `/boot/efi`. The bootloader loads the kernel and initramfs, and the kernel mounts the root filesystem.

```bash
efibootmgr -v
mount | grep efi
ls /boot/efi/EFI
```

```console
BootCurrent: 0003
BootOrder: 0003,0001,0000
Boot0003* ubuntu  HD(1,GPT,...)/File(\EFI\ubuntu\shimx64.efi)
Boot0001* UEFI PXE IPv4 Intel(R) Ethernet
```

Change the order with `efibootmgr -o 0003,0001` and set a one-time next boot with `efibootmgr -n 0001`. Always keep a working entry before removing another.

## Secure Boot

With **Secure Boot**, firmware only runs code signed by a key it trusts. Distributions use a small signed program called **shim**, which verifies GRUB and the kernel against the vendor key or a Machine Owner Key you enroll. Unsigned custom kernels or out-of-tree modules fail unless you sign them.

```bash
mokutil --sb-state
mokutil --list-enrolled | head
```

## Recovery

If a node will not boot, use the BMC console to see the error. Boot a rescue image, mount the root and ESP, then reinstall the bootloader and regenerate configuration. Keep a tested rescue image on your provisioning server so fixing a node is routine.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How UEFI, bootloaders and Secure Boot fits together
node: n1 | The chain | 0 | 0 | Firmware reads boot entries from NVRAM and starts the first valid one. | Removing the old boot entry before testing the new one. | process
node: n2 | Secure Boot | 1 | 1 | With Secure Boot, firmware only runs code signed by a key it trusts. | Disabling Secure Boot instead of signing correctly. | security
node: n3 | Recovery | 2 | 0 | If a node will not boot, use the BMC console to see the error. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The kernel that would not start

> **Incident:** A custom kernel was rejected after Secure Boot was enabled.

```console
error: bad shim signature
error: you need to load the kernel first
Press any key to continue
```

A fleet moved to Secure Boot by policy, but the in-house kernel was unsigned. Nodes stopped at the loader. The team signed the kernel with an enrolled key, kept the signing key in a hardware module and added a boot test on one canary node before every rollout.

## Common mistakes

- Updating firmware on the whole fleet at once
- Removing the old boot entry before testing the new one
- Disabling Secure Boot instead of signing correctly
- Not backing up the ESP contents

```quiz
Q: What does the ESP hold?
+ Bootloader files
- User home folders :: No.
- Databases :: No.
- Logs :: No.
> A small FAT partition holds boot files.

Q: What is shim?
+ A small signed loader that verifies the next stage
- A shell :: No.
- A hypervisor :: No.
- A backup tool :: No.
> It bridges firmware trust to the distribution.

Q: Which command lists UEFI boot entries?
+ efibootmgr -v
- ls /etc :: No.
- mount -a :: No.
- ip addr :: No.
> It reads NVRAM entries.

Q: What is the safest way to roll out firmware updates?
+ Canary first, then waves
- All at once :: No.
- During peak load only :: No.
- Without a rollback plan :: No.
> Test before wide rollout.
```

```cards
ESP :: EFI system partition holding bootloaders
Secure Boot :: Firmware check that boot code is signed by trusted keys
shim :: Signed first-stage loader used by distributions
MOK :: Machine Owner Key you enroll to trust your own signatures
```
