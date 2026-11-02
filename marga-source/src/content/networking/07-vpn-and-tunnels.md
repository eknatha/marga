---
title: VPNs, tunnels and private connectivity
minutes: 15
summary: Connect networks securely with WireGuard and IPsec, use SSH and TLS tunnels, and understand cloud site-to-site VPN, peering and private endpoints.
---

Sooner or later two private networks must talk to each other: an office and a cloud network, two cloud VPCs, or a laptop and a production database. A **tunnel** carries private traffic across an untrusted network, usually by encrypting and encapsulating packets.

## What you will learn

- What a VPN actually does at the packet level
- A WireGuard site-to-site example
- IPsec and how cloud VPN gateways use it
- Alternatives: peering, private endpoints and SSH tunnels

## How a tunnel works

The original packet is encrypted, wrapped inside a new packet addressed to the VPN peer, and sent across the internet. The peer unwraps and decrypts it, then delivers the original into its own network. To both sides, the networks look directly connected.

Key design questions are the same every time: which address ranges live on each side, which side initiates, how the keys are exchanged, and what happens when the tunnel drops.

## WireGuard

WireGuard is small, fast and simple. Each peer has a key pair, and configuration lists which peers may send which address ranges.

```console
$ umask 077
$ wg genkey | tee private.key | wg pubkey > public.key
$ sudo wg show
```

```ini
[Interface]
Address=10.99.0.1/24
ListenPort=51820
PrivateKey=REPLACE_WITH_PRIVATE_KEY

[Peer]
PublicKey=REPLACE_WITH_PEER_PUBLIC_KEY
AllowedIPs=10.99.0.2/32,192.168.50.0/24
Endpoint=203.0.113.20:51820
PersistentKeepalive=25
```

Save that as `/etc/wireguard/wg0.conf`, then bring it up:

```console
$ sudo wg-quick up wg0
$ sudo systemctl enable wg-quick@wg0
$ ping -c 2 10.99.0.2
$ sudo wg show wg0 latest-handshakes
```

`AllowedIPs` does two jobs: it decides what traffic is routed into the tunnel, and it filters which source addresses the peer may use. A recent handshake time proves keys match and UDP is getting through. Allow UDP 51820 in firewalls and security groups.

## IPsec and cloud VPNs

IPsec is the long-standing standard supported by nearly every router and firewall. Clouds expose it as a **site-to-site VPN**: a virtual private gateway in your VPC (AWS) or VPN gateway in a VNet (Azure) builds two redundant tunnels to your on-premises device. You configure the pre-shared key or certificate, the IKE and IPsec encryption parameters, and either static routes or BGP.

Both ends must agree exactly on parameters, and the usual failures are a mismatched proposal, a wrong pre-shared key, overlapping CIDRs or a missing route on one side. Use both tunnels for availability, and monitor them: a tunnel that is down silently is a common source of "intermittent" problems.

## Private connectivity inside the cloud

Not every connection needs a VPN.

| Need | Tool |
|------|------|
| Two VPCs or VNets in one cloud | VPC peering, VNet peering or a transit hub |
| Reach a cloud service without the internet | Private endpoint (PrivateLink, Private Link) |
| Dedicated, predictable bandwidth from a data centre | Direct Connect, ExpressRoute |
| Quick access to one internal service | SSH or SSM port forwarding |

Peering is not transitive: if A peers with B and B with C, A cannot reach C through B. A **transit gateway** or hub-and-spoke design provides routing between many networks.

```console
$ ssh -N -L 15432:db.internal:5432 ops@bastion
$ psql -h 127.0.0.1 -p 15432 -U app appdb
$ aws ssm start-session --target i-0abc123def --document-name AWS-StartPortForwardingSession --parameters portNumber=5432,localPortNumber=15432
```

## Incident: the tunnel that was up but carried nothing

> **Incident:** The site-to-site VPN shows both tunnels as UP in the console, yet the application in the cloud cannot reach the on-premises database. Ping works from the gateway, but not from application servers.

The tunnel is a transport; routing still decides which traffic enters it. Check each layer:

```console
$ ip route get 192.168.50.10
192.168.50.10 via 10.0.0.1 dev eth0 src 10.0.3.22
$ traceroute -n 192.168.50.10
```

The cloud route table for the application subnet had no route for 192.168.50.0/24 via the VPN gateway, so traffic went to the internet gateway and was dropped. Fix the route table (or enable route propagation), then verify the on-premises firewall also allows the database port from the cloud CIDR.

## Common mistakes

- Overlapping address ranges on the two sides
- Forgetting routes or security rules after the tunnel is up
- Treating peering as transitive
- A single tunnel with no failover and no monitoring
- Sharing pre-shared keys in chat or tickets

```quiz
Q: What does a VPN tunnel do?
- Speeds up the connection
+ Encrypts and encapsulates private traffic so it can cross an untrusted network
- Removes the need for routing
- Replaces DNS
> The inner packet travels wrapped inside an encrypted outer packet.

Q: What are AllowedIPs in WireGuard used for?
- Only firewall rules
+ Routing traffic into the tunnel and restricting which sources a peer may use
- Setting the MTU
- Defining DNS servers
> They act as both a routing table and an access filter for the peer.

Q: Are VPC peering connections transitive?
- Yes, always
+ No, A to B and B to C does not give A access to C
- Only inside one region
- Only with IPv6
> Use a transit gateway or hub design to connect many networks.

Q: A VPN tunnel is up but traffic does not flow. What do you check first?
- Reinstall the gateway
+ Route tables and security rules on both sides
- The VPN logo
- The operating system version
> A healthy tunnel still needs routes and permissive firewall rules.
```

```cards
What does PersistentKeepalive do? :: Sends periodic packets so NAT devices keep the tunnel mapping open
Private endpoint versus VPN? :: A private endpoint reaches one cloud service privately; a VPN joins whole networks
Why use two VPN tunnels? :: Redundancy: one can fail or be maintained without an outage
Quick way to reach a private database? :: An SSH or SSM port-forward through a bastion or managed session
```
