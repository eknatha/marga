---
title: DNS, CDN and global traffic on AWS and Azure
minutes: 15
summary: Host DNS zones with Route 53 and Azure DNS, choose routing policies, put a CDN in front of applications, and manage certificates and cache behaviour.
---

Users reach your application through a name, and often through a content delivery network before they ever touch your servers. Getting DNS, caching and certificates right makes a site faster and far more resilient, while getting them wrong causes outages that are hard to see from inside the cloud.

## What you will learn

- Managed DNS: hosted zones, record types and alias records
- Routing policies for failover and latency
- What a CDN does and how caching is controlled
- TLS certificates at the edge and common pitfalls

## Managed DNS

**Route 53** on AWS and **Azure DNS** (or Azure Traffic Manager for routing) host the authoritative records for your domain. You create a zone, then point the registrar's name servers at the zone's name servers.

```console
$ aws route53 list-hosted-zones --query 'HostedZones[].[Name,Id]' --output text
$ aws route53 list-resource-record-sets --hosted-zone-id Z0123456789ABC --query 'ResourceRecordSets[?Type==`A`].[Name,AliasTarget.DNSName]' --output text
$ az network dns zone list --query '[].name' -o tsv
$ az network dns record-set a list -g rg-dns -z example.com -o table
$ dig +short NS example.com
$ dig +short shop.example.com
```

Apex domains (`example.com`) cannot be a CNAME. Route 53 and Azure DNS offer **alias records** that behave like a CNAME at the apex and point to a load balancer, CDN distribution or storage endpoint, with no extra query cost.

## Records worth knowing

| Type | Use |
|------|-----|
| A / AAAA | Name to IPv4 / IPv6 address |
| CNAME | Name to another name (not at the apex) |
| ALIAS (cloud-specific) | Apex or name to a cloud resource |
| MX | Mail servers |
| TXT | Verification, SPF, DKIM, DMARC |
| CAA | Which certificate authorities may issue |

TTL controls caching. Lower it to 60 seconds **before** a planned migration, so the change takes effect quickly, and raise it again afterwards.

## Routing policies

Beyond a simple answer, DNS can steer traffic:

- **Weighted**: send 5 percent of traffic to a new stack for a canary
- **Latency-based**: answer with the region closest to the user
- **Failover**: answer with a standby when a health check on the primary fails
- **Geolocation**: answer by the user's country, for compliance or content

```hcl
resource "aws_route53_record" "shop_primary" {
  zone_id        = aws_route53_zone.main.zone_id
  name           = "shop.example.com"
  type           = "A"
  set_identifier = "eu-primary"

  failover_routing_policy {
    type = "PRIMARY"
  }

  health_check_id = aws_route53_health_check.eu.id

  alias {
    name                   = aws_lb.eu.dns_name
    zone_id                = aws_lb.eu.zone_id
    evaluate_target_health = true
  }
}
```

Health-check-driven failover depends on honest health checks. A check that only tests the load balancer will keep sending users to a region whose application is broken.

## CDN: CloudFront and Azure Front Door

A **content delivery network** has many edge locations that cache responses near users and terminate TLS there. It reduces latency, offloads your origin and absorbs spikes and some attacks. Azure offers Front Door and Azure CDN; AWS offers CloudFront.

Caching is controlled by headers from the origin and by CDN rules:

```console
$ curl -sI https://shop.example.com/static/app.js | grep -iE "cache-control|etag|x-cache|age|via"
cache-control: public, max-age=31536000, immutable
x-cache: Hit from cloudfront
age: 4821
$ curl -sI https://shop.example.com/api/orders | grep -iE "cache-control|x-cache"
cache-control: no-store
x-cache: Miss from cloudfront
```

Cache static assets for a long time with **versioned file names** (`app.3f9a1.js`), so a new release uses a new URL and nothing needs purging. Never cache personalised or authenticated responses unless the cache key includes what makes them different. Purging (invalidation) exists but is slow and sometimes billed, so design to avoid it.

## Certificates and the edge

Use managed certificates (AWS Certificate Manager, Azure-managed certificates) that renew automatically. CloudFront requires the certificate in the `us-east-1` region. Set CAA records, enforce HTTPS with a redirect, enable HSTS once you are certain everything serves HTTPS, and keep the origin reachable only from the CDN using a shared secret header or private connectivity.

## Incident: the migration that took a day to complete

> **Incident:** A team cuts `shop.example.com` over to a new load balancer by editing the record. Some customers reach the new stack immediately, others still hit the old one eight hours later, and the old stack has already been shut down.

The record had a TTL of 86400 seconds, so resolvers cached the old answer for up to a day.

```console
$ dig +noall +answer shop.example.com
shop.example.com. 83100 IN A 198.51.100.10
$ dig +noall +answer shop.example.com @ns-123.awsdns-45.com
shop.example.com. 86400 IN A 203.0.113.50
```

The authoritative server already returns the new address, while resolvers hold the old one. Restore the old backend while the cache expires. Next time, lower the TTL to 60 seconds a full TTL-period before the change, make the switch, verify with several resolvers, and only decommission the old stack after the original TTL has passed.

## Common mistakes

- Changing DNS with a long TTL and no plan to wait
- Using a CNAME at the zone apex
- Caching personalised pages at the CDN
- Failover that depends on a shallow health check
- Letting the origin accept traffic directly, bypassing the CDN and its protections

```quiz
Q: Why can't you use a CNAME at the zone apex?
- Cloud DNS forbids it
+ The DNS standard requires other records (SOA, NS) at the apex, so use an alias record
- It is too slow
- It only works for IPv6
> Alias records provide CNAME-like behaviour at the apex.

Q: What should you do with the TTL before a planned DNS migration?
- Raise it to one week
+ Lower it in advance so the change propagates quickly
- Delete it
- Leave it unchanged
> The old TTL still applies to cached answers, so lower it a full TTL early.

Q: Which technique avoids needing cache invalidation?
- Short cache times only
+ Versioned asset file names, so each release uses a new URL
- Disabling the CDN
- Using HTTP
> New URLs bypass old cached copies automatically.

Q: What does a failover routing policy need to work well?
+ A health check that truly reflects whether the application is healthy
- A long TTL
- A CNAME
- Multiple registrars
> Shallow checks keep sending users to broken endpoints.
```

```cards
Alias record? :: A cloud-specific record that works like a CNAME but is allowed at the zone apex
Weighted routing use? :: Sending a small percentage of traffic to a new version for a canary
What is a CDN edge? :: A location that caches responses close to users
Why version static file names? :: New releases get new URLs, so no cache purge is needed
```
