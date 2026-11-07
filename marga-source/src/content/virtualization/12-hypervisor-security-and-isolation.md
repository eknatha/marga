---
title: Hypervisor security and isolation
minutes: 12
summary: Harden hypervisors and guests: patch quickly, limit management access, isolate networks and storage, and plan for guest escape.
---

The hypervisor is the most privileged software in the stack. If a guest can reach or break it, the boundary between tenants disappears, so hardening it is part of daily operations.

## What you will learn

- Reducing the attack surface of the host
- Isolating management, storage and guest networks
- Confinement and device emulation risks
- Patching, mitigations and trust separation

## Minimal host

Install only what the hypervisor needs. Disable unused services and emulated devices in guests, such as floppy or legacy USB controllers, since device emulation code has historically contained escape bugs. Keep the host operating system, QEMU and firmware patched on a defined schedule.

## Network separation

```text
management network   : hypervisor admin, BMC       (jump host only)
storage network      : NFS, iSCSI, Ceph traffic     (hypervisors and storage only)
migration network    : live migration traffic       (hypervisors only)
guest networks       : VLANs per tenant or tier     (no route to the above)
```

Guests must never reach management or storage networks. Enforce this with VLANs, firewall rules and no routes. Protect live migration traffic with encryption if it crosses shared links.

## Confinement

```bash
ps -eZ | grep qemu                      # SELinux labels per VM (sVirt)
virsh dumpxml web-01 | grep -A2 seclabel
```

**sVirt** or AppArmor profiles give each VM process its own label, so a compromised QEMU process cannot read other VMs' disks. Run QEMU as an unprivileged user.

## Access and data

Restrict who can run `virsh` or use the management console, require strong authentication and log every action. Treat disk images and snapshots as sensitive data, because anyone who can copy an image has the machine's data. Encrypt storage where required.

## Mitigations and trust

Follow vendor guidance on CPU side-channel mitigations and understand their performance cost. Do not run high-risk, untrusted workloads on the same hosts as sensitive ones. Use separate clusters or dedicated hosts for different trust levels.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Hypervisor security and isolation fits together
node: n1 | Minimal host | 0 | 0 | Install only what the hypervisor needs. Disable unused services and emulated devices in guests, such as floppy or legacy USB controllers, since device emulation code has... | Management interfaces reachable from guests. | process
node: n2 | Network separation | 1 | 1 | Guests must never reach management or storage networks. | Unpatched hypervisors. | edge
node: n3 | Confinement | 2 | 0 | sVirt or AppArmor profiles give each VM process its own label, so a compromised QEMU process cannot read other VMs' disks. | Running QEMU as root. | process
node: n4 | Access and data | 3 | 1 | Restrict who can run virsh or use the management console, require strong authentication and log every action. | Mixing untrusted and sensitive workloads on one host. | security
node: n5 | Mitigations and trust | 4 | 0 | Follow vendor guidance on CPU side-channel mitigations and understand their performance cost. | Do not run high-risk, untrusted workloads on the same hosts as sensitive ones. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: The management port in the guest VLAN

> **Incident:** A guest could reach the hypervisor management interface.

```console
$ nmap -p 16509,22 10.60.0.1
22/tcp    open  ssh
16509/tcp open  libvirt
route to management network present
```

A flat network let guests see the hypervisor's management addresses. Nothing had been exploited, but the exposure was real. The team put management on a separate VLAN, removed routes from guest networks and added a recurring scan from a test guest that must fail.

## Common mistakes

- Management interfaces reachable from guests
- Running QEMU as root
- Unpatched hypervisors
- Mixing untrusted and sensitive workloads on one host

```quiz
Q: What does sVirt do?
+ Confines each VM process with its own label
- Speeds disks :: No.
- Compresses images :: No.
- Creates VLANs :: No.
> Limits a compromised VM.

Q: What must guests never reach?
+ Management and storage networks
- The internet :: No.
- Each other always :: No.
- Their own disk :: No.
> Keep the control plane isolated.

Q: Why treat images as sensitive?
+ They contain the machine's data
- They are large :: No.
- They are fast :: No.
- They are old :: No.
> Copying an image copies data.

Q: How handle mixed trust workloads?
+ Separate hosts or clusters
- One big host :: No.
- No separation :: No.
- Public networks :: No.
> Defense in depth. The lesson section above explains why.
```

```cards
sVirt :: SELinux-based isolation for virtual machines
Management network :: Isolated network for administration
Guest escape :: Attack from a VM to the host
Attack surface :: Everything an attacker could reach
```
