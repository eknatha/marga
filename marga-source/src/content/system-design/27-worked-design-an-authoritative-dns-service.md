---
title: Worked design: an authoritative DNS service
minutes: 16
summary: Design the name service that everything else depends on: anycast, zone data safety, DDoS resilience and the discipline of not changing everything at once.
---

DNS is the dependency under every other dependency. If your names stop resolving, nothing else matters, and your tools to fix it may depend on DNS too. Designing an authoritative service means designing for extreme availability, abuse and careful change.

## What you will learn

- Estimate query load and design anycast serving
- Keep zone data consistent and changes safe
- Resist floods and avoid a single provider
- Plan for the failure of the service that serves its own names

## 1. Clarify

Serve authoritative answers for customer zones (or a company's internal and public zones). Queries are small UDP requests, with TCP and DNSSEC as required. Customers update records through an API and expect changes to appear globally within a minute. Availability target: 100 percent of queries answered in practice; a published SLO of 99.999 percent. A wrong answer is worse than no answer for many records.

## 2. Estimate

100 million zones, 5 billion queries per day on average is about 58,000 per second, with attacks capable of 100x that. Each response is 100 to 500 bytes. A single modern server can answer hundreds of thousands of simple queries per second, so ordinary load is small; the design is driven by attack traffic, geographic latency and availability. Zone data: 100 million zones at about 1 KB each is about 100 GB, which fits in memory per node with compact encoding.

## 3. Sketch

A control plane (API, validation, change pipeline, zone database) and a data plane (name servers in many locations announcing the same addresses by anycast). Zone data flows one way from control to data plane through a replicated distribution system, and each name server serves from a local copy so it can keep answering if the control plane is gone.

## 4. Deep-dive

**Anycast.** Many sites announce the same IP addresses; routing sends each client to a nearby healthy site, and a failing site withdraws its routes. This absorbs floods (attack traffic spreads across sites) and cuts latency. Publish several name server addresses from different network prefixes and different providers so one routing problem or one provider cannot remove them all. In October 2016 an attack on Dyn, partly from devices infected with the Mirai botnet, made many popular sites unreachable for users on the US East Coast; sites that used only that provider had no alternative. See the case file.

**Static stability.** Each site keeps its last known good zone data and keeps answering when the control plane or distribution is down. Health checks withdraw a site from anycast only when it cannot answer correctly, and never withdraw everything: a rule that withdraws a site if it cannot reach its backend can withdraw every site when the backend fails. Facebook's outage on 4 October 2021 removed routes to its DNS servers after a configuration change on the backbone, and the name stopped resolving; the case file uses Cloudflare's outside view.

**Zone data safety.** Treat zone changes as deployments. Validate syntax and semantics before publishing, run checks for dangerous changes (deleting an apex record, large deletions, a change that would remove most records), stage by site or percentage, watch for answer anomalies, and keep versioned snapshots for instant rollback. In July 2021 a software configuration update triggered a bug in a DNS component of Akamai's Secure Edge CDN, and some customer websites were unavailable for up to about an hour until it was rolled back. See the case file.

**Software diversity and safe releases.** A bug in name server software hits every site that runs it. Run releases through canary sites, bake time and automatic rollback on answer error rate; consider running two independent implementations at different sites so one bug cannot take all of them.

**Abuse and floods.** Rate limit per source with response rate limiting to blunt reflection abuse, drop malformed queries early, size for peak attack traffic with headroom, and use scrubbing for volumetric attacks. Keep TTLs on your own critical records sensible: short TTLs speed failover and increase query load; long TTLs hide problems for hours.

**Consistency and propagation.** Choose the freshness promise: changes visible within a minute at all sites. Distribute through a versioned log, show the version each site serves, and alert on sites that lag. Secondary DNS providers receive transfers or API updates; make sure the second provider is genuinely independent.

**Its own dependencies.** The control plane, its authentication, and the tools used to repair the service must not depend on the service's own names. Keep break-glass access by IP address.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Volumetric attack | sites saturated | anycast spread, headroom, scrubbing, rate limits |
| Bad zone change | wrong or empty answers | validation, staged rollout, snapshots, rollback |
| Control plane down | no updates | sites serve last good data |
| Bad software release | all sites crash | canary, bake, rollback, second implementation |
| Site withdrawal cascade | no sites left | never withdraw all, health rules reviewed |
| Provider outage | some addresses dark | multiple prefixes and providers |
| Lag between sites | inconsistent answers | version tracking, lag alerts |

## 6. Trade-offs

Short TTLs help failover and increase load. Two software implementations double maintenance and cut correlated failure. Aggressive health-based withdrawal removes sick sites quickly and risks cascades. A second provider costs money and demands careful zone sync. Choose and write it.

```predict
Q: A health rule withdraws a site's anycast route if it cannot reach the zone database. The database fails. What happens?
???
Every site fails the check and withdraws its route, so no site is left to answer and the names stop resolving. Sites should serve their last good local data and never withdraw all at once.
> Health checks can turn a backend fault into a total outage.
```

## How it fails

A single provider or single prefix. A health check that depends on the control plane. Zone changes pushed everywhere at once. The repair tools depending on the names that are down.

## Incident: When the name servers disappear

> **Incident:** The routes to the DNS servers were withdrawn and the name stopped resolving anywhere.

```console
$ dig +short NS example-service.net
;; connection timed out; no servers could be reached
$ bgpctl show ip bgp 198.51.100.0/24
network not in table
```

The console output is a simulated illustration with documentation addresses. The real events in the case files are Facebook on 4 October 2021 (routes to its DNS servers withdrawn after a backbone configuration change), the Dyn attack of 21 October 2016, and the Akamai edge DNS bug of 22 July 2021. The shared design lessons are static stability, staged change, independent providers and recovery tools that do not need the broken names.

## Interview question

"Design an authoritative DNS service." Use anycast across diverse prefixes and providers, local zone copies, validated and staged zone changes, rate limiting, canary software releases, static stability, and an independent control plane and break-glass access.

## Common mistakes

- All name servers on one provider or prefix
- Health checks that withdraw every site together
- Zone changes applied everywhere at once
- Repair tools that need the broken service

```quiz
Q: What does anycast give a DNS service?
+ Nearby routing, spread of attack traffic and withdrawal of failing sites
- Encryption of zones :: Not its purpose.
- Faster zone editing :: Not its purpose.
- Automatic backups :: Not its purpose.
> Correct: Nearby routing, spread of attack traffic and withdrawal of failing sites. Re-read the matching lesson section for the full reasoning.

Q: What should a name server do if the control plane is unreachable?
+ Keep serving its last known good zone data
- Stop answering :: Causes an outage.
- Serve empty answers :: Wrong data.
- Restart in a loop :: Makes it worse.
> Correct: Keep serving its last known good zone data. Re-read the matching lesson section for the full reasoning.

Q: Why use more than one DNS provider?
+ A single provider outage or attack should not remove all name servers
- It halves query load :: Not the reason.
- It removes the need for TTLs :: No.
- It encrypts queries :: No.
> Correct: A single provider outage or attack should not remove all name servers. Re-read the matching lesson section for the full reasoning.

Q: Which zone change deserves extra protection?
+ A large deletion or removal of apex records
- Adding one new A record :: Low risk.
- Changing a comment :: Low risk.
- Reading a zone :: No change.
> Correct: A large deletion or removal of apex records. Re-read the matching lesson section for the full reasoning.
```

```cards
anycast :: same IP announced from many sites
authoritative server :: holds the real records for a zone
TTL :: seconds a resolver may cache an answer
static stability :: keep serving last good data without the control plane
response rate limiting :: limiting identical responses to blunt reflection
zone snapshot :: versioned copy for rollback
```
