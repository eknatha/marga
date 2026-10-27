---
title: Connecting networks: peering, VPN and private links
minutes: 13
summary: Join cloud networks to each other and to an office or data centre with peering, VPN, dedicated links and private endpoints, and avoid address clashes.
---

Two teams each built a network in the cloud, both using 10.0.0.0/16. When they try to connect them, nothing works, and changing an address range now means rebuilding everything. Connecting networks is mostly planning: addresses, routes and who may reach what.

## What you will learn

- Plan non-overlapping address ranges
- Peering, transit hubs, VPN and dedicated connections
- Private endpoints to reach cloud services without the internet
- Routes and security rules on both sides

## Plan addresses first

Networks can only be connected if their ranges do not overlap. Keep one address plan for the whole organization: a large block per cloud account or region, carved into subnets, with a spreadsheet or tool as the record. Reserve space for growth and for the office and data centre ranges. Overlap is the problem that is cheapest to avoid and most expensive to fix, because it can require rebuilding networks or using address translation.

## Ways to connect

| Option | Use it for | Notes |
|--------|-----------|-------|
| Peering | Two networks in the cloud | Simple and fast, but not transitive (A to B and B to C does not give A to C) |
| Transit hub or gateway | Many networks | One central router with route tables; scales better than many peerings |
| Site-to-site VPN | Office or data centre to cloud | Encrypted over the internet, quick to set up, speed depends on the internet |
| Dedicated connection | Heavy or steady traffic | A private line from the provider: lower latency, higher cost, weeks to order |
| Client VPN | Individual engineers | Central access with logging and multi-factor authentication |

Use a VPN as the backup for a dedicated line, so a cut fibre does not cut you off.

## Private endpoints

Cloud services such as storage or databases are usually reached over public addresses. A **private endpoint** (or interface endpoint) gives the service a private address inside your network, so traffic never leaves the provider network and you can block the internet path entirely. Combine it with a policy that says only your network may use the endpoint. Remember that private DNS must resolve the service name to the private address; otherwise clients still go to the public one.

## Routes and rules on both sides

A connection needs three things on each side: a route to the other range, a security rule that allows the traffic, and working DNS. Missing any one makes the link look broken.

```console
$ ip route get 172.16.4.10
$ ping -c 2 172.16.4.10
$ nc -zv -w3 172.16.4.10 5432
$ dig +short db.corp.example
```

Check in that order: route, reachability, port, name. Remember that peering and VPN connections need route table entries in every subnet that should use them, and that the other side must route replies back.

```predict
Q: You peer network A with B, and B with C. Can A reach C?
???
No. Peering is not transitive. Use a transit hub, or peer A with C directly.
> Each peering is a separate relationship between two networks.
```

## Incident: The overlapping ranges

> **Incident:** A migration project needed to connect a new analytics network to the production network, and the connection request was refused.

```console
$ aws ec2 describe-vpcs --query "Vpcs[].[VpcId,CidrBlock]" --output text
vpc-0a1   10.0.0.0/16
vpc-0b2   10.0.0.0/16
```

Both networks used 10.0.0.0/16, and the provider cannot peer overlapping ranges. The analytics network was rebuilt in 10.40.0.0/16 over a weekend, and the organization introduced an address plan with a reviewed registry. New networks now get their range from the registry, and a pipeline check rejects any VPC definition whose range overlaps an existing one.

## Common mistakes

- Letting every team choose its own address range
- Assuming peering is transitive
- Adding a route on one side only
- Connecting with VPN and forgetting that DNS must resolve names on both sides

```quiz
Q: Why must connected networks avoid overlapping ranges?
+ Routers cannot tell which network an address belongs to
- It wastes addresses :: That is a smaller problem.
- It slows the network :: The failure is routing, not speed.
- Providers charge more :: The link simply fails.
> Plan addresses before you build.

Q: Is cloud peering transitive?
+ No, each peering links only two networks
- Yes, always :: It is not.
- Only inside one region :: It is not transitive anywhere.
- Only with a VPN :: VPN does not change that.
> Use a transit hub for many networks.

Q: What is a private endpoint for?
+ Reaching a cloud service by a private address, without the internet
- Encrypting a disk :: It is a network feature.
- Making a service public :: It does the opposite.
- Speeding up DNS :: It is not a DNS feature.
> Private DNS must point to it.

Q: Which check order helps find a broken connection?
+ Route, reachability, port, name
- Name, then logs, then route :: Names last hides route problems.
- Port only :: You miss earlier layers.
- Reboot first :: It hides the cause.
> Test layer by layer.
```

```cards
Overlap problem :: ranges must be unique across connected networks
Peering is :: not transitive
Many networks :: transit hub
Office to cloud quickly :: site-to-site VPN
Reach services privately :: private endpoint
```
