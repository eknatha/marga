---
title: MLOps
summary: Checks, records and release steps that keep machine learning models reliable in production.
module: mlops
---

## What to monitor

| Layer | Signals | Why |
| --- | --- | --- |
| Service | latency, errors, saturation | The usual health of the API |
| Inputs | null rate, range, new categories, distribution vs training | Catches broken or changed data |
| Predictions | average score, share per class | Early sign of drift |
| Quality | accuracy or error when labels arrive, vs a baseline | The real measure |
| Business | conversion, loss, complaints | What the model is for |

> **Warning:** A healthy service does not mean a good model. Models fail quietly.

## Record for every training run

```console
code version      a94f3c2
data version      churn-2026-03-01
parameters        learning_rate=0.05 max_depth=6
seed              42
environment       image digest, library versions, hardware
metrics           overall and per important group
artifacts         model file, evaluation report
```

## Data checks before training

```yaml
checks:
  - row_count: {min: 90000, max: 130000}
  - freshness: {column: event_date, max_age_hours: 30}
  - not_null: [customer_id, event_date]
  - range: {column: days_since_login, min: 0, max: 3650}
  - allowed_values: {column: plan_tier, values: [free, basic, pro, team]}
on_fail: stop_pipeline_and_page
```

## Release steps

1. Register the model with run id, data version and metrics.
2. Package it in a pinned image and record the digest.
3. Gate: compare with production on a fixed set, including key groups.
4. Shadow on real traffic, then a small canary with quality checks.
5. Promote in steps. Keep the previous version ready.

## Serving choices

| Mode | Use when | Watch |
| --- | --- | --- |
| Batch | results can be hours old | staleness, job failures |
| Online | the latest event matters | latency, timeouts, fallback |
| Streaming | high volume, near real time | backlog, duplicates |

## Drift alert example

```yaml
- alert: FeatureDriftHigh
  expr: model_feature_psi{model="churn",feature="days_since_login"} > 0.25
  for: 6h
  labels: {severity: ticket}
```

> **Why it matters:** Drift is slow. A ticket with a window is better than a midnight page.

## Debug a model bottom-up

1. What changed in the last week: data, feature code, model, image, traffic.
2. Inputs against training: null rate, range, new categories.
3. Served features against training features for the same record.
4. Replay a logged request with the same model version.
5. Only then the model, and last serving.

> **Warning:** Do not retrain before checking the data. A retrain on broken inputs repeats the fault.

> **Warning:** Without logged inputs, output and model version, a bad prediction cannot be replayed.

> **Warning:** Do not let a release pass on one overall metric. Check the groups that matter, such as new customers.

> **Warning:** Do not retrain automatically with no gate. A retrain on bad data can produce a worse model.

## Commands for a model check

```console
$ python check_inputs.py --window 48h --baseline training
```

```console
$ python compare_features.py --sample 500 --serving-vs-training
```

```console
$ python replay.py --request-id 7f3a --model churn-v14
```
