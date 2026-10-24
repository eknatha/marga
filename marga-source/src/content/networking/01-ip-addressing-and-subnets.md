---
title: IP addressing and subnets
minutes: 15
summary: Read CIDR notation, split networks into subnets, and avoid the overlapping-range mistake that blocks cloud peering.
---

Your team wants to connect two cloud networks so a service in one can call a database in the other. The connection request fails with "overlapping address space". Nobody on the team can say why, because nobody has looked at the subnet ranges since the networks were created. A little subnet arithmetic prevents this class of problem entirely.

## What you will learn

- How IPv4 addresses and masks work
- How to read CIDR notation such as `10.0.1.0/24`
- How to split a network into smaller subnets
- How routes and gateways move packets between subnets

## Addresses and CIDR

An IPv4 address is 32 bits, written as four decimal numbers (`10.0.1.25`). A **network mask** says how many leading bits identify the network and how many identify the host. **CIDR notation** writes that as a slash and a number: `10.0.1.0/24` means the first 24 bits are the network.

| CIDR | Addresses | Typical use |
|------|-----------|-------------|
| `/32` | 1 | A single host |
| `/28` | 16 | A tiny subnet |
| `/24` | 256 | A common subnet size |
| `/20` | 4,096 | A larger subnet |
| `/16` | 65,536 | A whole VPC or VNet |

The number of addresses is `2^(32 - prefix)`. Smaller prefix number means a bigger network. In a classic LAN, the first address is the network address and the last is the broadcast address, so a `/24` has 254 usable hosts. Cloud providers reserve a few addresses in each subnet as well, so check your provider's rule before you plan tight ranges.

## Private ranges

Three ranges are reserved for private networks and are not routed on the public internet:

| Range | CIDR |
|-------|------|
| `10.0.0.0` to `10.255.255.255` | `10.0.0.0/8` |
| `172.16.0.0` to `172.31.255.255` | `172.16.0.0/12` |
| `192.168.0.0` to `192.168.255.255` | `192.168.0.0/16` |

Note that `172.20.1.5` is private but `172.32.1.5` is public. Home routers use `192.168.x.x`, so a corporate VPN that also uses `192.168.1.0/24` will clash with your home network.

## Splitting a network

To divide `10.0.1.0/24` into four equal subnets, borrow two bits: each is a `/26` with 64 addresses. Count in steps of 64:

| Subnet | Range |
|--------|-------|
| `10.0.1.0/26` | `10.0.1.0` to `10.0.1.63` |
| `10.0.1.64/26` | `10.0.1.64` to `10.0.1.127` |
| `10.0.1.128/26` | `10.0.1.128` to `10.0.1.191` |
| `10.0.1.192/26` | `10.0.1.192` to `10.0.1.255` |

Two addresses are in the same subnet if they share the same network bits. `10.0.1.70` and `10.0.1.100` are both in `10.0.1.64/26`, while `10.0.1.30` is not.

The `ipcalc` tool (or Python's `ipaddress` module) checks your arithmetic:

```console
$ python3 -c "import ipaddress; n=ipaddress.ip_network('10.0.1.0/24'); print([str(s) for s in n.subnets(new_prefix=26)])"
['10.0.1.0/26', '10.0.1.64/26', '10.0.1.128/26', '10.0.1.192/26']
```

## Routes and gateways

A host sends a packet directly when the destination is in its own subnet. Otherwise it sends the packet to its **default gateway**, a router that knows the way onward.

```console
$ ip addr show eth0 | grep 'inet '
    inet 10.20.0.15/24 brd 10.20.0.255 scope global eth0
$ ip route
default via 10.20.0.1 dev eth0
10.20.0.0/24 dev eth0 proto kernel scope link src 10.20.0.15
$ ip route get 10.20.4.9
10.20.4.9 via 10.20.0.1 dev eth0 src 10.20.0.15
```

This is sample output. `ip route get` tells you exactly which path the kernel will use for a destination, which settles most "why does it go that way" questions. Here `10.20.4.9` is outside `10.20.0.0/24`, so the packet goes to the gateway `10.20.0.1`.

## Incident: peering fails because the ranges overlap

> **Incident:** Team A built a network on `10.0.0.0/16`. Team B built theirs on `10.0.0.0/16` too, because it was the default in the console. Peering is rejected.

Routing works by matching a destination to exactly one network. If both sides contain `10.0.4.20`, a router cannot know which is meant. Compare the ranges before connecting:

```console
$ python3 -c "import ipaddress as i; print(i.ip_network('10.0.0.0/16').overlaps(i.ip_network('10.0.0.0/16')))"
True
```

There is no clean fix for an existing overlap short of re-addressing one network, which usually means rebuilding everything inside it, or adding address translation, which is complex and brittle. The prevention is cheap: **keep one shared plan of address ranges** for every network, VPN and office, and allocate from it. For example, give each environment its own `/16`: `10.10.0.0/16` for production, `10.20.0.0/16` for staging, `10.30.0.0/16` for shared services.

## Common mistakes

- Using the default range for every new network
- Making subnets too small to grow, or a `/16` for a handful of hosts
- Forgetting that cloud providers reserve addresses in each subnet
- Confusing the subnet mask with the gateway address

```quiz
Q: How many addresses are in a /26 network?
- 26
- 32
+ 64
- 256
> The count is 2^(32-26) = 2^6 = 64 addresses.

Q: Which of these addresses is private?
- 172.32.0.10
+ 172.20.1.5
- 11.0.0.5
- 192.169.1.1
> The 172.16.0.0/12 block covers 172.16.0.0 to 172.31.255.255, so 172.20.1.5 is private. 172.32.x.x is public.

Q: A host at 10.20.0.15/24 sends a packet to 10.20.4.9. Where does it go first?
- Directly to 10.20.4.9
- To the broadcast address
+ To its default gateway, because the destination is outside its own subnet
- To the DNS server
> Destinations outside the local subnet are handed to the default gateway.

Q: Why does peering two networks with the same 10.0.0.0/16 range fail?
- Private ranges cannot be peered
+ The same address could exist on both sides, so routing cannot choose where to send traffic
- The ranges are too large
- Peering requires public IP addresses
> Routing needs each destination address to map to exactly one network, so overlapping ranges are rejected.
```

```cards
How many addresses in a /24? :: 256 (254 usable in a classic LAN)
The three private IPv4 ranges? :: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16
What is a default gateway? :: The router a host uses for destinations outside its own subnet
Command to see the path the kernel will use for an address? :: ip route get ADDRESS
```
