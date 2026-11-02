---
title: Network, edge and DNS security
minutes: 15
summary: Segment networks, control outbound traffic, protect the edge with TLS, WAF and DDoS defences, and secure DNS and certificates.
---

Attackers need two things: a way in and a way to move and take data out. Good network security makes each step hard. It limits what can talk to what, watches the traffic that leaves, and protects the edge where the internet meets your services. These controls still matter in the cloud, where they are expressed as security groups, route tables and managed services instead of cables and appliances.

## What you will learn

- Segmentation and security groups that follow least privilege
- Controlling outbound (egress) traffic
- Protecting the edge: TLS, WAF and DDoS mitigation
- DNS security and certificate hygiene
- Private connectivity to cloud services

## Segmentation

Divide the network into zones by function and risk, and allow only the flows that are needed: internet to load balancer, load balancer to application, application to database. Nothing else.

```bash
# Review: which security groups allow the whole internet?
aws ec2 describe-security-groups \
  --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
  --query 'SecurityGroups[].[GroupId,GroupName]' --output text
```

Good rules refer to other security groups instead of address ranges where possible, so they follow the workloads. Remove rules that nobody can explain.

## Control outbound traffic

Most teams filter incoming traffic carefully and leave outgoing traffic open. Attackers rely on that: they download tools and send data out through ports that are never checked. Limit egress to the destinations a workload needs, through a proxy or a firewall with an allow list, and log denied attempts. Block access to the cloud metadata address from application code where you can.

```predict
Q: A web server only needs to call one payment API. Its security group allows all outbound traffic to anywhere. A flaw lets an attacker run commands on the server. What can the attacker do that a tight egress rule would have stopped?
???
Download tools, connect to their own server, and send data out. A rule that allows only the payment API blocks all of that.
> Egress control turns a code execution flaw into a much smaller incident. It also gives you an alert when something tries to connect where it should not.
```

## Protect the edge

- **TLS everywhere**: modern versions only, strong ciphers, automatic certificate renewal, and HSTS.
- **Web application firewall**: blocks common attack patterns and lets you add virtual patches while a fix is prepared. It is a layer, not a replacement for secure code.
- **DDoS protection**: use the provider's absorbing services and a content delivery network, set rate limits, and plan capacity. Have a runbook and contacts ready before an attack.
- **Origin protection**: make the origin accept traffic only from the edge network, or the protection can be bypassed.

```diagram
title: Defence layers from the internet to the database
node: net | Internet | 0 | 1 | The source of normal users and of attacks. | Nothing to fix here; assume hostile traffic.
node: cdn | CDN and DDoS shield | 1 | 1 | Absorbs floods, caches content and hides the origin address. | If the origin address leaks, attackers go around the shield.
node: waf | WAF and load balancer | 2 | 1 | Terminates TLS, filters attacks and applies rate limits. | If rules are stale, new attacks pass. If it fails closed without a plan, users see an outage.
node: app | Application tier | 3 | 1 | Accepts traffic only from the load balancer security group. | With broad inbound rules, any host can reach it.
node: egress | Egress proxy | 3 | 0 | Allows only approved outbound destinations and logs the rest. | Without it, a compromised app can send data anywhere.
edge: net | cdn
edge: cdn | waf
edge: waf | app
edge: app | egress
```

## DNS and certificates

DNS is easy to forget and attractive to attackers.

- Protect registrar and DNS accounts with strong multi-factor authentication, because control of DNS is control of your traffic and mail.
- Watch for **dangling records**: a name that points to a cloud resource that was deleted can be claimed by someone else, which is a subdomain takeover.
- Use DNSSEC where it fits, and set mail records (SPF, DKIM and DMARC) to stop others sending as your domain.
- Monitor certificate transparency logs for certificates issued for your names, and alert on expiry well in advance.

```console
$ dig +short CNAME promo.example.com
promo-site.azurewebsites.net.
$ dig +short promo-site.azurewebsites.net
$
```

An empty answer behind a CNAME suggests that the target no longer exists. Delete the record, or re-create the target, before somebody else claims it.

## Private connectivity

Reach cloud services such as storage, queues and registries through private endpoints, so traffic stays off the internet and you can restrict access to your network. Use VPNs or private links for access between sites and clouds, and keep administration interfaces on private addresses behind strong authentication.

## Incident: the open database port

> **Incident:** A scan from outside shows that port 5432 of a database host answers from the internet. The security group was opened "for a quick test" and never closed.

```console
$ aws ec2 describe-security-groups --group-ids sg-0abc --query 'SecurityGroups[].IpPermissions[]'
[{"FromPort": 5432, "ToPort": 5432, "IpRanges": [{"CidrIp": "0.0.0.0/0"}]}]
```

Close the rule at once, check the database logs for logins from unknown addresses, rotate the database credentials, and add a policy check that fails any pull request or live change opening database ports to the world.

## Common mistakes

- Allowing all outbound traffic from servers
- Security group rules that nobody owns or can explain
- Dangling DNS records after resources are deleted
- Protecting the edge but leaving the origin reachable directly

```quiz
Q: Why restrict outbound traffic from servers?
- To save bandwidth only
+ An attacker who gains access cannot easily download tools or send data to their own server
- Outbound traffic cannot be monitored
- It is required by TLS
> Egress control limits the damage of a compromise and creates a useful signal.

Q: What is a dangling DNS record?
- A record with a very short TTL
+ A name that points to a resource that no longer exists, which someone else may be able to claim
- A record for a mail server
- A record with a typo
> Subdomain takeover uses such records to serve content under your domain.

Q: Why must the origin accept traffic only from the edge network?
- To reduce latency
+ Otherwise attackers can send traffic straight to the origin and skip the protection
- To enable caching
- To save certificates
> A shield is useless if there is an open side door.

Q: What does a private endpoint provide?
- Faster internet
+ Access to a cloud service through private addresses, without crossing the public internet
- A public IP address
- Free storage
> Private connectivity reduces exposure and lets you restrict who can reach the service.
```

```cards
What is egress filtering? :: Limiting outbound traffic to approved destinations
What is a subdomain takeover? :: Claiming a dangling DNS target to serve content under your domain
Three mail records that stop spoofing? :: SPF, DKIM and DMARC
Why monitor certificate transparency? :: To spot certificates issued for your domain that you did not request
What does a WAF do? :: Filters common web attacks and allows virtual patching, as one layer among others
```
