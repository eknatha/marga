---
title: Virtual networking: bridges, VLANs and NAT
minutes: 14
summary: See how guests get network access through bridges, NAT and VLANs, and how to find why a guest has no connectivity.
---

A guest needs a network card, and the card needs somewhere to plug in. The hypervisor provides a virtual switch for that, and the choices you make there decide who can reach the guest and what it can reach.

## What you will learn

- Virtual NICs and the virtual switch
- Bridged, NAT and isolated networks
- VLAN tagging on the host uplink
- SR-IOV and when to skip the virtual switch

## The virtual switch

Each guest has one or more **virtual NICs**, usually virtio. On the host they appear as interfaces such as `vnet3` attached to a **bridge** or a vSwitch. On Linux this is often the `br0` bridge or an Open vSwitch bridge. VMware calls it a vSwitch, and Hyper-V a virtual switch.

```console
$ ip -br link show master br0
eno1      UP    3c:ec:ef:11:22:33
vnet0     UP    fe:54:00:aa:bb:01
vnet1     UP    fe:54:00:aa:bb:02
```

The physical port `eno1` and the guest ports `vnet0` and `vnet1` are on one bridge, so the guests behave like machines plugged into the same switch as the host.

## Network modes

- **Bridged**: guests have addresses on the physical network and are visible to it. Common for servers.
- **NAT**: the host hides guests behind its own address. Guests can go out, but nothing can reach them unless you forward ports. This is libvirt's default `virbr0` network, convenient for desktops and tests.
- **Isolated**: guests can reach each other and the host but not the outside.
- **Routed**: the host routes between a guest network and the physical one without translation.

## VLANs

A **VLAN** splits one physical network into separate broadcast domains using a tag in the Ethernet frame. The switch port to the host is often a **trunk** that carries several VLANs, and the host or hypervisor assigns each guest to one. If the trunk does not allow the tag, or the guest is on the wrong tag, the guest has a link but no connectivity.

```console
$ bridge vlan show
port    vlan-id
eno1    1 PVID Egress Untagged
        20
        30
vnet0   20 PVID Egress Untagged
vnet1   30 PVID Egress Untagged
```

## SR-IOV

**SR-IOV** lets one physical NIC present several virtual functions that are handed directly to guests. It skips the software switch, so latency and CPU use drop. The cost is flexibility: live migration and firewall rules at the host become harder.

## Incident: A new guest with a link and no network

> **Incident:** A guest came up, got no address from DHCP, and the team blamed the DHCP server.

```console
guest$ ip -br addr
ens3   UP   fe80::5054:ff:fe12:3456/64
host$ bridge vlan show dev vnet5
port    vlan-id
vnet5   40 PVID Egress Untagged
host$ bridge vlan show dev eno1
port    vlan-id
eno1    1 PVID Egress Untagged
        20
        30
```

The guest was assigned to VLAN 40, but the uplink `eno1` only carried VLANs 20 and 30. The DHCP server was fine. After the network team added VLAN 40 to the trunk, the guest received an address. Check each hop of the path: guest, vnet port, bridge, uplink, switch.

## Common mistakes

- Putting a guest on a NAT network and then wondering why clients cannot reach it
- Forgetting that a trunk port must allow every VLAN used
- Two guests with the same MAC address after a clone
- Disabling the firewall on the host because a guest could not connect, without checking the VLAN first

```quiz
Q: What does a bridge do for guests?
+ It connects guest virtual NICs and the physical port like a switch
- It encrypts guest traffic :: It does not.
- It gives guests more CPU :: It is a network device.
- It copies disks :: Not related.
> The guests behave as if on the same switch.

Q: Why can a guest on libvirt's default NAT network not be reached from outside?
+ The host hides it behind its address unless ports are forwarded
- NAT disables the NIC :: The NIC works.
- Guests on NAT have no IP :: They have private addresses.
- NAT needs SR-IOV :: It does not.
> NAT allows outbound traffic by default.

Q: A guest has a link but no DHCP address on VLAN 40. What is a likely cause?
+ The uplink trunk does not carry VLAN 40
- The guest has no disk :: Unrelated.
- The CPU is overcommitted :: Not a network cause.
- qcow2 is slow :: Not related.
> VLAN tags must be allowed end to end.

Q: What is the main trade-off of SR-IOV?
+ Lower latency and CPU use, but less flexibility such as live migration
- It needs more memory :: It is not about memory.
- It disables VLANs :: It does not.
- It only works for containers :: It is for VMs.
> The virtual switch is skipped.
```

```cards
Bridge :: software switch joining virtual and physical ports
NAT network :: guests hidden behind the host address
VLAN :: separate broadcast domain using a tag
Trunk :: switch port that carries several VLANs
virtio-net :: paravirtual network card for guests
SR-IOV :: NIC functions handed straight to guests
```
