---
title: DHCP, ARP and the local network
minutes: 12
summary: Understand how a host gets an address, finds neighbours on its own network, and what fails when either step breaks.
---

A laptop connects to the network and shows an address starting with 169.254. A server answers pings from some machines and not others, because two machines claim the same address. Both problems live on the local network, below DNS and routing, and both are quick to diagnose once you know the two small protocols involved.

## What you will learn

- How DHCP leases an address, a gateway and a DNS server
- What the 169.254 address means
- How ARP maps an IP address to a hardware address
- Spotting duplicate addresses and stale ARP entries

## DHCP in four steps

A new host has no address, so it asks for one by broadcast. The exchange is called DORA:

1. **Discover**: the client broadcasts "is there a DHCP server?".
2. **Offer**: a server proposes an address, a lease time, a gateway and DNS servers.
3. **Request**: the client asks for that address.
4. **Acknowledge**: the server confirms, and the lease starts.

Halfway through the lease the client tries to renew. If it never gets an answer, many systems assign themselves a **link-local** address in `169.254.0.0/16`. Seeing one means "DHCP did not answer", not "the network is broken everywhere".

```console
$ ip -br addr
eth0   UP   10.0.3.27/24
$ journalctl -u systemd-networkd | grep -i dhcp | tail -3
$ sudo dhclient -v eth0
```

## Reservations and ranges

A DHCP server hands out addresses from a **pool**. Servers that others depend on should have either a static address outside the pool or a **reservation**, which always gives the same address to one hardware address. Mixing the two is where duplicates come from: someone types a static address that lies inside the pool, and later the server hands the same address to a laptop.

Keep a record of which ranges are static, which are dynamic and which are reserved. In the cloud, the platform acts as the DHCP server, and you set addresses in the virtual network configuration, not on the machine.

## ARP: who has this address?

On an Ethernet network, frames are delivered by hardware (MAC) address. To send to 10.0.3.1, a host broadcasts an **ARP** request, "who has 10.0.3.1?", and the owner replies with its MAC. The answer is kept in a cache for a short time.

```console
$ ip neigh
10.0.3.1 dev eth0 lladdr 52:54:00:12:35:02 REACHABLE
10.0.3.40 dev eth0 FAILED
$ sudo arping -I eth0 10.0.3.27
```

`FAILED` means nobody answered, so the host is down, on another network, or blocked. ARP works only inside one broadcast domain. Traffic for other networks goes to the gateway, so you only ARP for the gateway's address.

## Duplicate addresses and stale entries

If two machines use one address, ARP replies conflict, and traffic flips between them. Symptoms are connections that work for a minute and then reset, and a MAC address that changes between checks.

```console
$ sudo arping -D -I eth0 -c 2 10.0.3.27
$ ip neigh show 10.0.3.27
$ sudo ip neigh flush 10.0.3.27
```

`arping -D` does a duplicate address detection check, and flushing an entry forces a fresh lookup. After a failover that moves an address to another machine, a gratuitous ARP announces the change so neighbours update their caches quickly.

```predict
Q: A machine has the address 169.254.12.7 on an office network. What is the most likely cause and the first check?
???
It did not get an answer from DHCP. Check the cable or wireless link, and whether a DHCP server is reachable in that network segment.
> Link-local addresses are assigned by the host when DHCP fails.
```

## Incident: Two servers, one address

> **Incident:** After a hardware swap, a monitoring dashboard flickered between healthy and failed for an internal API at 10.0.3.27.

```console
$ ip neigh show 10.0.3.27
10.0.3.27 dev eth0 lladdr 52:54:00:aa:01:10 REACHABLE
$ ip neigh show 10.0.3.27
10.0.3.27 dev eth0 lladdr 52:54:00:bb:02:20 REACHABLE
```

The replacement server had been given the old address by hand while the old machine was still powered on in a rack. The MAC address behind the IP kept changing. Powering off the old machine ended the flicker. The team then moved addresses for infrastructure into a documented static range outside the DHCP pool, and added duplicate address detection to the provisioning script.

## Common mistakes

- Typing a static address that lies inside the DHCP pool
- Assuming a 169.254 address means a faulty machine
- Forgetting that ARP does not cross routers
- Leaving old machines powered on after migration

```quiz
Q: What does a 169.254.x.x address usually indicate?
+ The host did not get an answer from a DHCP server
- A public address :: It is a link-local range.
- A VPN address :: VPNs use their own ranges.
- A DNS failure :: DNS is not involved yet.
> The host assigned it to itself.

Q: What does ARP do?
+ Finds the hardware address that belongs to an IP address on the local network
- Resolves names :: That is DNS.
- Encrypts frames :: ARP does not encrypt.
- Chooses routes :: Routing is a separate step.
> ARP works within one broadcast domain.

Q: What are the four DHCP messages?
+ Discover, Offer, Request, Acknowledge
- Hello, Join, Lease, Done :: These are not the real names.
- Query, Reply, Verify, Close :: Not the DHCP exchange.
- Start, Bind, Renew, Stop :: Not the standard names.
> DORA is the usual memory aid.

Q: Which symptom suggests a duplicate IP address?
+ The MAC address for one IP changes between checks and connections reset
- All pings are slow :: That is a latency problem.
- DNS fails for all names :: Different cause.
- The disk is full :: Unrelated.
> Two machines answer ARP for one address.
```

```cards
Show neighbour table :: ip neigh
Check for duplicates :: arping -D -I eth0 ADDRESS
Renew a lease :: dhclient -v eth0
Link-local range :: 169.254.0.0/16
DHCP steps :: Discover, Offer, Request, Acknowledge
```
