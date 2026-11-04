---
title: Datacenter networking: leaf-spine and bonding
minutes: 14
summary: See how racks connect with top-of-rack switches in a leaf-spine fabric, and how bonding, VLANs and a separate management network keep servers reachable.
---

A server is only useful when it can reach other servers. In a datacentre, the way racks connect decides how fast and how reliably they can talk.

## What you will learn

- Top-of-rack switches and the leaf-spine layout
- Why east-west traffic changed the design
- Bonding and LACP for redundant links
- VLANs and the separate management network
- Cabling mistakes that cause hard-to-find faults

## Top-of-rack and leaf-spine

Each rack has a **top-of-rack (ToR) switch**, which connects the servers in that rack. In a **leaf-spine** design the ToR switches are the **leaves**, and every leaf connects to every **spine** switch.

- Any two servers are at most three switch hops apart (leaf, spine, leaf).
- More capacity means adding spines. More racks mean adding leaves.
- Traffic is spread over many equal-cost paths with **ECMP**.

This suits modern workloads, where most traffic is **east-west** (server to server inside the datacentre) and not north-south (in and out).

## Bonding and LACP

A server with two NIC ports can join them into one logical link, called a **bond** (Linux) or a team. This gives redundancy and, with the right mode, more bandwidth.

| Mode | What it does | Switch support needed |
|---|---|---|
| active-backup | One link used, the other waits | None |
| 802.3ad (LACP) | Both links used, negotiated | Switch must run LACP |
| balance-rr | Packets spread round-robin | Often causes reordering |

LACP needs both sides to agree. If the server says 802.3ad but the switch ports are not in a port channel, the link will not form properly.

```console
$ cat /proc/net/bonding/bond0 | grep -E "Mode|Slave Interface|MII Status"
Bonding Mode: IEEE 802.3ad Dynamic link aggregation
MII Status: up
Slave Interface: eno1
MII Status: up
Slave Interface: eno2
MII Status: down
```

One slave is down: either the cable, the optic or the switch port is at fault.

## VLANs and the management network

A **VLAN** splits one physical network into separate logical ones. A common set: production, storage, a provisioning network for PXE, and a **management** network for the BMCs. Keep management traffic apart from production traffic so a problem or an attacker on one cannot reach the other.

## Cabling

Many faults are physical: a bent fibre, a dirty connector, a wrong optic, a cable plugged into the wrong port. Label both ends and keep a record of which server port goes to which switch port. Check counters with `ip -s link` for errors and drops.

```wrongpath
@goal Add bandwidth to a database server by joining its two NIC ports.
@wrong
# set the bond to round-robin on the server only
echo "BONDING_OPTS='mode=balance-rr miimon=100'" >> /etc/sysconfig/network-scripts/ifcfg-bond0
@result
$ iperf3 -c 10.20.2.10
[  5]   0.00-10.00  sec  3.2 GBytes  2.75 Gbits/sec  41200 retr
# many retransmits, and the throughput is worse than a single link
@why Round-robin sends packets of one connection down both links. They arrive out of order, so TCP slows down and retransmits. The switch also does not know about the bond, so it learns the MAC on two ports and flaps.
@right
# server side
BONDING_OPTS='mode=802.3ad miimon=100 lacp_rate=fast xmit_hash_policy=layer3+4'
# switch side: put both ports in one LACP port channel, same VLANs
@after With LACP both ends agree. Each flow stays on one link, and many flows spread across both.
```

## Incident: A server that dropped off every ten minutes

> **Incident:** A server lost network for a few seconds, over and over.

```console
$ dmesg | grep -i bond | tail -3
bond0: link status definitely down for interface eno2, disabling it
bond0: link status definitely up for interface eno2, 10000 Mbps full duplex
```

The cable was seated badly in one port, so the link bounced. The bond kept the server up, but the switch logged flapping. Replacing the cable fixed it. The lesson: bonding hides physical faults, so alert on link changes, not only on the server being down.

## Common mistakes

- Configuring LACP on only one side
- Putting management and production traffic on one network
- Not labelling cables
- Hiding link flaps because the bond keeps traffic flowing

```quiz
Q: In a leaf-spine fabric, how many switch hops are there between servers in different racks?
+ Three: leaf, spine, leaf
- One :: Different racks use different leaves.
- Six :: Too many.
- It varies wildly :: Leaf-spine keeps it predictable.
> Every leaf connects to every spine, so the path is leaf, spine, leaf.

Q: Which bonding mode needs the switch to be configured to match?
+ 802.3ad (LACP)
- active-backup :: It works without switch changes.
- None need a switch :: LACP does.
- All of them :: No.
> LACP negotiates between server and switch ports.

Q: Why keep a separate management network?
+ So BMCs and admin access are isolated from production traffic and attackers
- To make servers faster :: No.
- To reduce cable cost :: No.
- Because VLANs are required by law :: No.
> Isolation limits the damage of a problem on either side.

Q: A bond keeps a server online while a cable flaps. Why can that be a problem?
+ It hides the physical fault unless you alert on link changes
- It makes the server slower forever :: No.
- It breaks DNS :: No.
- It disables the BMC :: No.
> Redundancy can mask a fault until the second link fails.
```

```cards
Leaf-spine :: Switch design where every leaf connects to every spine
ToR switch :: Switch at the top of a rack
LACP :: Standard for joining links into one
Bond :: Linux name for joined network links
East-west traffic :: Traffic between servers inside the datacentre
ECMP :: Spreading traffic across equal paths
```
