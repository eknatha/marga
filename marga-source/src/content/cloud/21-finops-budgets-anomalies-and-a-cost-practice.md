---
title: FinOps: budgets, anomaly alerts and a cost practice
minutes: 11
summary: Set budgets and anomaly alerts, run a regular cost review with engineering and finance, and build cost into design reviews and pipelines so savings last.
---

One-off savings fade. The lasting result comes from a small, boring routine: budgets that alert, a regular review with owners, cost estimates in design and pipelines that show the effect of a change before it ships.

## What you will learn

- Budgets and anomaly detection and how to route alerts
- A weekly and monthly review rhythm
- Cost in design reviews and pull requests
- The roles of engineering, finance and leadership

## Budgets and anomalies

A **budget** is a planned amount per account, team or tag. Set alerts on actual spend (for example at 50, 80 and 100 percent) and on **forecasted** spend, which warns you before the month ends. An **anomaly detector** flags unusual changes in a service or usage type, even when the budget is not near. Route alerts to the owner's team channel, not just to finance, with a link to the cost view for that service, so the person who can act sees it first.

```console
$ aws budgets describe-budgets --account-id 111122223333
$ aws ce get-anomalies --date-interval StartDate=2026-03-01,EndDate=2026-03-15
```

Tune thresholds so alerts are rare and meaningful; an alert that fires every day is ignored.

## A review rhythm

- **Weekly, 15 minutes per team**: top five changes in cost, untagged spend, new anomalies, the next action and its owner.
- **Monthly with finance**: actual against forecast, unit cost trends, commitment coverage and utilization, planned savings and their status.
- **Quarterly**: architecture topics (data transfer, storage tiers, regions), commitment renewals, targets.

Write down actions with owners and dates. Celebrate wins in public, since people repeat what gets noticed.

## Cost in design and delivery

Add a **cost section** to design documents: expected traffic, major cost drivers, a rough monthly estimate and what could surprise us. In pull requests for infrastructure code, show the estimated cost change (tools such as Infracost can do this for Terraform). Add guardrails: default instance sizes, allowed regions, required tags, budgets created together with new accounts, and limits on expensive services in non-production.

```yaml
budget_policy:
  new_account:
    monthly_budget: 2000
    alerts: [50, 80, 100]
    forecast_alert: true
    required_tags: [team, service, env]
  non_prod:
    allowed_regions: [eu-west-1]
    schedule: office-hours
```

## Who does what

Engineering owns the usage and the design. Finance owns forecasting, allocation rules and reporting. Leadership sets targets and removes blockers. A small FinOps group (often part of the platform team) builds the tooling and the reports and coaches teams. Measure the practice by unit cost trends, tag coverage, commitment utilization and the share of spend that has an owner, not only by the total.

```predict
Q: A team's cost doubled in a day, but the monthly budget alert is far from firing. How would you still find out?
???
An anomaly alert on day-over-day change per service or tag, routed to the owning team, would catch it within a day.
> Budgets catch totals, anomalies catch shifts.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How FinOps: budgets, anomaly alerts and a cost... fits together
node: n1 | Budgets and anomalies | 0 | 0 | A budget is a planned amount per account, team or tag. | One budget alert at 100 percent. | process
node: n2 | A review rhythm | 1 | 1 | Weekly, 15 minutes per team: top five changes in cost, untagged spend, new anomalies, the next action and its owner. | Alerts sent only to finance. | process
node: n3 | Cost in design and delivery | 2 | 0 | Add a cost section to design documents: expected traffic, major cost drivers, a rough monthly estimate and what could surprise us. | Treating cost as a once-a-year clean-up. | process
node: n4 | Who does what | 3 | 1 | Engineering owns the usage and the design. | Reviews that produce no owned actions. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The weekend loop

> **Incident:** A misconfigured retry loop in a data job wrote the same objects millions of times over a long weekend, and the bill arrived three weeks later.

```console
$ aws ce get-cost-and-usage --time-period Start=2026-03-07,End=2026-03-10 --granularity DAILY --metrics UnblendedCost --group-by Type=DIMENSION,Key=SERVICE
```

There was a monthly budget with a single alert at 100 percent, sent to a finance mailbox, and no anomaly detection. The loop cost several times a normal month's storage line. The team added daily anomaly alerts routed to owners, a forecast alert at 80 percent, request-rate limits on the job and a weekly review. Two months later a similar bug was caught within five hours.

## Common mistakes

- One budget alert at 100 percent
- Alerts sent only to finance
- Reviews that produce no owned actions
- Treating cost as a once-a-year clean-up

```quiz
Q: What does a forecast alert add to a budget?
+ A warning before the month ends if spend is projected to exceed the budget
- A refund :: Not provided.
- Free storage :: Not provided.
- A new account :: Not provided.
> It warns early.

Q: Who should receive a cost anomaly alert?
+ The team that owns the service
- Only the finance mailbox :: Too far from the cause.
- Nobody :: Defeats the purpose.
- A random engineer :: Not accountable.
> Route to the owner.

Q: What belongs in a design document's cost section?
+ Expected cost drivers, a monthly estimate and likely surprises
- The brand colors :: Unrelated.
- The team lunch :: Unrelated.
- Only the final bill :: Too late.
> Think about cost before building.

Q: Which measures show a healthy FinOps practice?
+ Unit cost trend, tag coverage and commitment utilization
- Number of alerts muted :: A bad sign.
- Count of dashboards :: Not outcome.
- Total spend alone :: Misses efficiency.
> Look at efficiency and ownership.
```

```cards
Budget alerts :: actual and forecast thresholds
Anomaly detection :: flags unusual change even under budget
Weekly review :: top changes, untagged spend, owned actions
Cost section :: drivers and estimate in every design doc
Guardrails :: default sizes, allowed regions, required tags
```
