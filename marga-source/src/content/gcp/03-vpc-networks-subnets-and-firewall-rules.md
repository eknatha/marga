---
title: VPC networks, subnets and firewall rules
minutes: 13
summary: Design Google Cloud VPC networks with global VPCs, regional subnets, firewall rules, Cloud NAT and private access to Google services.
---

Networking in Google Cloud differs from other clouds in one big way: a VPC spans all regions. Learning that, and how firewall rules attach to instances, gives you a clean and safe design.

## What you will learn

- Global VPCs and regional subnets
- Firewall rules and priorities
- Cloud NAT and private access
- Shared VPC and peering

## VPC and subnets

A **VPC network** is global; each **subnet** belongs to one region and has an IP range. Use **custom mode** so you pick the ranges rather than accepting the auto-mode defaults, and plan non-overlapping ranges for peering and on-premises links.

```console
$ gcloud compute networks create prod-vpc --subnet-mode=custom
$ gcloud compute networks subnets create app-eu --network=prod-vpc \
    --region=europe-west1 --range=10.10.0.0/20 --enable-private-ip-google-access
```

## Firewall rules

Ingress is denied and egress allowed by default (implied rules). Add rules with a **priority** (lower number wins), direction, protocol, ports, source and **target** (tags or service accounts).

```console
$ gcloud compute firewall-rules create allow-lb-to-web --network=prod-vpc \
    --direction=INGRESS --allow=tcp:8080 \
    --source-ranges=130.211.0.0/22,35.191.0.0/16 \
    --target-service-accounts=web@acme-pay-prod.iam.gserviceaccount.com
$ gcloud compute ssh web-1 --tunnel-through-iap
```

Prefer **service accounts** as targets because tags can be set by anyone with edit rights on the instance. **IAP** tunnelling gives administrators SSH without opening port 22 to the internet.

## Reaching out

VMs without public IPs reach the internet through **Cloud NAT** (via a Cloud Router) and reach Google APIs through **Private Google Access**. **Shared VPC** lets a host project own the network while service projects deploy into it. **VPC peering** connects two VPCs privately; it is not transitive.

```diagram
title: A private Google Cloud network
node: user | Users | 0 | 0 | Reach the load balancer on a public address. | An open admin port invites attacks.
node: lb | Load balancer | 1 | 0 | Terminates traffic and forwards to backends. | Missing health-check ranges in the firewall mark backends unhealthy. | edge
node: vm | Private VMs | 2 | 0 | No public IP; rules by service account. | A broad allow rule defeats the isolation. | service
node: nat | Cloud NAT | 3 | 0 | Outbound internet without public IPs. | Port exhaustion breaks many outbound connections. | process
node: iap | IAP tunnel | 2 | 1 | Admin SSH without a public port. | Granting IAP tunnel access too widely replaces one open door with another. | security
edge: user | lb
edge: lb | vm
edge: vm | nat
edge: iap | vm
```

## Incident: Backends unhealthy

> **Incident:** A new firewall rule set blocked the load balancer's health checks.

```console
$ gcloud compute backend-services get-health web --global
web-1  healthState: UNHEALTHY
firewall: no rule allowing 130.211.0.0/22 and 35.191.0.0/16 on tcp:8080
```

The load balancer probes come from Google ranges. Allowing those ranges to the service port brought backends back.

## Common mistakes

- Using the default network in production
- Firewall rules based on tags that developers can edit
- Overlapping IP ranges between VPCs
- Forgetting health-check source ranges

```quiz
Q: What is the scope of a Google Cloud VPC?
+ Global
- One zone :: No.
- One subnet :: No.
- One project only :: No.
> Subnets are regional.

Q: What are the default firewall behaviours?
+ Deny ingress, allow egress
- Allow all :: No.
- Deny all :: No.
- Allow ingress only :: No.
> Implied rules. The lesson section above explains why.

Q: How do private VMs reach the internet?
+ Cloud NAT
- A public key :: No.
- A shared disk :: No.
- A snapshot :: No.
> Cloud NAT provides outbound access.

Q: Which gives admin SSH without an open port 22?
+ IAP tunnelling
- A public IP :: No.
- A tag :: No.
- A snapshot :: No.
> Identity-Aware Proxy.
```

```cards
VPC :: A virtual network spanning regions
Subnet :: A regional IP range inside a VPC
Cloud NAT :: Managed outbound address translation
Shared VPC :: A host project's network shared with other projects
IAP :: Identity-Aware Proxy for authenticated access
```
