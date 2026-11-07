---
title: DNS, TLS and PKI: outage prevention checklist
minutes: 11
summary: Prevent the common DNS and certificate outages with an inventory, expiry and domain-renewal alerts, safe change steps, redundancy and a rehearsed rollback.
---

A large share of avoidable outages comes from the same few causes: an expired certificate, an expired domain, a careless DNS change, or one DNS provider that went down. Each has a simple preventive practice. This lesson collects them into a checklist you can adopt.

## What you will learn

- Build and maintain an inventory of names and certificates
- Alert on certificate, CA and domain expiry
- Change DNS safely, with review, TTL planning and rollback
- Add redundancy for DNS itself

## Know what you have

You cannot protect what you cannot list. Keep an inventory of domains (and who owns the registrar account), DNS zones and providers, public and internal certificates, CA certificates and the systems that serve them. Generate it from sources of truth (DNS zones, load balancers, ingress objects, certificate stores) instead of a spreadsheet that goes stale, and check for names pointing at services that no longer exist, which are also a takeover risk.

## Alert before it hurts

- **Certificates**: probe from outside and alert at 30, 14 and 7 days; a page at 7.
- **CA and signing certificates**: 90, 30 and 7 days.
- **Domains**: registrar expiry at 60 and 30 days, with auto-renew on, a valid payment method and a shared role mailbox (not a leaver's address) as contact.
- **DNS health**: synthetic lookups of key names from several networks, and an alert when the answer changes unexpectedly.

```console
$ whois example.com | grep -i -E 'expir|registrar'
$ dig +short NS example.com
$ echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -enddate
```

## Change DNS like code

Store zone data as code (Terraform or a similar tool), review changes, and apply from a pipeline. Before a risky change: lower the TTL a day ahead, write the exact rollback record, check that the new target works by testing it directly (for example with `curl --resolve`), change one thing at a time and compare answers from the authoritative server and public resolvers afterward. Protect critical zones with registry locks and restricted write access, since a hijacked DNS record is a hijacked service.

```console
$ curl --resolve app.example.com:443:198.51.100.20 https://app.example.com/health
```

## Make DNS itself redundant

Use at least two authoritative servers on **separate networks**, and for critical domains consider two independent providers with synchronized zones. Keep delegation (NS and glue records) consistent. Know how your own systems behave when DNS is down: clients should cache sensibly, applications should not do blocking lookups on every request, and the tools you need during an incident (status page, access to consoles) must not depend only on the domain that is broken.

```predict
Q: Your only DNS provider has a four-hour outage. What would have limited the impact?
???
A second authoritative provider with synchronized zones, a reasonable TTL for caches, and incident tools that do not depend on the affected domain.
> Do not leave DNS as a single point of failure.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How DNS, TLS and PKI: outage prevention checklist fits together
node: n1 | Know what you have | 0 | 0 | You cannot protect what you cannot list. | No inventory, so nobody knows what expires when. | process
node: n2 | Alert before it hurts | 1 | 1 | Certificates: probe from outside and alert at 30, 14 and 7 days; a page at 7. | Registrar contact tied to one person's mailbox. | observe
node: n3 | Change DNS like code | 2 | 0 | Store zone data as code (Terraform or a similar tool), review changes, and apply from a pipeline. | DNS changes made in a console with no review or rollback. | edge
node: n4 | Make DNS itself redundant | 3 | 1 | Use at least two authoritative servers on separate networks, and for critical domains consider two independent providers with synchronized zones. | A single provider and a single point of failure for DNS. | edge
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The domain that expired

> **Incident:** A company's main domain stopped resolving on a Friday evening, taking down the website, email and the single sign-on service.

```console
$ whois company.example | grep -i expir
Registry Expiry Date: 2026-06-05T00:00:00Z
$ dig +short NS company.example
```

The renewal reminders had gone to the mailbox of an employee who had left, and the payment card on file had expired. The registrar kept the domain in a grace period, and a manager had to find the account and pay by phone before DNS returned. The company moved the domain to a role-based account with several admins, enabled auto-renew, added expiry alerts and registry lock, and wrote a one-page recovery runbook for domain loss.

## Common mistakes

- No inventory, so nobody knows what expires when
- Registrar contact tied to one person's mailbox
- DNS changes made in a console with no review or rollback
- A single provider and a single point of failure for DNS

```quiz
Q: Why should registrar contacts be role mailboxes?
+ Reminders and recovery must not depend on one person
- To receive more email :: Not the goal.
- To hide ownership :: Unrelated.
- To skip payment :: Unrelated.
> People leave, roles stay.

Q: What is a safe way to test a new DNS target before changing the record?
+ Use curl --resolve to reach the new address with the real hostname
- Change the record and see :: Risky.
- Ping the name :: Does not test the application.
- Wait a week :: Not a test.
> Prove the target works first.

Q: What does a second DNS provider protect against?
+ An outage or failure at one provider
- Expired certificates :: Different problem.
- Slow disks :: Unrelated.
- Wrong MTU :: Unrelated.
> Remove the single point of failure.

Q: When should you lower a record's TTL before a planned move?
+ At least one old-TTL period ahead of the change
- After the change :: Too late for caches.
- Never :: Slows the move.
- During the outage :: Too late.
> Plan caches into the schedule.
```

```cards
Inventory :: generated list of domains, zones, certs and CAs
Expiry alerts :: 30, 14, 7 days for certs; 60 and 30 for domains
curl --resolve :: test a new address with the real hostname
Zone as code :: review, pipeline and rollback for DNS changes
Two providers :: avoid one DNS vendor as a single point of failure
```
