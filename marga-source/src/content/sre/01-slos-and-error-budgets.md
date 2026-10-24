---
title: SLIs, SLOs and error budgets
minutes: 16
summary: Define reliability in numbers users care about, set targets that balance speed and stability, and use error budgets to make release decisions.
---

"The site should be reliable" is not a target. Nobody can tell whether it was met, whether it is worth more investment, or when to stop shipping features and fix things. Site reliability engineering gives reliability a number, an agreed target, and a rule for what to do when the target is at risk.

## What you will learn

- SLIs, SLOs and SLAs, and how they differ
- Choosing good indicators
- Calculating an error budget
- Using the budget to guide decisions

## Three terms

| Term | Meaning | Example |
|------|---------|---------|
| **SLI** (indicator) | A measurement of service behaviour | Share of requests that succeed and finish within 300 ms |
| **SLO** (objective) | An internal target for an SLI over a window | 99.9% of requests are good over 30 days |
| **SLA** (agreement) | A contract with consequences, usually financial | Credits if monthly availability drops below 99.5% |

The SLO is stricter than the SLA, so you notice trouble before you owe a customer anything.

## Choosing SLIs

Measure what users experience, from as close to the user as practical (load balancer or client, not an internal health check). A good SLI is a **ratio of good events to valid events**:

```text
SLI = good requests / valid requests
```

| Service type | Useful SLIs |
|--------------|-------------|
| Request-driven API | Availability (non-5xx ratio), latency (share faster than a threshold) |
| Data pipeline | Freshness (data newer than N minutes), correctness, completeness |
| Storage | Durability, availability |
| Batch job | Completed on schedule |

Pick a few per service. Three to five is plenty, and focus on the **critical user journeys**, such as sign in, search and checkout, rather than every endpoint.

## Setting the target

Higher is not always better. Each extra nine costs far more and slows delivery. Users' own devices and networks fail too, so past a point they cannot tell the difference.

| Availability target | Downtime allowed per 30 days |
|---------------------|------------------------------|
| 99% | about 7 hours 12 minutes |
| 99.9% | about 43 minutes |
| 99.95% | about 21 minutes |
| 99.99% | about 4 minutes |

Calculate it yourself: a 30-day window has 43,200 minutes, and 0.1% of that is 43.2 minutes. Start from what users actually need, look at what you currently achieve, and set a target you can meet with reasonable effort, then tighten it deliberately.

## The error budget

The **error budget** is the amount of unreliability the SLO allows:

```text
error budget = 1 - SLO
```

For a 99.9% SLO over 30 days, you may fail 0.1% of requests. If you serve 10 million requests, that is 10,000 failures. The budget turns reliability into something you can spend:

- **Budget remaining**: ship features, run experiments, make risky changes.
- **Budget low or exhausted**: slow down. Prioritize reliability work, freeze risky releases, and fix what is burning the budget.

This is the heart of the idea: product and engineering share one number, so the argument "features versus stability" becomes a decision rule agreed in advance. Reliability is a feature that competes for the same effort.

## Measuring it

```promql
# Availability SLI over 30 days
sum(rate(http_requests_total{service="shop-api", status!~"5.."}[30d]))
  /
sum(rate(http_requests_total{service="shop-api"}[30d]))

# Fraction of the error budget remaining (99.9% SLO)
1 - (
  (1 - (sum(rate(http_requests_total{service="shop-api", status!~"5.."}[30d]))
        / sum(rate(http_requests_total{service="shop-api"}[30d]))))
  / 0.001
)
```

Long-range queries like these are costly, so teams precompute them with recording rules. Display the remaining budget on the service dashboard where everyone can see it.

## Incident: the budget is gone on day twelve

> **Incident:** The checkout SLO is 99.9% over 30 days. On day 12 the dashboard shows the budget at -20%: more failures have occurred than the whole month allows.

The numbers say what must happen next, and the policy should already have said so. Look at what consumed it:

```console
Budget spent (12 days):
  Release 3.2.0 rollback (day 4):      55%
  Payment provider timeouts (day 8):   40%
  Everything else:                     25%
```

Two events made up 95% of the loss. The agreed response is to pause non-urgent feature releases for the service, spend the sprint on the causes (a safer rollout with automatic canary abort, and timeout and fallback behaviour for the payment provider), and review again when the budget recovers as the window moves on. Importantly, the conversation was about data and a policy everyone had signed up to, not about whose fault it was. If the budget is *never* used, that is also a signal: the target may be too strict, and you could be shipping faster.

## Common mistakes

- Setting SLOs at 100% or at whatever the service happens to do today
- Measuring server health instead of user experience
- Too many SLOs, none of them used to make decisions
- SLOs with no policy for what happens when the budget is spent

```quiz
Q: What is an error budget?
- The money allocated to fix bugs
+ The amount of unreliability the SLO allows, equal to 1 minus the SLO
- The number of engineers on call
- A log retention limit
> It quantifies how much failure is acceptable in the window.

Q: Approximately how much downtime does 99.9% allow in 30 days?
- 4 minutes
+ 43 minutes
- 7 hours
- 3 days
> 0.1% of 43,200 minutes is 43.2 minutes.

Q: What should happen when the error budget is exhausted?
- Nothing
+ Slow risky releases and prioritize reliability work, as agreed in the SLO policy
- Delete the SLO
- Add more features faster
> The budget is a shared decision rule between product and engineering.

Q: Which is the best form of SLI?
- CPU utilization
+ Good events divided by valid events as experienced by users
- Number of servers
- Memory usage
> A ratio of good to valid events measures user-visible quality.
```

```cards
SLI, SLO, SLA? :: Indicator measures, objective is the internal target, agreement is the contract with consequences
Error budget formula? :: 1 minus the SLO
Allowed downtime at 99.9% per 30 days? :: About 43 minutes
Why not aim for 100%? :: It is prohibitively expensive, slows change, and users cannot notice the difference
```
