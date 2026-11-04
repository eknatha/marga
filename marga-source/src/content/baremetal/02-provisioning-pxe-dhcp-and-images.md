---
title: Provisioning: PXE, DHCP and images
minutes: 14
summary: Follow a new server from power-on to a running operating system with PXE, DHCP, TFTP and an automated install, and learn why each step can fail.
---

A new server arrives with empty disks. Nobody wants to install an operating system on a hundred machines by hand. Provisioning means the machine installs itself over the network, the same way every time.

## What you will learn

- The boot chain: DHCP, TFTP or HTTP, a boot loader, an installer
- What a kickstart, preseed or cloud-init file does
- Image based provisioning compared with installing from packages
- Tools that manage the process: MAAS, Ironic and Foreman

## The boot chain

1. The server powers on and its network card sends a **DHCP** request. The BIOS or UEFI was set to try the network first.
2. The DHCP server answers with an IP address, plus two extra pieces of information: `next-server` (where the boot files are) and `filename` (which file to load).
3. The server fetches the boot loader (for example `pxelinux.0` or `grubx64.efi`) over **TFTP**. Modern setups chain to **iPXE**, which can use HTTP and is much faster.
4. The boot loader loads a kernel and an initial ramdisk and starts an installer.
5. The installer reads an **answer file** and installs without asking questions, then reboots from disk.

```console
$ sudo journalctl -u dnsmasq -n 4
dnsmasq-dhcp: DHCPDISCOVER(eth0) 3c:ec:ef:12:34:56
dnsmasq-dhcp: DHCPOFFER(eth0) 10.20.1.77 3c:ec:ef:12:34:56
dnsmasq-tftp: sent /srv/tftp/grubx64.efi to 10.20.1.77
dnsmasq-tftp: file /srv/tftp/grub.cfg-3c:ec:ef:12:34:56 not found
```

The last line is normal: the loader first looks for a config file named after its own MAC address, then falls back to a default.

## The answer file

- **Kickstart** (Red Hat family), **preseed** (Debian) and **autoinstall** (Ubuntu) describe disks, packages, users and network.
- **cloud-init** runs on first boot and sets the hostname, keys and extra setup.

A good rule: the installer makes the machine generic, and configuration management (Ansible, Puppet) makes it specific. That way, rebuilding is safe and repeatable.

## Images instead of installs

Installing packages on every machine is slow and each one drifts. **Image based** provisioning writes a prepared disk image to the machine, then lets cloud-init personalise it. It is faster and every node starts identical. OpenStack Ironic and MAAS both work this way.

## Tools

- **MAAS** (Canonical) discovers machines, controls power through the BMC and deploys images.
- **OpenStack Ironic** makes bare metal servers look like cloud instances.
- **Foreman** with Katello manages Red Hat style installs and patching.

All of them rest on the same chain, so when one fails you debug DHCP, then TFTP or HTTP, then the loader, then the installer.

```wrongpath
@goal A new server PXE boots but never reaches the installer. It shows "No bootable device".
@wrong
# reinstall the operating system from a USB stick in the datacentre
# and skip finding out why PXE failed
@result
# works once, but the next ten servers fail the same way
# the DHCP config still has the wrong next-server
@why Installing by hand hides the fault. The cause is in the DHCP answer, which every other new server also receives. Fixing one machine leaves the process broken.
@right
sudo journalctl -u dnsmasq -n 20
grep -E "next-server|filename|dhcp-boot" /etc/dnsmasq.conf
sudo systemctl restart dnsmasq
@after Watch the DHCP log while the server boots. If there is an offer but no TFTP transfer, the next-server address or the file name is wrong.
```

## Incident: Every new node booted into a reinstall

> **Incident:** After an upgrade, nodes that were already in service rebooted into the installer and wiped themselves.

The boot order on those servers was network first. Normally the PXE server answered only unknown machines. After the change, it answered every machine, so a routine reboot ran the installer again. The fix was to answer only machines marked "to be built", and to set the disk first in the boot order once a machine is deployed.

## Common mistakes

- Leaving network boot first on machines in service
- Putting settings inside the install image instead of in cloud-init or configuration management
- Having no DHCP log to read when PXE fails
- Running a single provisioning server that is itself unavailable when you need it

```quiz
Q: Which two DHCP options tell a PXE client where to boot from?
+ next-server and the boot file name
- hostname and domain :: Not boot related.
- gateway and DNS :: They give network settings, not a boot file.
- lease time and netmask :: Not boot related.
> The DHCP answer points the client at the server and the file to load.

Q: Why is image based provisioning popular?
+ It is faster and every node starts identical
- It needs no network :: It still uses the network.
- It removes the need for a BMC :: No.
- It makes disks bigger :: No.
> A prepared image avoids slow package installs and drift.

Q: PXE shows an offer in the DHCP log but no TFTP transfer. What do you check?
+ The next-server address and boot file name
- The monitor cable :: Not relevant.
- The DNS TTL :: Not relevant.
- The SSL certificate :: Not relevant.
> If the client receives an offer but no file, it is being pointed at the wrong place.

Q: What should a deployed server's boot order be?
+ Disk first, with network boot only for rebuilds
- Network first always :: A reboot could reinstall it.
- USB first :: Not sensible.
- It does not matter :: It matters a great deal.
> Network first on machines in service risks a reinstall on reboot.
```

```cards
PXE :: Boot a server from the network
TFTP :: Simple protocol used to fetch boot files
iPXE :: Network boot loader that can use HTTP
Kickstart :: Answer file for automated Red Hat style installs
cloud-init :: First boot setup tool
Ironic :: OpenStack service for bare metal
```
