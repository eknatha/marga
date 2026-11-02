---
title: Worked design: a global API with a 99.99 percent SLO
minutes: 18
summary: Design a public API for 99.99 percent availability end to end, using cells, regions, safe rollout and degradation, then review it against real outages.
---

Four nines allows about 4.3 minutes of full unavailability in a 30 day month (0.01 percent of 43,200 minutes). One slow human response uses the whole budget. So the design must prevent most failures from reaching users and must recover automatically for the rest. This lesson walks the six-step method on a concrete problem.

## What you will learn

- Turn an SLO into design requirements
- Compose cells, regions, traffic steering, limits and rollout into one design
- Write down the failure modes and the budget each consumes
- Review the design against real outages

## 1. Clarify

A public REST API for payments-style requests, global customers, 99.99 percent monthly availability measured at the edge as the share of valid requests answered successfully within 1 second. Writes must never be duplicated. Reads may be up to 5 seconds stale. Out of scope: the dashboard and the batch exports.

## 2. Estimate

Assume 20,000 requests per second at peak, 70 percent reads, 3x peak to average. Average payload 2 KB. Data growth 500 GB per month. One cell sized for 5,000 requests per second at 60 percent utilisation gives 3,000 comfortable. Four cells give 12,000 which is not enough for peak with one lost, so plan 8 cells of 3,000 at steady state: peak 20,000 uses 7 cells, losing one still leaves headroom. Assumptions written down for review.

## 3. Sketch

- Two or three regions, each with several cells; each customer has a home cell in a home region.
- A thin global router (anycast plus health-checked DNS from two providers) sends a request to a region; a thin cell router sends it to the customer's cell.
- A cell: gateway with rate limits, stateless API services, a database primary with a synchronous replica in a second zone, an asynchronous replica in another region, a queue for non-critical work, a cache.
- Idempotency keys on every write.

## 4. Deep-dive on the risks

**Data:** home-region writes with synchronous replication across zones, asynchronous across regions. RPO inside a region is zero; across regions is seconds. Failover for a cell promotes the zone replica automatically with fencing; promotion to another region needs a human decision because it can lose seconds of writes and splits traffic.

**Rollout:** the biggest outage source. Code and configuration go cell by cell: one canary cell, 15 minute bake with automatic halt on error rate or latency, then cells in groups, one region at a time. No global fast path. Configuration changes use the same pipeline.

**Overload:** token bucket per customer at the gateway, concurrency limits per service, priority classes (payments critical, exports shed first), load shedding with 429 and Retry-After. Retries only from the edge client with a budget.

**Degradation:** reads fall back to the replica or cache when the primary is slow; the fraud scorer fails closed for large amounts and fails open with a flag for small ones; webhooks queue.

## 5. Failure modes and the budget

| Failure | Blast radius | Expected effect |
| --- | --- | --- |
| Instance crash | one pod | none, retried |
| Zone loss | one third of a cell | brief errors, automatic promotion |
| Cell database failure | one cell, about 12 percent of customers | seconds to minutes for those customers |
| Bad code release | canary cell first | caught in bake, under 1 percent for 15 minutes |
| Bad config push | canary cell first | same, staged |
| Region loss | up to half of users | decision-based failover, minutes |
| Shared dependency (DNS, identity) | all | two DNS providers, cached tokens, static stability |

Weighted by frequency, the sum must stay under 4.3 minutes. The honest answer is that a 12 percent cell outage of 20 minutes costs 2.4 minutes of effective global unavailability, so frequency matters; a small cell count and well-tested recovery keep it in budget.

## 6. Trade-offs

Cells cost more (duplicate infrastructure, harder cross-customer queries). Home regions add latency for far customers. A synchronous replica adds write latency of a millisecond or so within a region. No global transactions across customers. State what the business gave up for the SLO.

## Review against real outages

- Cloudflare bot-management file (2025) and Azure Front Door (2025): one change to everything. Your staged rollout and fail-static loaders answer these.
- Google Service Control (2025): replicated policy data crashing every region. Your configuration goes cell by cell.
- AWS DynamoDB DNS (2025): an empty regional DNS record from automation. Your static stability and dependence map apply.
- GoCardless (2017): failover that did not run. Your drills and fencing apply.

```predict
Q: A bad release is detected after 12 minutes in the canary cell, which serves 12 percent of traffic and was failing half its requests. How much of the monthly error budget did that consume, roughly?
???
About 6 percent of requests failed for 12 minutes, which is 12 minutes times 0.06 equal to about 0.72 minutes of full outage, around 17 percent of the 4.3 minute budget. A smaller first stage would cost less.
> Blast radius times duration is the budget cost.
```

## How it fails

The design passes review and decays: the router grows features, someone adds a global cache, a fast path appears. Re-run the dependency map and a failover drill every quarter, and track budget burn.

## Incident: A canary that was too big

> **Incident:** The first stage of a rollout was 25 percent of all traffic. A fault there used most of the quarterly error budget in one afternoon.

```console
$ slo report --window 30d --service api
availability 99.962%  target 99.990%  budget_remaining -180%
```

This console output is a simulated illustration of budget arithmetic, not a named company. The fix was a first stage of one cell (under 5 percent), a bake time with automatic halt, and a policy that a depleted budget freezes risky changes. See the SRE module for error budget policy.

Try the budget arithmetic yourself in the [System design lab](#/system-design-lab): estimate the load, then fail each part of a design and watch the budget.

## Interview question

"Design an API with 99.99 percent availability." Use the structure above and state the budget math out loud.

## Common mistakes

- Two zones and a load balancer, called four nines
- No staged rollout
- Failover plans never drilled
- No written trade-offs

```quiz
Q: About how many minutes of downtime does 99.99 percent allow in a 30 day month?
+ About 4.3
- About 43 :: That is 99.9 percent.
- About 0.4 :: That is 99.999 percent.
- About 430 :: That is 99 percent.
> 0.0001 times 43,200 minutes.

Q: What bounds the damage of a bad release best?
+ Staged rollout cell by cell with automatic halt
- Adding replicas :: They run the same bad code.
- A longer code review only :: It does not catch everything.
- A bigger database :: Unrelated.
> Correct: Staged rollout cell by cell with automatic halt. Re-read the matching lesson section for the full reasoning.

Q: Why does cross-region failover need a human decision in this design?
+ It can lose seconds of writes and split traffic
- Regions cannot fail over :: They can.
- It is free :: It is not.
- DNS forbids it :: No.
> Correct: It can lose seconds of writes and split traffic. Re-read the matching lesson section for the full reasoning.

Q: What should you write at the end of a design?
+ The trade-offs and what was given up
- Only the diagram :: Not enough.
- Vendor names :: Not the point.
- The estimated cost only :: Not enough.
> Correct: The trade-offs and what was given up. Re-read the matching lesson section for the full reasoning.
```

```cards
error budget :: allowed unreliability for an SLO
four nines :: about 4.3 minutes a month
canary cell :: first small stage of a rollout
home region :: where a customer's writes go
fencing :: stops an old primary writing
bake time :: wait and watch between stages
```
