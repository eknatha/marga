---
title: Hidden dependencies and single points of failure
minutes: 13
summary: Map what your service really needs, including the tools you use to fix it, and find the single points before an outage does.
---

A diagram shows the dependencies you remember. Outages come from the ones you forgot: the certificate authority, the DNS provider, the identity service, the status page hosted on the same cloud account, the chat tool you coordinate in. This lesson is a method to find them.

## What you will learn

- Build a dependency map including runtime, build, deploy and recovery paths
- Find single points of failure and hard cycles
- Handle third-party and shared platform dependencies
- Keep your recovery tools independent of the system they recover

## Four dependency graphs

1. **Serving:** what a user request touches: DNS, CDN, gateway, services, databases, identity, payments.
2. **Build and deploy:** source host, registry, CI, secrets, artifact store, deploy tool. Docker Hub pull limits blocked builds and clusters that pulled from shared addresses.
3. **Operate:** metrics, logs, alerting, paging, on-call chat, runbooks, access (VPN, SSO).
4. **Recover:** backups and their keys, access to restore, DNS to fail over, the status page.

Teams usually map the first and forget the other three.

## How to find hidden ones

- Trace one request with distributed tracing and list every hostname called.
- Read egress logs and DNS logs; each external name is a dependency.
- Ask for each: if this is down, what do we lose, and for how long? Rank by impact.
- Block each dependency in staging, one by one, and watch.
- List who holds the credentials needed to recover, and where they are stored.

## Cycles

A cycle is when A needs B to start and B needs A. Examples: a cluster that pulls its images from a registry running on that cluster; a secrets store that needs a secret to unlock; a DNS service whose own name must resolve through itself; monitoring that depends on the cluster it monitors. Cycles turn a small fault into a full outage because recovery requires the broken thing. Roblox's 2021 outage was lengthened when monitoring depended on the same Consul cluster that was struggling.

## Single points of failure

One of anything: one DNS provider, one certificate expiry date, one engineer with the key, one account, one region, one person who knows the process. Each needs either removal (a second independent path), or acceptance written down with a reason. Expired certificates are a common single point: Microsoft Teams in 2020 and O2 and Ericsson in 2018 are public cases; track expiry dates and automate renewal.

## Third parties

You inherit the failures of vendors. Cloudflare Workers KV on 12 June 2025 failed when a third-party storage provider had its own outage, and many Cloudflare products went with it. For each vendor ask: what is the contract SLA, what is our fallback, and can we operate without it for an hour, a day?

## Keep recovery independent

Host the status page, the runbooks and the on-call tools outside the platform they describe. Keep break-glass access that works when SSO is down. Keep copies of the critical recovery data in a separate account or provider. Test that you can still reach them with the main system off.

```predict
Q: Your status page is hosted on the same cloud account and DNS as your product. What happens during a full outage?
???
Customers cannot reach the status page either, so you cannot communicate. Host it on independent infrastructure and DNS.
> The thing you use to explain an outage must survive the outage.
```

## How it fails

A map that is a one-off drawing and is stale in a month. A dependency noted but never tested. A break-glass account nobody has tried this year.

## Incident: Monitoring that went down with the cluster

> **Incident:** The monitoring system ran on the platform it watched. When the platform degraded, engineers lost their view of it.

```console
$ curl -s -m 5 https://metrics.internal/api/health
curl: (28) Operation timed out after 5001 milliseconds
$ kubectl get nodes
Unable to connect to the server: net/http: TLS handshake timeout
```

This is a simulated illustration. The Roblox 73-hour case file describes how monitoring that depended on the same cluster made diagnosis harder. The design response is an independent, simple monitoring path for the core platform and an out-of-band way to reach it.

## Interview question

"Walk me through hidden dependencies in a service you ran." List one in each of the four graphs, the test you ran to find it and what you changed.

## Common mistakes

- Mapping only the serving path
- Status page and runbooks on the failing system
- Untracked certificate expiry
- Vendors with no fallback plan

```quiz
Q: Which graph is most often forgotten?
+ Operate and recover (monitoring, access, status page)
- Serving path :: Usually mapped.
- Marketing sites :: Not the point.
- Billing :: Not the point.
> Correct: Operate and recover (monitoring, access, status page). Re-read the matching lesson section for the full reasoning.

Q: What is a dependency cycle?
+ A needs B to start and B needs A
- Two copies of a service :: No.
- A scheduled job :: No.
- A rotating log :: No.
> Correct: A needs B to start and B needs A. Re-read the matching lesson section for the full reasoning.

Q: Where should the status page live?
+ On infrastructure independent of the product
- On the same cluster :: It will fail with it.
- Only in the main DNS zone :: Same weakness.
- Inside the VPN :: Customers cannot reach it.
> Correct: On infrastructure independent of the product. Re-read the matching lesson section for the full reasoning.

Q: How can you discover hidden runtime dependencies?
+ Trace requests and read egress and DNS logs
- Ask the vendor only :: Incomplete.
- Count the servers :: No.
- Read the README :: Often stale.
> Correct: Trace requests and read egress and DNS logs. Re-read the matching lesson section for the full reasoning.
```

```cards
single point of failure :: one of something with no alternative
dependency cycle :: A needs B and B needs A
break-glass :: emergency access that avoids normal systems
out-of-band :: separate path from the main system
egress logs :: record of outbound calls
vendor SLA :: contracted availability from a supplier
```
