---
title: Segmentation, security groups and least-privilege networks
minutes: 13
summary: Divide a network into zones, write firewall and security group rules that allow only what is needed, and review them.
---

A flat network is easy to build and easy to lose: once an attacker reaches one machine, every other machine is one hop away. Segmentation limits that reach. In a cloud, the same idea appears as subnets, security groups and network ACLs, and a few habits keep the rules understandable.

## What you will learn

- Zones such as public, application and data, and why they exist
- How security groups and network ACLs differ
- Writing rules by purpose: source, port, reason
- Reviewing and testing rules

## Zones and the path of a request

A typical design has three tiers. The **public** tier holds load balancers that accept traffic from the internet. The **application** tier runs services that only the load balancer may call. The **data** tier holds databases that only the application may reach. Each tier sits in its own subnet, and each boundary is a place where you decide what may cross.

```text
internet -> load balancer (443) -> app servers (8080) -> database (5432)
```

If the web tier is compromised, the attacker still faces rules between it and the database. Add a separate **management** zone for bastion hosts and tooling, with its own rules.

## Security groups and ACLs

In most clouds there are two filters. A **security group** attaches to an instance or interface. It is *stateful*: if a connection is allowed in, the reply is allowed out automatically. Rules are allow-only, and anything not allowed is denied. A **network ACL** belongs to a subnet, is usually *stateless* (return traffic needs its own rule) and can allow or deny.

Use security groups as the main tool. A powerful habit is to reference another group as the source, not an address range:

```text
SG db:   allow TCP 5432 from SG app
SG app:  allow TCP 8080 from SG lb
SG lb:   allow TCP 443  from 0.0.0.0/0
```

Now the rules follow the machines as they scale, and a new app server is allowed to reach the database without anyone editing an address list.

## Write rules with a reason

Every rule should answer: who, to what, on which port, and why. A rule such as "allow all from 10.0.0.0/8" answers none of those questions. Name rules and add a description that links to a ticket or a service.

- Open only the ports a service needs; avoid ranges such as 0-65535.
- Never expose administration ports (SSH 22, RDP 3389, databases) to 0.0.0.0/0. Use a bastion, a VPN or a managed session service.
- Limit outbound traffic from the data tier. Databases rarely need to reach the internet.
- Use tags and group names that describe the role, not the person.

## Check what is really allowed

Rules drift. Review them on a schedule and test the paths that should be blocked, not only the ones that should work.

```console
$ nc -zv -w3 db.internal 5432      # from an app host: should succeed
$ nc -zv -w3 db.internal 5432      # from a web host: should time out
$ aws ec2 describe-security-groups --query "SecurityGroups[?IpPermissions[?IpRanges[?CidrIp=='0.0.0.0/0']]].GroupId"
```

The last command lists security groups that contain an open-to-the-world rule. Cloud tools can also record network flows (flow logs), which shows traffic that was rejected and helps you find rules that are missing or too wide.

```predict
Q: Why reference a security group as the source of a rule instead of an IP range?
???
The rule follows the instances that belong to the group, so scaling out or replacing servers does not require editing addresses.
> Group references stay correct when addresses change, and they express intent.
```

## Incident: Everything could reach the database

> **Incident:** A pen test found that a forgotten test server in the public subnet could connect to the production database on port 5432.

```console
$ aws ec2 describe-security-groups --group-ids sg-0db1 --query "SecurityGroups[0].IpPermissions"
[ { "FromPort": 5432, "IpRanges": [ { "CidrIp": "10.0.0.0/8", "Description": "temporary" } ] } ]
```

The database group allowed the whole private range "temporarily" two years earlier. Any machine in the network could connect, including the test server. The fix replaced it with a rule that allows only the application group, flow logs were enabled on the data subnet, and a monthly review lists rules with the word temporary or without a description.

## Common mistakes

- Allowing a whole private range because it is convenient
- Opening 0.0.0.0/0 for administration ports
- Rules without descriptions or owners
- Testing only the allowed paths, never the blocked ones

```quiz
Q: What does stateful mean for a security group?
+ Replies to allowed connections are allowed automatically
- Rules are saved on disk :: State here means connection tracking.
- It blocks all return traffic :: That is stateless behaviour.
- It only works for UDP :: It works for TCP and UDP.
> Stateful filters track connections.

Q: Which design best protects a database?
+ Only the application tier may connect to it, on one port
- The whole VPC may connect :: That is too wide.
- Any host with a VPN may connect :: VPN users should go through a controlled path.
- Anyone on the internet, with a password :: The network layer should block them first.
> Defence in depth: network rules and credentials.

Q: Why avoid 0.0.0.0/0 on port 22?
+ It exposes administration to the whole internet
- It makes SSH slower :: Speed is unaffected.
- It disables encryption :: SSH stays encrypted.
- It uses extra IP addresses :: Addresses are not consumed.
> Use a bastion, VPN or managed session access.

Q: What do flow logs help with?
+ Seeing which connections were accepted or rejected, to find missing or too wide rules
- Encrypting traffic :: They only record metadata.
- Changing routes :: They do not change anything.
- Caching DNS :: They are unrelated.
> Flow logs show real traffic against your rules.
```

```cards
Three-tier layout :: public, application, data
Security group source tip :: reference another group, not a range
Stateful vs stateless :: security group vs network ACL
Never open to the world :: SSH, RDP and databases
Find open rules :: describe-security-groups and flow logs
```
