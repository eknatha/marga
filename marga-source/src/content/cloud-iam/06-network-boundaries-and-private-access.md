---
title: Network boundaries and private access
minutes: 12
summary: Limit exposure with private networks, security groups, private endpoints and sensible defaults for storage and databases.
---

Even perfect permissions are weaker when every resource is reachable from the internet. Network boundaries add a second layer: a service that cannot be reached cannot be attacked directly. Identity and network controls work together, and many cloud breaches began with a public storage bucket, an open database port or an unprotected management interface.

## What you will learn

- Use private subnets and security groups sensibly
- Reach cloud services privately with endpoints
- Close the common public exposures
- Combine network and identity controls

## Private by default

Place application servers and databases in private subnets without public addresses. Put only load balancers and gateways in public subnets. Outbound traffic goes through a NAT gateway or a proxy you can monitor. In Azure, the same idea uses virtual networks, subnets and network security groups.

## Security groups and rules

A security group is a stateful firewall attached to a resource. Allow only the ports and sources needed, preferably referring to other security groups instead of wide address ranges. Be suspicious of `0.0.0.0/0` on anything other than a public web port, and never on SSH, RDP or database ports. Use session-based access (such as AWS Systems Manager Session Manager or Azure Bastion) instead of opening management ports.

## Private endpoints

Cloud services such as object storage, key vaults and databases are normally reached through public addresses. **Private endpoints** (AWS PrivateLink and VPC endpoints, Azure Private Link) give the service a private address inside your network, so traffic never crosses the internet. Combine them with policies that deny access from anywhere else.

## Public exposure checklist

Block public access on storage accounts and buckets at the account level; check for public snapshots and images; review public IP addresses regularly; protect web applications with a firewall and rate limits; and scan for open ports from outside. Remember that a network rule is not authorisation: a service that is reachable still has to check identity.

```predict
Q: A database must be used only by the application servers. How do you configure it?
???
Keep it in a private subnet and allow its port only from the application security group.
> Reference the group, not an address range.
```

## Incident: The public bucket

> **Incident:** A storage bucket holding customer exports was reachable by anyone with the link.

```console
$ aws s3api get-public-access-block --bucket customer-exports
An error occurred (NoSuchPublicAccessBlockConfiguration)
$ aws s3api get-bucket-policy-status --bucket customer-exports
"IsPublic": true
```

The block on public access had never been enabled. The team turned it on for the whole account, replaced the sharing links with short-lived signed links, reviewed the access logs for outside reads, and added a rule that alerts on any public bucket.

## Common mistakes

- Public IPs on databases
- Wide source ranges on management ports
- Assuming a private network replaces authentication
- No account-level block on public storage

```quiz
Q: Where should databases live?
+ In private subnets with narrow rules
- In public subnets :: Exposed.
- On laptops :: No.
- In email :: No.
> Reduce exposure. Re-read the matching lesson section for the full reasoning.

Q: What is a private endpoint?
+ A private address in your network for a cloud service
- A faster disk :: No.
- A password :: No.
- A DNS server :: No.
> Traffic stays off the internet. Re-read the matching lesson section for the full reasoning.

Q: Which source is a red flag on SSH?
+ 0.0.0.0/0
- A bastion security group :: Fine.
- A VPN range :: Fine.
- One office address :: Reasonable.
> Open to the world. Re-read the matching lesson section for the full reasoning.

Q: Does a private network replace authentication?
+ No, services must still check identity
- Yes :: False.
- Only at night :: False.
- Only on Azure :: False.
> Layers. Re-read the matching lesson section for the full reasoning.
```

```cards
Private subnet :: no public address
Security group :: stateful firewall for a resource
Private endpoint :: private address for a cloud service
Block public access :: account-level guard
Session access :: no open admin ports
Layered :: network plus identity
```
