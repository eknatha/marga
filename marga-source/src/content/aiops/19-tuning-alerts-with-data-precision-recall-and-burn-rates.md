---
title: Tuning alerts with data: precision, recall and burn rates
minutes: 14
summary: Measure alert quality with precision, recall, MTTA and MTTR, and use SLO burn-rate alerts as the strong non-ML baseline every smarter detector must beat.
---

An alert is a prediction that a person needs to act. Like any prediction it can be right or wrong in two ways, and you can measure both. Teams that measure tune faster and argue less.

## What you will learn

- Define precision, recall and a useful alert-quality scorecard
- Label alerts as actionable or not from tickets and responder notes
- Write multi-window burn-rate alerts for SLOs
- Decide when a machine-learning detector is worth adding

## Precision and recall for alerts

**Precision** is the share of alerts that were worth a response: actionable alerts divided by all alerts. **Recall** is the share of real problems that produced an alert: detected incidents divided by all incidents, including those users reported first. High precision with low recall means quiet pagers and missed outages. High recall with low precision means alert fatigue. You usually trade one against the other, and the aim is a deliberate balance rather than an accident.

## Labelling

You need labels to measure. Cheap sources: did the responder take an action, did the alert link to an incident, did it auto-resolve before anyone looked, was it acknowledged and closed as "no action needed". Add a one-click "not actionable" button to the page and review those weekly. Even rough labels beat none.

## A scorecard

Track per service and per team: alerts per week, share actionable, share that auto-resolved in under 5 minutes, time to acknowledge (MTTA), time to resolve (MTTR), and incidents first reported by users. Review the worst five alert rules every week and fix, merge or delete them.

## Burn-rate alerts

A service level objective (SLO) gives you a principled alert. The **burn rate** is how fast you are using the error budget compared with the rate that would use it exactly over the period. A burn rate of 1 spends the budget just in time. A burn rate of 14.4 over one hour spends about 2 percent of a 30-day budget. Pair a long and a short window: the long window shows the problem is real, the short one shows it is still happening, so the alert clears quickly after recovery.

```promql
# Page: 2% of a 99.9% monthly budget burning in 1 hour (burn rate 14.4)
(
  sum(rate(http_requests_total{service="checkout",code=~"5.."}[1h]))
  / sum(rate(http_requests_total{service="checkout"}[1h]))
) > (14.4 * 0.001)
and
(
  sum(rate(http_requests_total{service="checkout",code=~"5.."}[5m]))
  / sum(rate(http_requests_total{service="checkout"}[5m]))
) > (14.4 * 0.001)
```

A slower ticket-level alert can use a burn rate of 3 over 6 hours with a 30 minute short window. These alerts fire on user impact, need no learned model and are easy to explain.

## When to add machine learning

Treat burn-rate alerts as the baseline. Add a learned detector only where the baseline misses real incidents (recall problem) or where it cannot express the symptom, such as a leading indicator or a metric with no SLO. Measure the new detector against the baseline on the same history. If it does not catch more incidents or reduce noise, it is not worth running.

## Close the loop

Every false positive and miss is a lesson. Add the missed incident to the replay set, change the rule, and rerun the replay to confirm the change helps without hurting others.

```diagram
title: A measurement loop for alert quality
node: alerts | Alerts fired | 0 | 1 | Every page and ticket. | No labels, so no measurement. | external
node: label | Label outcome | 1 | 1 | Actionable, auto-resolved or no action. | Labels only from the loudest incidents. | process
node: score | Scorecard | 2 | 0 | Precision, recall, MTTA, MTTR, alerts per week. | Averages hide the worst rules. | observe
node: slo | Burn-rate baseline | 2 | 2 | SLO alerts on user impact. | Using one window only. | service
node: tune | Tune or retire | 3 | 1 | Fix the worst five rules each week. | Changes without a replay test. | process
edge: alerts | label
edge: label | score
edge: label | slo
edge: score | tune
edge: slo | tune
edge: tune | alerts
```

## Incident: Ninety percent noise

> **Incident:** A team's pager was quiet at night but nobody trusted it, and a real outage sat unacknowledged for eleven minutes.

```console
$ alertreport --team payments --days 30
alerts: 412  actionable: 38 (9%)  auto-resolved under 5m: 301 (73%)
incidents first reported by users: 4 of 11
worst rule: HighCPU  fired 188 times  actionable 0
(this is a simulated illustration, not a real incident)
```

One CPU rule produced almost half of all alerts and never needed action. The team deleted it, added a burn-rate alert for the checkout SLO, and within a month the actionable share rose above 60 percent while user-reported incidents dropped.

## Common mistakes

- Measuring alert counts instead of actionable share
- Not counting incidents users reported first
- Using one burn-rate window
- Adding ML without comparing it with the baseline
- Tuning rules without replaying history

```quiz
Q: What does alert precision measure?
+ The share of alerts that were worth a response
- The share of incidents that alerted :: That is recall.
- How fast alerts are sent :: Latency.
- The number of alerts :: A count only.
> Actionable alerts divided by all alerts.

Q: What does low recall mean?
+ Real problems happen without an alert
- Too many alerts fire :: That is low precision.
- Alerts are slow :: A different issue.
- Alerts are too long :: Unrelated.
> Missed incidents, often first reported by users.

Q: Why use two windows in a burn-rate alert?
+ The long one shows significance and the short one shows it is ongoing
- To double the alert volume :: The opposite.
- To use less storage :: Unrelated.
- To avoid SLOs :: They rely on SLOs.
> The pair avoids both slow detection and slow clearing.

Q: When should you add a machine-learning detector?
+ When it measurably beats the SLO baseline on past incidents
- When a vendor suggests it :: Not evidence.
- Whenever data exists :: Data alone is not a reason.
- Never :: Sometimes it helps.
> Compare against the baseline on the same history.
```

```cards
Precision :: Share of alerts that were actually actionable
Recall :: Share of real problems that triggered an alert
Burn rate :: Speed of error budget use compared with the sustainable rate
MTTA :: Mean time to acknowledge an alert
Actionable share :: The percentage of alerts that led to action
```
