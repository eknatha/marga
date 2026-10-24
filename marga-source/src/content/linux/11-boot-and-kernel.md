---
title: Boot process, kernel and recovery
minutes: 15
summary: Follow the boot sequence from firmware to systemd, inspect and tune the kernel with sysctl and modules, and recover a server that will not boot.
---

When a server does not come back after a reboot, you have no SSH session, no logs from the usual tools and a console that shows only a few lines. Knowing the boot sequence tells you where to look.

## What you will learn

- The stages of the Linux boot process
- Reading boot logs and unit failures
- Kernel parameters, modules and `sysctl`
- Recovering with rescue mode and fixing fstab errors

## The sequence

1. **Firmware** (UEFI or BIOS) runs hardware checks and finds a boot device.
2. The **bootloader** (GRUB) loads the kernel and an initial RAM filesystem (initramfs).
3. The **kernel** initialises hardware, mounts the root filesystem and starts PID 1.
4. **systemd** (PID 1) mounts filesystems from fstab, starts services in dependency order and reaches a target such as `multi-user.target`.

Each stage has its own failure signature. A GRUB prompt means the bootloader or its config is broken. A kernel panic mentioning "unable to mount root fs" means the initramfs or root device is wrong. A hang with "A start job is running for dev-disk-by-uuid" means systemd is waiting for a filesystem in fstab that does not exist.

## Reading the boot

```console
$ systemd-analyze
$ systemd-analyze blame | head
$ systemd-analyze critical-chain
$ journalctl -b -p err
$ journalctl -b -1 -p err | tail -20
$ systemctl --failed
$ dmesg --level=err,warn | tail
```

`journalctl -b -1` shows the previous boot, which is essential after a crash. If the journal is not persistent, create `/var/log/journal` and restart journald so logs survive reboots.

## The kernel and its tunables

```console
$ uname -r
$ lsmod | head -5
$ modinfo overlay | head -5
$ sudo modprobe br_netfilter
$ sysctl net.ipv4.ip_forward
$ sudo sysctl -w net.ipv4.ip_forward=1
$ cat /proc/cmdline
```

`sysctl -w` changes a value until reboot. To keep it, put it in a file under `/etc/sysctl.d/`:

```text
net.ipv4.ip_forward = 1
vm.swappiness = 10
fs.inotify.max_user_watches = 524288
net.core.somaxconn = 4096
```

```console
$ sudo sysctl --system
$ cat /etc/modules-load.d/k8s.conf
```

Kubernetes nodes, for example, need `br_netfilter` loaded and IP forwarding enabled. Modules listed in `/etc/modules-load.d/` load automatically at boot.

## Recovery

If the system drops to an emergency shell, the root filesystem is usually mounted read-only. Check what failed, then fix it:

```console
$ journalctl -xb | tail -30
$ mount -o remount,rw /
$ blkid
$ nano /etc/fstab
$ mount -a
$ systemctl default
```

If you cannot get a shell at all, boot with a rescue ISO, mount the root volume at `/mnt` and `chroot` into it. In the cloud, detach the root volume, attach it to a healthy instance, fix the file and reattach it. At the GRUB menu, pressing `e` lets you edit the kernel line once, for example adding `systemd.unit=rescue.target` to reach single-user mode.

## Incident: the reboot that never came back

> **Incident:** After patching, a database server does not respond. The cloud console shows it running, but the serial console is stuck on "A start job is running for /dev/disk/by-uuid/..." for 1m 30s repeated. Someone had replaced a data disk last week, and its old UUID is still in fstab.

systemd waits for a device that will never appear. Boot to emergency or rescue mode and correct the entry:

```console
$ blkid | grep data
$ sudo nano /etc/fstab
$ sudo mount -a && echo fstab ok
```

Prevent a repeat by testing with `mount -a` after every fstab edit, using `nofail,x-systemd.device-timeout=10s` on non-critical mounts, and rebooting staging hosts after changes so problems show up before production.

## Common mistakes

- Editing fstab without running `mount -a` to test it
- Leaving the journal non-persistent, so crash logs disappear
- Changing sysctl values with `-w` and forgetting to persist them
- Updating the kernel without keeping a previous one to fall back to
- Panicking and rebooting repeatedly instead of reading the previous boot's log

```quiz
Q: What starts after the kernel finishes initialising?
- The bootloader
+ systemd as PID 1
- Firmware checks
- The login prompt directly
> The kernel starts PID 1, which brings up mounts and services.

Q: Which command shows errors from the previous boot?
- dmesg -c
+ journalctl -b -1 -p err
- systemd-analyze blame
- uname -r
> -b -1 selects the previous boot in the journal.

Q: How do you make a sysctl setting survive reboot?
- Run sysctl -w once
+ Add it to a file in /etc/sysctl.d/ and run sysctl --system
- Restart the network
- Edit /proc directly
> sysctl -w is temporary; files in sysctl.d are applied at boot.

Q: What is a safe habit after editing /etc/fstab?
- Reboot immediately
+ Run mount -a to confirm every entry mounts
- Delete the old entry
- Change file permissions
> mount -a surfaces errors while you still have a working session.
```

```cards
Boot stages in order? :: Firmware, bootloader, kernel with initramfs, systemd
How to see the last boot's errors? :: journalctl -b -1 -p err
What does nofail do in fstab? :: Lets boot continue if that filesystem is missing
Where to persist kernel parameters? :: /etc/sysctl.d/*.conf
```
