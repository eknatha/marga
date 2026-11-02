---
title: Kernel modules, sysctl and boot parameters
minutes: 13
summary: Load and inspect kernel modules, tune the running kernel with sysctl, set boot parameters, and read the kernel ring buffer.
---

The kernel is not a single fixed program. Drivers and features can be loaded as modules, behaviour is tuned through thousands of runtime parameters, and some settings can only be given on the boot command line. Engineers who can read and change these safely solve problems that no application setting can touch, such as a connection table that fills up or a driver that misbehaves after an update.

## What you will learn

- List, load and block kernel modules
- Read and change runtime parameters with sysctl
- Persist settings and understand the boot command line
- Read kernel messages with dmesg and journalctl -k

## Modules

A module is a piece of kernel code loaded on demand, such as a filesystem, a network driver or the module that implements overlay mounts for containers.

```bash
lsmod | head
modinfo overlay
sudo modprobe overlay
sudo modprobe -r overlay
lsmod | grep -E "overlay|br_netfilter"
```

`lsmod` lists what is loaded, `modinfo` shows the module description and parameters, and `modprobe` loads a module with its dependencies (unlike `insmod`, which loads one file). To load a module at every boot, list it in a file under `/etc/modules-load.d/`. To prevent one from loading, add `blacklist name` or `install name /bin/false` under `/etc/modprobe.d/`. Remember that modules run with full kernel privileges: load only what you trust. With Secure Boot, modules must be signed.

## sysctl: runtime tuning

Kernel parameters appear as files under `/proc/sys` and are read and written with `sysctl`.

```bash
sysctl net.ipv4.ip_forward
sudo sysctl -w net.ipv4.ip_forward=1
sysctl -a 2>/dev/null | grep -c .
sudo sysctl --system
```

`-w` changes the running kernel only, and the change disappears at reboot. To keep it, put the line in a file such as `/etc/sysctl.d/90-shop.conf` and run `sysctl --system`. Parameters you will meet often: `net.ipv4.ip_forward` (routing and container networking), `vm.swappiness` (how readily memory is swapped), `vm.max_map_count` (needed by some search engines), `fs.file-max` and `fs.inotify.max_user_watches` (many files or watchers), `net.core.somaxconn` (listen queue length) and `net.ipv4.tcp_*` settings. Change one at a time, record the old value, and measure before and after.

## Boot parameters

Some settings are read once, at boot, from the kernel command line. Look at the current one:

```bash
cat /proc/cmdline
BOOT_IMAGE=/vmlinuz-6.8.0 root=UUID=7a1c... ro quiet splash console=ttyS0 transparent_hugepage=madvise
```

Typical parameters are `root=` (the root filesystem), `console=` (where messages go), `quiet`, `nomodeset`, `systemd.unit=rescue.target` (boot into rescue mode), `init=/bin/bash` (emergency shell) and `mem=`. On most distributions you change defaults in `/etc/default/grub` (the `GRUB_CMDLINE_LINUX` line) and regenerate the config with `update-grub` or `grub2-mkconfig`. For a one-time test, press `e` in the boot menu and edit the line; nothing is saved. Keep a known good entry available before changing anything.

## Kernel messages

```bash
dmesg -T --level=err,warn | tail
journalctl -k -b -1 | tail -50      # kernel messages of the previous boot
journalctl -k -p err -b
```

The kernel keeps a ring buffer of messages: hardware detection, driver errors, filesystem problems, out-of-memory kills and network warnings such as `nf_conntrack: table full, dropping packet`. Read it first when behaviour looks impossible from user space. `-T` prints readable times; the previous boot's messages require persistent journals. Messages from before a crash are often the only evidence, so make sure `/var/log/journal` exists on servers.

```predict
Q: You run sysctl -w to raise net.core.somaxconn and the problem is solved. Next week, after a reboot, it returns. Why?
???
The change applied only to the running kernel. It must be saved in /etc/sysctl.d/ and loaded with sysctl --system.
> sysctl -w is temporary.
```

## Incident: Packets dropped, nothing in the application logs

> **Incident:** A gateway dropped new connections during peak hours while CPU was low.

```console
$ dmesg -T | tail -3
[Tue Jan  6 18:03:11 2026] nf_conntrack: nf_conntrack: table full, dropping packet
[Tue Jan  6 18:03:12 2026] nf_conntrack: nf_conntrack: table full, dropping packet
$ sysctl net.netfilter.nf_conntrack_max net.netfilter.nf_conntrack_count
net.netfilter.nf_conntrack_max = 65536
net.netfilter.nf_conntrack_count = 65531
```

The connection tracking table was full, so the kernel dropped new connections before the application saw them. The team raised nf_conntrack_max in a file under /etc/sysctl.d/ after checking memory use, shortened some timeouts, and added an alert on the count to max ratio. The lesson: some limits exist only in the kernel, and dmesg is where they speak.

## Common mistakes

- Using sysctl -w and forgetting to persist it
- Changing many parameters at once
- Editing the boot command line without a fallback entry
- Loading unsigned or unknown modules on production servers

```quiz
Q: How do you load a module with its dependencies?
+ modprobe
- insmod :: Loads a single file without dependencies.
- lsmod :: Lists loaded modules.
- modinfo :: Shows information.
> modprobe resolves dependencies.

Q: Where do you persist a sysctl setting?
+ A file under /etc/sysctl.d/ followed by sysctl --system
- Only sysctl -w :: Lost at reboot.
- /tmp :: Cleared.
- ~/.bashrc :: Not read by the kernel.
> Persist and reload; the lesson section explains why.

Q: How do you see the boot parameters in use?
+ cat /proc/cmdline
- lsmod :: Lists modules.
- uname -a :: Shows version.
- df -h :: Shows disks.
> The running command line.

Q: Where do you find kernel warnings such as a full conntrack table?
+ dmesg or journalctl -k
- /etc/hosts :: Static names.
- crontab -l :: Scheduled jobs.
- ps aux :: Processes.
> Kernel ring buffer; the lesson section explains why.
```

```cards
List modules :: lsmod
Load with deps :: modprobe NAME
Read a setting :: sysctl KEY
Persist :: /etc/sysctl.d/*.conf + sysctl --system
Boot line :: cat /proc/cmdline
Kernel messages :: dmesg -T / journalctl -k
```
