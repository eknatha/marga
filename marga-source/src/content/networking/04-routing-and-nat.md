---
title: Routing, gateways and NAT
minutes: 16
summary: Read routing tables, follow a packet across subnets, understand default gateways, source and destination NAT, and debug asymmetric or missing routes.
---

Addressing says who a host is. **Routing** decides where its packets go next. Almost every "cannot reach X" problem across subnets, VPNs or clouds comes down to a missing route, a wrong gateway or a NAT surprise.

## What you will learn

- How a host chooses a route using longest-prefix match
- Reading and changing routes with `ip route`
- Static versus dynamic routing at a high level
- Source NAT, destination NAT and connection tracking

## The host routing table

When a host sends a packet it asks one question: do I have a route for this destination? The most specific matching route wins, which is called **longest prefix match**.

```console
$ ip route show
default via 10.0.1.1 dev eth0 proto dhcp metric 100
10.0.1.0/24 dev eth0 proto kernel scope link src 10.0.1.25
172.16.0.0/16 via 10.0.1.254 dev eth0
$ ip route get 172.16.4.9
172.16.4.9 via 10.0.1.254 dev eth0 src 10.0.1.25
$ ip route get 8.8.8.8
8.8.8.8 via 10.0.1.1 dev eth0 src 10.0.1.25
```

Destinations on the local subnet are sent directly. Everything else goes to a **gateway**, a router that forwards it on. The `default` route (0.0.0.0/0) catches traffic with no more specific match. `ip route get` is the best debugging tool: it shows the exact decision the kernel will make for one address.

## Changing routes

```console
$ sudo ip route add 192.168.50.0/24 via 10.0.1.254
$ sudo ip route del 192.168.50.0/24
$ sudo ip route replace default via 10.0.1.1 dev eth0
$ ip -br addr
$ ip neigh show
```

Changes made with `ip route` vanish at reboot. Persist them through your distribution's network configuration (netplan, NetworkManager, systemd-networkd) or, in the cloud, through route tables attached to subnets.

## Routers and forwarding

A Linux host becomes a router when forwarding is enabled and it has interfaces in more than one network:

```console
$ sysctl net.ipv4.ip_forward
$ sudo sysctl -w net.ipv4.ip_forward=1
$ traceroute -n 172.16.4.9
$ mtr -rn -c 10 172.16.4.9
```

Within one organisation, routers learn routes from each other with protocols such as OSPF, and between organisations with BGP. In the cloud you rarely run these yourself; you write **route tables**: entries like "10.2.0.0/16 goes to the peering connection" or "0.0.0.0/0 goes to the NAT gateway".

## NAT

**Network Address Translation** rewrites addresses as packets pass through a device. Private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) are not routable on the internet, so private hosts reach the internet through **source NAT** (also called masquerade), which replaces their address with the gateway's public one and remembers the mapping in a connection-tracking table.

```console
$ sudo iptables -t nat -A POSTROUTING -s 10.0.0.0/16 -o eth0 -j MASQUERADE
$ sudo nft list ruleset | head -20
$ sudo conntrack -L | head -5
$ sudo conntrack -C
```

**Destination NAT** (port forwarding) does the reverse: traffic arriving at a public address and port is rewritten to a private host. Cloud load balancers and Kubernetes `NodePort` services do this for you.

NAT has consequences. Inbound connections cannot start unless a rule maps them. The tracking table has a finite size, so a host making huge numbers of connections can exhaust it. Many clients behind one NAT address look like a single client to rate limiters.

## Incident: the new subnet that cannot reach the internet

> **Incident:** A team creates a private subnet for a new service. Instances there can reach the database but every call to an external API times out. The same code works in the older subnet.

Check what the route table says for an internet destination:

```console
$ ip route get 1.1.1.1
1.1.1.1 via 10.0.9.1 dev eth0 src 10.0.9.14
$ curl -sS -m 5 -o /dev/null -w "%{http_code}\n" https://api.example.com
curl: (28) Connection timed out after 5001 milliseconds
```

The host has a default route to its subnet gateway, so the problem is upstream: the new subnet's cloud route table has no `0.0.0.0/0` entry pointing at the NAT gateway. The old subnets had one. Add the route and re-test. Infrastructure as code prevents this class of error: define a subnet and its route table together in one module.

## Common mistakes

- Forgetting the return path: a route exists one way but not back
- Overlapping CIDR ranges between networks you later want to connect
- Assuming `ip route add` persists across reboots
- Not allowing for NAT when an application reports client addresses
- Debugging with ping alone when ICMP is filtered

```quiz
Q: How does a host choose between several matching routes?
- The first one listed
+ The one with the longest (most specific) prefix
- The one with the lowest metric number only
- Random selection
> Longest prefix match picks the most specific route.

Q: Which command shows the routing decision for one destination?
- ip addr
+ ip route get ADDRESS
- ping -R
- arp -a
> It prints the route, gateway and source address the kernel would use.

Q: What does source NAT (masquerade) do?
- Opens inbound ports
+ Rewrites private source addresses to a public one for outbound traffic
- Encrypts packets
- Blocks traffic
> It lets private hosts share one public address to reach the internet.

Q: Why do overlapping CIDR ranges cause trouble?
+ The router cannot tell which network a destination belongs to when you connect them
- They use more bandwidth
- DNS stops working
- They slow DHCP
> Plan address space so networks can be peered or joined later.
```

```cards
Default route? :: The 0.0.0.0/0 entry used when no more specific route matches
What does ip_forward control? :: Whether a Linux host forwards packets between interfaces
Source NAT versus destination NAT? :: Source NAT rewrites the sender for outbound traffic; destination NAT rewrites the target for inbound traffic
Common cloud cause of no internet from a private subnet? :: The route table lacks a 0.0.0.0/0 route to a NAT gateway
```
