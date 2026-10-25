---
title: DNS and name resolution
minutes: 15
summary: Understand how names become addresses, read dig output, and plan DNS changes so users do not hit the old server.
---

You migrate the shop to new servers and update its DNS record. You test, it works, and you decommission the old host. An hour later, support reports that some customers get errors while others are fine. The new address is correct. The problem is that part of the world still remembers the old one.

## What you will learn

- How a name lookup travels from your laptop to the answer
- The common record types
- How TTL and caching decide when a change becomes visible
- How to query DNS with `dig`

## How a lookup works

Your application asks the operating system, which asks a **stub resolver** configured in `/etc/resolv.conf` or by `systemd-resolved`. That forwards the question to a **recursive resolver**, often run by your ISP, your company or a public service. The recursive resolver does the legwork and caches the answer:

1. Ask a **root server** where to find `.com`
2. Ask a **`.com` server** where to find `example.com`
3. Ask the **authoritative server** for `example.com`, which owns the real answer

Each answer carries a **TTL** (time to live) in seconds. Resolvers keep the answer for that long before asking again.

## Record types

| Type | Maps | Example |
|------|------|---------|
| `A` | Name to IPv4 address | `shop.example.com. A 203.0.113.10` |
| `AAAA` | Name to IPv6 address | `shop.example.com. AAAA 2001:db8::10` |
| `CNAME` | Name to another name (an alias) | `www CNAME shop.example.com.` |
| `MX` | Mail servers for a domain | `example.com. MX 10 mail.example.com.` |
| `TXT` | Free text: SPF, domain verification | `"v=spf1 include:_spf.example.com ~all"` |
| `NS` | Which servers are authoritative | `example.com. NS ns1.example.net.` |

A CNAME cannot coexist with other records on the same name, which is why the bare domain (the zone apex) usually uses an `A` record or a provider-specific alias type.

## Querying with dig

```console
$ dig shop.example.com A +noall +answer
shop.example.com.	3600	IN	A	203.0.113.10
$ dig +short shop.example.com
203.0.113.10
$ dig @8.8.8.8 shop.example.com +noall +answer
shop.example.com.	3600	IN	A	203.0.113.10
$ dig +trace shop.example.com | tail -3
shop.example.com.	3600	IN	A	203.0.113.10
;; Received 61 bytes from 198.51.100.53#53(ns1.example.net) in 22 ms
```

This is sample output using documentation-reserved addresses. The second number in each answer (3600) is the **remaining TTL**. Asking your local resolver twice shows it counting down, which proves the answer came from cache. `@8.8.8.8` sends the question to a specific resolver, which lets you compare what different resolvers believe. `+trace` walks the hierarchy yourself, bypassing caches, so it shows what the authoritative servers say right now.

Locally, check what the machine uses:

```console
$ resolvectl query shop.example.com
shop.example.com: 203.0.113.10                 -- link: eth0
$ getent hosts shop.example.com
203.0.113.10    shop.example.com
```

`getent hosts` follows the same path as most applications, including `/etc/hosts`, so use it when `dig` and the application disagree.

## Incident: half the users still reach the old server

> **Incident:** The `A` record for `shop.example.com` changed from `198.51.100.20` to `203.0.113.10`. Some users still land on the old host, which was switched off.

Query the authoritative servers directly, then a public resolver, and look at the TTL:

```console
$ dig +trace +noall +answer shop.example.com
shop.example.com.	86400	IN	A	203.0.113.10
$ dig @1.1.1.1 shop.example.com +noall +answer
shop.example.com.	61310	IN	A	198.51.100.20
```

The authoritative answer is correct and has a TTL of **86400 seconds (24 hours)**. The public resolver still serves the old address with about 17 hours left. Anyone behind that cache will keep hitting the old server until it expires. You cannot force other people's resolvers to forget.

The fix for now is to bring the old server back, or at least a redirect, until the TTL passes. The fix for next time is a planned sequence:

1. Days before the change, **lower the TTL** to 60 or 300 seconds and wait for the old TTL to expire.
2. Make the change.
3. Leave the old server running until traffic stops.
4. Raise the TTL again afterwards.

> **Tip:** Browsers, the operating system and some applications cache DNS too. A long-running Java process may cache a lookup for the life of the process. If one machine keeps using an old address, restart the application or check its DNS cache settings.

```diagram
title: How a name becomes an address
node: app | Application | 0 | 1 | Asks the system resolver for www.example.com. | A wrong resolv.conf means the question goes to the wrong server.
node: res | Recursive resolver | 1 | 1 | Checks its cache, then walks the tree on your behalf. | A stale cache keeps giving an old address until the TTL ends.
node: root | Root and TLD servers | 2 | 0 | Point to the servers for .com and then for example.com. | If they cannot be reached, only cached names still work.
node: auth | Authoritative server | 2 | 2 | Holds the real records and answers with an A or CNAME and a TTL. | A wrong record here is the source of truth for everyone.
node: ans | Answer and cache | 3 | 1 | The resolver caches the answer and returns it. | A very long TTL makes a change slow to spread.
edge: app | res
edge: res | root
edge: res | auth
edge: root | ans
edge: auth | ans
```

## Common mistakes

- Switching off the old server immediately after a DNS change
- Testing only from your own network, which uses one cached view
- Putting a CNAME on the zone apex
- Forgetting that `/etc/hosts` overrides DNS for that machine

```quiz
Q: What does the TTL on a DNS record control?
- How many servers answer the query
+ How long resolvers may cache the answer before asking again
- How fast the record is created
- The priority of mail servers
> TTL is the cache lifetime in seconds. It decides how long old answers can persist after a change.

Q: Which command bypasses caches and walks from the root to the authoritative servers?
- dig +short name
+ dig +trace name
- ping name
- getent hosts name
> +trace performs the resolution step by step starting at the root, so it shows what authoritative servers currently say.

Q: You are changing a record that has a 24-hour TTL. What should you do days beforehand?
- Delete the record
+ Lower the TTL and wait for the old value to expire
- Raise the TTL to a week
- Switch off the old server
> A short TTL set in advance means caches expire quickly when you make the real change.

Q: Which record type points one name at another name?
- A
- MX
+ CNAME
- NS
> A CNAME makes a name an alias of another name. A maps to an IPv4 address.
```

```cards
What is TTL? :: The number of seconds a resolver may cache a DNS answer
How to query a specific resolver with dig? :: dig @RESOLVER name
Why lower TTL before a migration? :: So the change becomes visible quickly when you make it
Which command follows the application's lookup path including /etc/hosts? :: getent hosts name
```
