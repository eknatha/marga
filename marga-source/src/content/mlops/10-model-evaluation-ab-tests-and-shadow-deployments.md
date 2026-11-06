---
title: Model evaluation, A/B tests and shadow deployments
minutes: 13
summary: Judge a model with offline metrics, slices, shadow traffic and controlled online experiments, and decide when to ship or roll back.
---

Shipping a model is a change to a live system, so it deserves the same discipline as any release. The extra difficulty is that quality is statistical and can differ between groups of users.

## What you will learn

- Choosing metrics that match the goal
- Slice analysis and fairness checks
- Shadow deployments
- A/B tests, guardrails and rollback

## Metrics and slices

Pick a primary metric tied to the business goal and add guardrails such as latency, cost and error rate. Overall averages hide problems, so compute metrics by **slice**: new versus returning users, region, device, language and rare classes.

```python
import pandas as pd
df = pd.read_parquet("eval_predictions.parquet")
by_slice = df.groupby("segment").apply(lambda g: (g.pred == g.label).mean())
print(by_slice.sort_values().head())
```

## Shadow deployment

In **shadow mode** the new model receives a copy of live requests, but its output is not used. Compare outputs, latency and errors with the current model. This catches crashes, performance problems and surprising predictions without risking users.

## Online experiments

```yaml
experiment: ranker-v7
split: {control: 90, treatment: 10}
primary_metric: purchase_rate
guardrails: {p95_latency_ms: "<= 250", error_rate: "<= 0.5%"}
min_duration_days: 14
stop_rules: {guardrail_breach: abort}
```

Decide the duration and sample size before starting, so you do not stop when the numbers look good. Random assignment must be stable per user. Watch guardrails continuously and abort on a breach. After a win, ramp up gradually and keep the old model available for quick rollback.

## Record

Store the evaluation report with the model version, data version and decision. This helps future reviews and audits.

## Incident: Better on average, worse for new users

> **Incident:** A model improved overall metrics but hurt a user segment.

```console
overall conversion: +1.8%
new users: -6.2%
returning users: +3.1%
```

The model relied on purchase history that new users did not have. The overall average hid the drop because new users were a minority. The team added a slice report to every evaluation and a fallback model for users with no history.

## Common mistakes

- Judging only by overall averages
- Stopping an experiment when it first looks good
- No guardrail metrics
- No way to roll back quickly

```quiz
Q: What does shadow mode do?
+ Runs a model on live traffic without using output
- Replaces the model :: No.
- Deletes data :: No.
- Trains a model :: No.
> Safe comparison. The lesson section above explains why.

Q: Why analyze slices?
+ Averages can hide harm to groups
- To reduce data :: No.
- To skip tests :: No.
- To change labels :: No.
> Segments differ. The lesson section above explains why.

Q: What is a guardrail metric?
+ A limit that must not be breached
- The main goal :: No.
- A dataset :: No.
- A colour :: No.
> Protects quality. The lesson section above explains why.

Q: When decide the sample size?
+ Before the experiment
- After results :: No.
- Never :: No.
- When it looks good :: No.
> Avoid peeking bias. The lesson section above explains why.
```

```cards
Shadow deployment :: Running a model silently on live traffic
Slice :: A subset of data analyzed separately
Guardrail :: A metric that must stay within limits
A/B test :: Randomized comparison of two versions
```
