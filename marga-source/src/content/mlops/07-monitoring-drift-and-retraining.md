---
title: Monitoring drift and retraining
minutes: 15
summary: Detect when data or the world has changed, measure model quality when labels arrive late, and retrain safely.
---

A model is trained on a snapshot of the past. The world keeps moving, so over time the data it sees and the patterns it learned drift apart. Monitoring tells you when. A retraining plan tells you what to do. This final lesson ties the earlier ones together into the loop that keeps a model useful.

## What you will learn

- Tell data drift from concept drift
- Choose signals to monitor when labels arrive late
- Set alert thresholds that do not cry wolf
- Design a safe retraining trigger and process

## Data drift and concept drift

Data drift means the inputs changed: more mobile users, a new product, a different season. Concept drift means the relationship between inputs and the right answer changed: customers behave differently for the same features. Data drift is easy to measure. Concept drift needs labels or a trusted proxy.

## What to monitor

Watch input features (null rate, range, distribution against a training reference), predictions (average score, share in each class) and, when labels arrive, real quality such as precision, recall or error. Add the business metric the model serves. Group results by important segments.

## When labels are late

Labels often arrive days or weeks later: a loan defaults months after approval. Until then, rely on leading signals: input drift, prediction drift and proxies. Plan a delayed quality report when labels land, and compare it with what the early signals said.

## Thresholds and noise

Distribution tests will flag tiny, harmless shifts if you run them on large data. Pick a few features that matter, choose a drift measure with a meaningful scale, and alert on sustained shifts over a window rather than one-off blips. Tune using past incidents, so alerts match real harm.

## Retraining

Retrain on a schedule, on a trigger such as drift or a quality drop, or both. Every retrain goes through the same pipeline and gate as a new model, including a comparison with production and a staged release. Automatic retraining without a gate is how a data problem turns into a bad release.

## A drift alert rule

```yaml
groups:
- name: model-drift
  rules:
  - alert: FeatureDriftHigh
    expr: model_feature_psi{model="churn",feature="days_since_login"} > 0.25
    for: 6h
    labels: {severity: ticket}
    annotations:
      summary: "Input drift on days_since_login for 6 hours"
      runbook: "Check upstream pipeline, compare with training reference"
  - alert: PredictionShare
    expr: abs(model_positive_rate{model="churn"} - 0.18) > 0.06
    for: 12h
    labels: {severity: ticket}
```

The first rule uses a population stability index with a six hour window. The second watches the share of positive predictions. Both open a ticket, not a page, because drift is slow and needs investigation, not a midnight wake-up.

## How it fails

Alerts fire constantly on harmless changes, so people mute them. Nobody watches quality because labels are late. A retrain is triggered automatically with bad data. Drift is measured on features nobody cares about.

## Incident: The model that aged quietly

> **Incident:** A demand forecasting model was accurate at launch. A change in customer behaviour over several months made its forecasts steadily worse. No quality metric was reviewed, and the team found out when stock shortages appeared.

```console
$ python quality_report.py --model demand --window 90d
month   mae   baseline_mae
2026-01 41    44
2026-02 48    44
2026-03 63    44   ABOVE BASELINE
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Comparing error with a simple baseline every month, and alerting when the model is no longer better than that baseline, makes slow decay visible while it is still cheap to fix.

## Interview question

"How do you know when to retrain?" Monitor input and prediction drift as early signals, measure real quality as labels arrive, compare with a simple baseline, and trigger a retrain through the normal gated pipeline when drift or quality crosses a limit.

## Common mistakes

- Alerting on every tiny distribution change
- Retraining automatically with no gate
- Never comparing the model with a simple baseline
- Ignoring segments that matter to the business

```quiz
Q: What is concept drift?
+ The relationship between inputs and the right answer has changed
- The server changed region :: Unrelated to learning.
- The model file got bigger :: Not drift.
- Inputs have more nulls :: That is a data problem.
> Correct: The relationship between inputs and the right answer has changed. Re-read the matching lesson section for the full reasoning.

Q: What can you monitor when labels arrive late?
+ Input drift, prediction distribution and proxy metrics, then quality when labels land
- Nothing until labels arrive :: You would be blind for weeks.
- Only CPU :: That misses quality.
- Only the model size :: Irrelevant.
> Correct: Input drift, prediction distribution and proxy metrics, then quality when labels land. Re-read the matching lesson section for the full reasoning.

Q: Why should a retrain go through the same gate as a new model?
+ A retrain on bad data can produce a worse model
- Retrains are always better :: Not guaranteed.
- Gates slow nothing :: Not the reason.
- It avoids storing models :: Unrelated.
> Correct: A retrain on bad data can produce a worse model. Re-read the matching lesson section for the full reasoning.

Q: Why use a baseline in quality reports?
+ It shows whether the model still beats a simple approach
- It makes graphs prettier :: Not the reason.
- It replaces monitoring :: It adds to it.
- It removes the need for labels :: Labels are still needed.
> Correct: It shows whether the model still beats a simple approach. Re-read the matching lesson section for the full reasoning.
```

```cards
data drift :: input distribution changes
concept drift :: relationship between inputs and outcome changes
PSI :: population stability index, a drift measure
baseline :: a simple method used as a quality yardstick
```
