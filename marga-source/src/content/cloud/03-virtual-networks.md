---
title: Virtual networks
minutes: 17
summary: Design a VPC or VNet with public and private subnets, route tables, gateways and security rules, and trace why a connection fails.
---

Every cloud workload lives in a virtual network that you design. The layout decides what is reachable from the internet, what can talk to what internally, and how much a single mistake can expose. It builds directly on the addressing, routing and firewall ideas from the networking module.

## What you will learn

- VPC and VNet structure
- Public and private subnets, route tables, gateways
- Security groups, NACLs and network security groups
- A reachability checklist

## The building blocks

| Idea | AWS | Azure |
|------|-----|-------|
| The network | VPC | Virtual network (VNet) |
| A slice of it | Subnet (lives in one AZ) | Subnet (spans the zones of the region) |
| Routing | Route table per subnet | Route table (UDRs) per subnet |
| Internet access in | Internet gateway | Public IP on the resource |
| Outbound only from private subnets | NAT gateway | NAT gateway |
| Connect networks | VPC peering, Transit Gateway | VNet peering, Virtual WAN |
| Private access to cloud services | VPC endpoints (PrivateLink) | Private endpoints |
| Instance-level firewall | Security group (stateful) | Network security group on NIC or subnet (stateful) |
| Subnet-level firewall | Network ACL (stateless) | NSG on a subnet |

## A standard layout

```text
VPC 10.20.0.0/16
  Public subnets   (10.20.0.0/24, 10.20.1.0/24)   one per AZ
     load balancers, NAT gateways
  Private app subnets (10.20.10.0/24, 10.20.11.0/24)
     application servers or Kubernetes nodes
  Private data subnets (10.20.20.0/24, 10.20.21.0/24)
     databases, no route to the internet
```

A subnet is "public" because its route table sends `0.0.0.0/0` to an internet gateway **and** its resources have public addresses. A "private" subnet has no such route; if it must reach the internet for updates it sends `0.0.0.0/0` to a NAT gateway in a public subnet. Databases usually need no internet route at all.

Plan address ranges so that networks you will later connect (other VPCs, on-premises sites) **do not overlap**. Overlapping ranges cannot be peered, and renumbering later is painful.

## Security rules

Security groups and NSGs are stateful: if a connection is allowed in, the return traffic is allowed automatically. Reference other groups instead of IP ranges where you can.

```hcl
resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
}
```

This says "the database accepts PostgreSQL traffic from anything in the app group", which stays correct as application servers come and go.

> **Warning:** Do not open SSH (22) or RDP (3389) to `0.0.0.0/0`. Use a bastion with strict source ranges, or better, a session service that needs no inbound port (AWS Systems Manager Session Manager, Azure Bastion).

## Reachability checklist

When A cannot reach B, check in this order:

1. **Name resolution**: does the name resolve to the address you expect?
2. **Route**: does A's subnet route table have a path to B's range?
3. **Source firewall**: does A's outbound rule allow it? (Defaults usually do.)
4. **Destination firewall**: does B's security group or NSG allow A on that port?
5. **Subnet filters**: do network ACLs or subnet NSGs allow both directions (stateless ACLs need return rules)?
6. **Listener**: is something actually listening on that port on B?

Cloud tools can analyze the path for you: AWS Reachability Analyzer and Azure Network Watcher (connection troubleshoot and IP flow verify).

## Incident: the new service cannot reach its database

> **Incident:** A new application server in subnet `10.20.10.0/24` times out connecting to PostgreSQL at `10.20.20.15:5432`.

A timeout (not "connection refused") means packets are being dropped before reaching a listener, which points at a route or firewall. Test from the app server:

```console
$ nc -zv -w 3 10.20.20.15 5432
nc: connect to 10.20.20.15 port 5432 (tcp) failed: Connection timed out
$ aws ec2 describe-security-groups --group-ids sg-0db123 \
    --query 'SecurityGroups[0].IpPermissions[].{port:FromPort,from:UserIdGroupPairs[].GroupId}'
[
    { "port": 5432, "from": ["sg-0app111"] }
]
```

The database group allows port 5432 only from `sg-0app111`, but the new server was launched with a different group, `sg-0app222`. Attach the correct group (or add a rule referencing the new one), retest with `nc`, and confirm the application connects. Because the rule referenced a group rather than a fixed IP, fixing group membership was enough. A "refused" error instead would have meant traffic arrived but nothing listened, which sends you to the database process rather than the network.

```diagram
title: A three tier network in the cloud
node: net | Internet | 0 | 1 | Users reach the public load balancer. | Open rules beyond 80 and 443 expose more.
node: pub | Public subnet | 1 | 1 | Holds load balancers and NAT. | A server here with a public IP is directly exposed. | edge
node: app | Private app subnet | 2 | 0 | Application servers with no public IP. | Missing NAT means they cannot download updates.
node: db | Private data subnet | 2 | 2 | Databases that accept traffic only from the app tier. | A broad rule exposes data.
node: nat | NAT gateway | 3 | 0 | Allows outbound traffic from private subnets. | If it fails, patches and external calls stop.
edge: net | pub
edge: pub | app
edge: app | db
edge: app | nat
```

## Common mistakes

- Overlapping address ranges between networks
- Placing databases in public subnets
- Opening administrative ports to the whole internet
- Forgetting that network ACLs are stateless
- Single NAT gateway or single zone for something that must stay up

```quiz
Q: What makes a subnet public in AWS?
- Its name
+ A route to an internet gateway and public addresses on its resources
- A large CIDR range
- A NAT gateway inside it
> Public means directly routable to and from the internet.

Q: A connection attempt times out. What does that usually indicate?
- The service is listening but rejecting
+ Packets are dropped by a route or firewall before reaching a listener
- The password is wrong
- DNS failed
> A refusal is an active reply from the host; a timeout means silence.

Q: How do private subnet instances reach the internet for updates without being reachable from it?
- A public IP
+ A NAT gateway in a public subnet
- A bigger security group
- VPC peering
> NAT allows outbound connections only.

Q: What is the best way to allow the app tier to reach the database?
- Open the database to 0.0.0.0/0
+ Allow the database's port from the application's security group
- Put both in one subnet
- Disable the firewall
> Group references remain correct as instances change.
```

```cards
Public vs private subnet? :: Public routes to an internet gateway; private does not (outbound may go through NAT)
Security group vs network ACL? :: Security groups are stateful and attached to instances; NACLs are stateless and attached to subnets
Timeout vs refused? :: Timeout means dropped by route or firewall; refused means the host replied and nothing listens
Why avoid overlapping CIDRs? :: Overlapping networks cannot be peered or routed together
```
