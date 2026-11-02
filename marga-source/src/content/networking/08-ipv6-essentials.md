---
title: IPv6 essentials for engineers
minutes: 14
summary: Read and write IPv6 addresses, understand prefixes, SLAAC, neighbour discovery and dual-stack operation, and avoid the common mistakes in firewalls, DNS and cloud networks.
---

IPv4 addresses ran out years ago. Mobile networks, large cloud providers and many ISPs now carry a large share of traffic over IPv6, and some environments are IPv6-only. You do not need to become an expert, but you must be able to read an address, know what a /64 is, and notice when something works over IPv4 but breaks over IPv6.

## What you will learn

- The structure of an IPv6 address and how to shorten it
- Address types: global, unique local, link-local, multicast
- How hosts get addresses: SLAAC, DHCPv6 and static
- Neighbour discovery instead of ARP
- Dual stack and the mistakes it hides

## Reading addresses

An IPv6 address is 128 bits written as eight groups of four hexadecimal digits: `2001:0db8:0000:0000:0000:0000:0000:0001`. Two rules shorten it: drop leading zeros in a group, and replace one run of all-zero groups with `::`. That gives `2001:db8::1`. The `::` may appear only once.

| Prefix | Meaning |
|--------|---------|
| `2000::/3` | Global unicast, routable on the internet |
| `fd00::/8` | Unique local, like private IPv4 ranges |
| `fe80::/10` | Link-local, valid only on one network segment |
| `ff00::/8` | Multicast |
| `::1/128` | Loopback |

A normal subnet is a `/64`: 64 bits of network and 64 bits of host. A site is often given a `/48` or `/56`, which holds 65,536 or 256 subnets. Do not try to save addresses by using smaller subnets; many features, including SLAAC, assume `/64`.

## How hosts get an address

- **SLAAC** (stateless autoconfiguration): the router announces the prefix in a router advertisement, and the host builds its own address from it. No server keeps a lease.
- **DHCPv6**: a server hands out addresses and options, closer to IPv4 behaviour.
- **Static**: set by hand or by automation for servers.

Every interface also has a link-local `fe80::` address, which is used for neighbour discovery and as the next hop in routing.

```console
$ ip -6 addr show dev eth0
inet6 2001:db8:10:1::25/64 scope global
inet6 fe80::a00:27ff:fe4e:66a1/64 scope link
$ ip -6 route
default via fe80::1 dev eth0
$ ping -6 -c1 2001:db8:10:1::1
$ curl -6 -sv https://example.com/ -o /dev/null
```

## Neighbour discovery

IPv6 has no ARP. Hosts use ICMPv6 messages (neighbour solicitation and advertisement, router solicitation and advertisement) to find each other and routers. This means you must not block ICMPv6 wholesale: if you do, hosts cannot find their router or neighbours, and path MTU discovery fails.

## Dual stack

Most networks run IPv4 and IPv6 side by side. A client with both prefers IPv6 (and tries IPv4 quickly if it fails, "happy eyeballs"). Common mistakes:

- An AAAA DNS record exists but the server or firewall does not accept IPv6 connections.
- Security groups or firewall rules were written only for IPv4.
- Logs and allow lists store only IPv4 addresses, and IPv6 clients appear as something else or fail validation.
- Applications compare or parse addresses as text and break on colons.

```predict
Q: Which of these is a valid shortened form of 2001:0db8:0000:0000:0000:0000:0000:0001?
???
2001:db8::1
> Drop leading zeros and replace the longest run of zero groups with ::, once.
```

## Incident: slow site for some users

> **Incident:** A site loads in two seconds for most users and takes more than thirty seconds for users on one mobile network.

```console
$ dig +short AAAA shop.example.com
2001:db8:50::10
$ curl -6 -m 10 -sv https://shop.example.com/ -o /dev/null
* connect to 2001:db8:50::10 port 443 failed: Connection timed out
```

The team had added an AAAA record during a migration, but the new load balancer's firewall allowed only IPv4. Clients on IPv6-first networks waited for the connection to time out before falling back. The fix was to open IPv6 on the firewall, test with `curl -6` in the deploy checklist, and monitor from IPv6-only vantage points.

## Common mistakes

- Blocking all ICMPv6
- IPv6 records without IPv6 firewall rules
- Using subnets smaller than /64
- Logging or validating addresses as IPv4 only

```quiz
Q: What is the usual size of an IPv6 subnet?
- /24 :: That is a common IPv4 size.
+ /64
- /32 :: Typically an ISP allocation.
- /128 :: A single address.
> /64 is expected by SLAAC and most tools.

Q: Which prefix is link-local?
- 2001:db8::/32 :: That is documentation space.
+ fe80::/10
- ff00::/8 :: That is multicast.
- fd00::/8 :: That is unique local.
> Link-local addresses work only on one segment.

Q: Why should you not block ICMPv6 completely?
+ Neighbour discovery and path MTU discovery depend on it
- It carries web traffic :: HTTP uses TCP.
- It is required for DNS names :: DNS uses UDP and TCP.
- It is only for ping :: It does much more.
> Without it hosts cannot find routers or neighbours.

Q: A site is slow only for IPv6-first users after adding an AAAA record. What is the likely cause?
- The CPU is too slow :: That would affect all users.
+ The IPv6 path is blocked or not served, so clients wait before falling back
- The certificate expired :: That would give an error, not a delay.
- DNS is down :: Resolution worked.
> Check the firewall and the listener for IPv6.
```

```cards
How many bits in an IPv6 address? :: 128
What replaces ARP? :: Neighbour discovery (ICMPv6)
Usual subnet size? :: /64
What does :: mean? :: One run of zero groups, used once
Command to test IPv6 only? :: ping -6 or curl -6
```
