---
title: Networking: Neutron, security groups and floating IPs
minutes: 15
summary: Follow a packet from a server to the internet, and fix a server you cannot reach with SSH.
---

Neutron gives each project its own virtual networks, routers and firewalls. Most problems reported as "the server is broken" turn out to be network problems.

## What you will learn

- Networks, subnets, ports and routers
- Provider and self-service networks
- Security groups and floating IPs
- A checklist for "I cannot reach my server"

## The building blocks

- A **network** is a virtual layer-2 segment, and a **subnet** is an address range on it, with DHCP.
- A **port** is a virtual network card. A server gets one port per interface.
- A **router** connects subnets and joins a private network to an external one.
- **Provider networks** map directly to a physical network, such as a VLAN, and are managed by the operators. **Self-service networks** (tenant networks) are created by projects, and use overlays (VXLAN or Geneve) so that many projects can use the same address ranges without clashing.
- The implementation behind it is Open vSwitch or OVN on each node, plus agents for DHCP, metadata and routing.

```console
$ openstack network list -c Name -c Subnets
+----------+--------------------------------------+
| Name     | Subnets                              |
+----------+--------------------------------------+
| public   | 5a0c... (203.0.113.0/24)             |
| private  | 7d21... (10.0.0.0/24)                |
+----------+--------------------------------------+
```

## Security groups

A **security group** is a set of allow rules applied to a server's port. The default group allows all outbound traffic and denies inbound traffic from outside, except from members of the same group. There are no deny rules: if nothing allows it, it is dropped. A port can have several groups, and their rules add up.

```console
$ openstack security group rule list web --long -c "IP Protocol" -c "Port Range" -c "IP Range" -c Direction
+-------------+------------+-----------+-----------+
| IP Protocol | Port Range | IP Range  | Direction |
+-------------+------------+-----------+-----------+
| tcp         | 80:80      | 0.0.0.0/0 | ingress   |
+-------------+------------+-----------+-----------+
$ openstack security group rule create --proto tcp --dst-port 22 --remote-ip 203.0.113.7/32 web
```

Opening a port to `0.0.0.0/0` exposes it to the whole internet. Limit management ports such as SSH to known addresses or a jump host.

## Floating IPs

Servers on private networks have private addresses. A **floating IP** is a public address that Neutron maps to a server's private address using NAT at the router. It can be moved to another server, which is useful for failover.

```console
$ openstack floating ip create public -c floating_ip_address -f value
203.0.113.45
$ openstack server add floating ip web-1 203.0.113.45
```

## "I cannot reach my server"

Check from the inside out:

1. Is the server `ACTIVE`, and did it boot? `openstack console log show web-1` shows the boot log and whether it got an address from DHCP.
2. Does the port have the right fixed IP? `openstack port list --server web-1`.
3. Does the security group allow your traffic from your address, on the right port and protocol?
4. Is there a floating IP, and is the router attached to the external network?
5. Is the service listening inside the server? Console or another server on the same network can test.
6. Does the server's own firewall (iptables, ufw) allow it?

A frequent cause is steps 3 and 4: either the rule is missing or the floating IP is not attached.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Networking: Neutron, security groups and floating... fits together
node: n1 | The building blocks | 0 | 0 | A network is a virtual layer-2 segment, and a subnet is an address range on it, with DHCP. | Assuming a floating IP exists because the server has a private address. | process
node: n2 | Security groups | 1 | 1 | A security group is a set of allow rules applied to a server's port. | Forgetting that security groups only allow, and default denies inbound. | security
node: n3 | Floating IPs | 2 | 0 | Servers on private networks have private addresses. | Changing the router when the security group is the cause. | process
node: n4 | "I cannot reach my server" | 3 | 1 | Check from the inside out. | "I cannot reach my server" Check from the inside out: 1. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: SSH works from the office but not from home

> **Incident:** An engineer working from home could not SSH to a server that colleagues in the office reached fine.

```console
$ openstack security group rule list bastion --long -c "Port Range" -c "IP Range" -c Direction
+------------+------------------+-----------+
| Port Range | IP Range         | Direction |
+------------+------------------+-----------+
| 22:22      | 198.51.100.0/24  | ingress   |
+------------+------------------+-----------+
$ curl -s ifconfig.me
203.0.113.88
```

The security group allowed SSH only from the office network, 198.51.100.0/24. The engineer's home address, 203.0.113.88, was outside it. The fix was to add a rule for that single address with a /32, not to open SSH to the world, and later to move access behind a VPN. The cloud was behaving exactly as configured.

```wrongpath
@goal SSH to a new server times out; add a rule that allows everything.
@wrong
openstack security group rule create --protocol any --remote-ip 0.0.0.0/0 default
@result
(SSH works)
# later
scan from the internet finds open 3306 and 6379
@why The default group applies to every server that uses it, so a wide rule exposes databases and caches too. The fault was simply a missing rule for port 22 from a known range.
@right
openstack security group rule create --protocol tcp --dst-port 22 --remote-ip 203.0.113.0/24 bastion
openstack server add security group app bastion
@after Open only the needed port from a known source, in a group made for the purpose.
```

## Common mistakes

- Opening 22 or 3389 to 0.0.0.0/0 to make a problem go away
- Forgetting that security groups only allow, and default denies inbound
- Assuming a floating IP exists because the server has a private address
- Changing the router when the security group is the cause

```quiz
Q: What does a security group contain?
+ Allow rules only; anything not allowed is dropped
- Allow and deny rules with priorities :: There are no deny rules.
- Only outbound rules :: Both directions exist.
- Disk quotas :: No.
> Rules add up across groups.

Q: What is a floating IP?
+ A public address that Neutron maps to a server's private address
- A disk volume :: No.
- A kind of flavor :: No.
- An image format :: No.
> It can be moved between servers.

Q: SSH works from the office but not from home. Which is the likely cause?
+ The security group allows SSH only from the office range
- The image is Ubuntu :: Unrelated.
- The flavor is small :: Unrelated.
- Keystone is down :: Unrelated.
> Add a narrow rule, not 0.0.0.0/0.

Q: What do self-service networks use to keep projects apart?
+ Overlay tunnels such as VXLAN or Geneve
- Different flavors :: No.
- Different images :: No.
- Different hypervisors :: No.
> Overlays allow overlapping address ranges.
```

```cards
Port :: virtual network card
Subnet :: address range with DHCP
Router :: joins networks
Security group :: allow rules for a port
Floating IP :: public address mapped by NAT
VXLAN :: overlay tunnel for tenant networks
```
