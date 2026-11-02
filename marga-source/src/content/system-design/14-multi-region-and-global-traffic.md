---
title: Multi-region design and global traffic
minutes: 16
summary: Choose between active-passive and active-active, set RTO and RPO, and steer traffic with DNS and anycast without creating new single points.
---

A second region protects against a region failing. It also doubles the things that can go wrong: data in two places, traffic steering, and a failover path that is rarely used. Multi-region is a trade, and it only helps if you can show it works.

## What you will learn

- Define RTO and RPO and map them to a pattern
- Compare backup and restore, pilot light, warm standby and active-active
- Handle data across regions
- Steer traffic with DNS, anycast and health checks

## RTO and RPO

**RTO** (recovery time objective) is how long you can be down. **RPO** (recovery point objective) is how much data you can lose, measured in time. A target of RTO 1 hour and RPO 5 minutes rules out nightly backups alone. State both, per service, with the business owner.

## Patterns

- **Backup and restore:** hours of RTO, data loss up to the last backup. Cheapest.
- **Pilot light:** core data replicated, compute off until needed. Minutes to hours.
- **Warm standby:** a scaled-down copy running, scaled up on failover. Minutes.
- **Active-active:** both regions serve traffic. Seconds, highest cost and complexity.

Active-passive is simpler, but the standby is untested by real traffic, so failover often fails when first used. Active-active tests both paths all the time, but writes need an answer: one write region per customer (sticky home region), a store with multi-region writes and a conflict rule, or accept stale reads in the second region. Latency across regions (100 to 200 milliseconds between continents) rules out synchronous writes on user paths.

## Data is the hard part

Asynchronous replication risks losing the last seconds on failover (RPO above zero). Synchronous across regions costs latency on each write. Pick per dataset. After a failover, decide how to fail back, and how to reconcile writes accepted during the split. Practise it.

## Steering traffic

- **DNS (GeoDNS, weighted, health-checked):** simple; limited by TTL and caches that ignore it, so failover takes minutes. Keep records low in TTL if you depend on it.
- **Anycast:** many locations announce the same IP; routing sends users to a nearby one; a failed site withdraws its route. Fast, but it ties you to routing and can send a user's packets to different sites mid-connection.
- **Global load balancers:** health-check regions and shift traffic.

Make sure the steering layer is not the single point of failure. The Facebook outage on 4 October 2021 removed routes to its DNS servers, so the name stopped resolving anywhere. Dyn's DNS attack in 2016 took down many sites that used one DNS provider. Using two independent DNS providers is a standard mitigation. Akamai's edge DNS bug in 2021 shows a vendor change can fail globally in minutes.

## Region-wide dependencies

Some services are effectively global in one place. A region can be "up" while the identity or control-plane API it needs runs elsewhere. The October 2025 AWS DynamoDB DNS fault in us-east-1 left many AWS services failing for about 15 hours, which shows how much can hang on one regional endpoint. Map which calls leave your region and test with that region blocked.

## Prove it

Run failover drills on a schedule. Verify capacity: the surviving region must take 100 percent of load (or the load you promise), not 50. Track the time from decision to full traffic and compare it with the RTO.

```predict
Q: Two regions each run at 60 percent of capacity and you call it active-active for high availability. One region fails. What happens?
???
The survivor needs 120 percent of its capacity, so it overloads. Active-active at N regions needs headroom so the survivors can absorb the lost share, or load shedding to protect the core.
> Availability is capacity plus design.
```

## How it fails

A standby that was never exercised. A runbook that depends on the region that failed. DNS caches pinning users to a dead region. Replication lag larger than the RPO. Credentials or configs present only in the primary.

## Incident: The name that stopped resolving

> **Incident:** A change on the internal backbone withdrew the routes to the company's DNS servers. The domain stopped resolving and internal tools that used the same network were also unreachable.

```console
$ dig +short example-social.com NS
;; connection timed out; no servers could be reached
$ traceroute -n 203.0.113.53
 1  10.0.0.1  0.4 ms
 2  *
```

The console output is a simulated illustration. In the real 4 October 2021 outage the services were down about six hours; the case file uses Cloudflare's outside view as its source. The design lesson: keep the means to fix a failure, such as out-of-band access and status communication, off the system that is failing.

## Interview question

"Design a service for 99.99 percent across regions." Cells in each region, active-active with a home region per customer, health-checked traffic steering with two DNS providers, staged deploys per region, tested failover with survivor capacity, and a clear RPO per dataset.

## Common mistakes

- No capacity in the surviving region
- One DNS provider
- A failover path used only in drills
- A recovery plan hosted on the failing system

```quiz
Q: What does RPO measure?
+ How much data, in time, you can afford to lose
- How long you can be down :: That is RTO.
- Cost of a region :: No.
- Network latency :: No.
> Correct: How much data, in time, you can afford to lose. Re-read the matching lesson section for the full reasoning.

Q: Why is active-passive failover risky?
+ The standby path is rarely exercised and may fail when first needed
- It costs more than active-active :: Usually less.
- It cannot replicate data :: It can.
- It needs no testing :: The opposite.
> Correct: The standby path is rarely exercised and may fail when first needed. Re-read the matching lesson section for the full reasoning.

Q: Why use two independent DNS providers?
+ One provider failing should not stop name resolution
- It doubles the TTL :: No.
- It speeds queries :: Not the aim.
- It removes the need for health checks :: No.
> Correct: One provider failing should not stop name resolution. Re-read the matching lesson section for the full reasoning.

Q: Two regions at 60 percent load each. One fails. What is the problem?
+ The survivor needs 120 percent of its capacity
- Nothing, 60 plus 60 fits :: It does not fit.
- Latency drops :: No.
- Replication speeds up :: No.
> Correct: The survivor needs 120 percent of its capacity. Re-read the matching lesson section for the full reasoning.
```

```cards
RTO :: how long you can be down
RPO :: how much data you can lose
warm standby :: scaled-down copy ready to grow
active-active :: both regions serve users
anycast :: many sites announce one IP
home region :: customer's single write region
```
