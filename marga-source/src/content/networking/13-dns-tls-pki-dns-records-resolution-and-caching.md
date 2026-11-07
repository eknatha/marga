---
title: DNS, TLS and PKI: DNS records, resolution and caching
minutes: 13
summary: Understand how a name becomes an address through recursive and authoritative servers, what each record type is for, and how TTLs and caches decide how fast changes spread.
---

Almost every outage story has a DNS chapter. The system is simple in principle (names map to data), but it is spread across caches you do not control. Knowing who answers, who caches and for how long turns "DNS is weird" into a predictable picture.

## What you will learn

- The roles of stub, recursive and authoritative servers
- The record types you meet daily
- How TTL, caching and negative caching shape change speed
- What delegation and the apex CNAME rule mean in practice

## Who answers

A program asks a **stub resolver** on the host, which asks a **recursive resolver** (your provider, the cloud VPC resolver or a company server). The recursive resolver walks from the root servers to the TLD servers to the domain's **authoritative** servers, caches what it learns, and returns the answer. Only the authoritative servers hold the truth; everyone else holds copies that expire.

```console
$ dig +trace www.example.com
$ dig NS example.com +short
$ dig @ns1.example.com www.example.com
```

`+trace` shows the walk. Asking an authoritative server directly with `@` shows the real data without any cache in between, which is the first test when you suspect stale answers.

## Record types

- **A** and **AAAA**: IPv4 and IPv6 addresses
- **CNAME**: an alias to another name; the target must be resolved too
- **MX**: mail servers with priority
- **TXT**: free text, used for SPF, domain verification and ACME challenges
- **NS**: the authoritative servers for a zone (delegation)
- **SOA**: zone metadata, including the negative-caching time
- **SRV** and **PTR**: service location and reverse lookups

A name that has a CNAME cannot hold other records, so the zone **apex** (example.com itself) cannot be a plain CNAME, because it must also have NS and SOA. Providers solve this with ALIAS or ANAME features that flatten the answer on their side.

## TTL and caching

Each record carries a **TTL** in seconds. Resolvers may keep the answer that long. A TTL of 3600 means a change can take up to an hour to reach every cache, and you cannot reach into other people's caches to clear them. Failed lookups are cached too: an `NXDOMAIN` answer is kept for the SOA's negative TTL, so creating a record right after a failed lookup may still look missing for a while. Lower the TTL **before** a planned change (a day ahead, to the old TTL's length), make the change, then raise it again.

```predict
Q: A record has TTL 86400. You change its IP now. How long until all resolvers return the new IP?
???
Up to 24 hours for caches that fetched it just before the change. Lower the TTL in advance for planned moves.
> TTL sets the worst-case spread time.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How DNS, TLS and PKI: DNS records, resolution and... fits together
node: n1 | Who answers | 0 | 0 | A program asks a stub resolver on the host, which asks a recursive resolver (your provider, the cloud VPC resolver or a company server). | Changing records without lowering the TTL first. | process
node: n2 | Record types | 1 | 1 | A and AAAA: IPv4 and IPv6 addresses. | Putting a CNAME at the zone apex. | process
node: n3 | TTL and caching | 2 | 0 | Each record carries a TTL in seconds. Resolvers may keep the answer that long. | Forgetting that failed lookups are cached too. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The migration that took a day to finish

> **Incident:** A team moved a website to a new load balancer and changed the DNS record, but half of the customers kept reaching the old, switched-off address for most of a day.

```console
$ dig +noall +answer www.shop.example
www.shop.example. 85012 IN A 203.0.113.10
$ dig @ns1.shop.example +noall +answer www.shop.example
www.shop.example. 86400 IN A 198.51.100.20
```

The record had a TTL of 86400 seconds. A public resolver still returned the old address with 85012 seconds left, while the authoritative server already had the new one. The team switched the old address back on as a reverse proxy to the new site while caches expired, and for later moves they lowered TTLs to 300 seconds a day ahead and added a checklist item to compare answers from the authoritative server and two public resolvers.

## Common mistakes

- Changing records without lowering the TTL first
- Testing only through a caching resolver
- Putting a CNAME at the zone apex
- Forgetting that failed lookups are cached too

```quiz
Q: Which servers hold the authoritative data for a zone?
+ The zone's authoritative name servers
- Every recursive resolver :: They only hold cached copies.
- The root servers :: They delegate to TLD servers.
- The user's browser :: It caches, but is not authoritative.
> Others copy what the authoritative servers say.

Q: Why can the zone apex not be a plain CNAME?
+ It must also hold NS and SOA records, and a CNAME allows no other records
- CNAMEs are not allowed in DNS :: They are allowed elsewhere.
- Apex names are shorter :: Not the reason.
- It would break TLS :: Unrelated.
> Use ALIAS or ANAME features instead.

Q: What does a TTL control?
+ How long a resolver may keep the answer in its cache
- How fast the server answers :: Unrelated to latency.
- How many records a zone has :: Unrelated.
- The size of a packet :: Unrelated.
> It sets the worst-case propagation time.

Q: What is the best first test when you suspect stale DNS answers?
+ Query the authoritative server directly with dig @server
- Reboot the router :: Does not address caches elsewhere.
- Clear the browser history :: Unrelated.
- Wait a week :: Not a test.
> Compare authoritative data with cached answers.
```

```cards
Stub, recursive, authoritative :: host, caching walker, source of truth
CNAME :: alias to another name, no other records beside it
TTL :: seconds a resolver may cache the answer
Negative caching :: NXDOMAIN answers are cached for the SOA minimum
Before a move :: lower the TTL a full old-TTL ahead
```
