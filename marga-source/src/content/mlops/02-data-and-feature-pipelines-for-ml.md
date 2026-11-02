---
title: Data and feature pipelines for ML
minutes: 15
summary: Models are only as reliable as the data feeding them. Learn data validation, versioning and keeping training and serving features the same.
---

Most machine learning incidents start in the data, not in the model. A feature pipeline is a production system like any other, with inputs that change, jobs that fail and schemas that drift. This lesson covers how to check data before it is used, how to version it so a result can be reproduced, and how to compute features once so training and serving agree.

## What you will learn

- Validate data against a schema and expectations before training
- Version datasets so a model can be traced to its data
- Explain what a feature store is for and when you do not need one
- Keep training and serving features computed by the same code

## Treat data like code and like an API

Data has a shape: columns, types, ranges and meanings. Write that shape down as a schema and test every batch against it. A column that is suddenly 40 percent null, a value outside a plausible range, or a new category should stop the pipeline or raise an alert, just as a failing unit test stops a build.

## Useful checks

Start with a short list: row count within an expected band, no unexpected nulls, values within range, categories from a known set, no duplicate keys, freshness (the newest record is recent), and a distribution check against a reference. These catch most real problems and run in seconds.

## Version the data

If you cannot say which data trained a model, you cannot reproduce it or explain a bad result. Store datasets as immutable snapshots with an id, or use a tool that records content hashes next to your code commit. Never overwrite a training set in place.

## Point-in-time correctness

When you build training rows, each feature must use only information that existed at the time of the label. Using today's value to predict yesterday's outcome leaks the future and makes the model look great in testing and fail in production. Join features as of the event time.

## One definition of a feature

Write each feature once and use the same code for the training set and for serving. A feature store is a managed way to do that: it keeps an offline copy for training and an online copy for low-latency lookups, with one definition. Small teams can start with a shared library and add a store later.

## A data check you can run in a pipeline

```yaml
# checks.yaml: expectations for the daily training table
table: churn_training
checks:
  - row_count: {min: 90000, max: 130000}
  - freshness: {column: event_date, max_age_hours: 30}
  - not_null: [customer_id, plan_tier, event_date]
  - unique: [customer_id, event_date]
  - range: {column: days_since_login, min: 0, max: 3650}
  - allowed_values: {column: plan_tier, values: [free, basic, pro, team]}
  - null_rate: {column: last_payment_amount, max: 0.05}
on_fail: stop_pipeline_and_page
```

Each line is a test on data, evaluated before training starts. A failing check stops the pipeline instead of training on bad rows.

## How it fails

A schema changes upstream and the pipeline keeps running. A join silently drops half the rows. A feature uses information from after the event. The training set is edited by hand and nobody recorded how. A fix is applied to serving but not to training.

## Incident: The feature that knew the future

> **Incident:** A team built a model to predict customer cancellations and reported excellent test results. In production it performed far worse. One feature, "support tickets this month", included tickets raised after the customer had already decided to leave, which the model could not know at prediction time.

```console
$ python audit_features.py --model churn-v9
feature support_tickets_month: uses data up to month end
label cancel_date: can precede month end
leakage risk: HIGH
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration of a common mistake called leakage. Building training rows with point-in-time joins, so a feature only uses data from before the prediction moment, removes this class of problem.

## Interview question

"How do you stop bad data reaching a model?" Define a schema and expectations, run them on every batch before training and before serving, version the datasets, and make the pipeline fail closed with an alert instead of continuing with bad rows.

## Common mistakes

- Training on data that was never validated
- Overwriting a dataset in place
- Using future information in a training feature
- Writing features twice, once for training and once for serving

```quiz
Q: What should happen when a data check fails in a training pipeline?
+ The pipeline stops and alerts instead of training on bad data
- The pipeline continues and logs a warning :: Bad data would still reach the model.
- The model is deployed anyway :: That spreads the problem.
- The check is deleted :: That hides the problem.
> Correct: The pipeline stops and alerts instead of training on bad data. Re-read the matching lesson section for the full reasoning.

Q: Why version datasets?
+ So a model can be traced to the exact data that trained it and reproduced
- To make files smaller :: Versioning is about traceability.
- To avoid writing tests :: Tests are still needed.
- To speed up serving :: Unrelated.
> Correct: So a model can be traced to the exact data that trained it and reproduced. Re-read the matching lesson section for the full reasoning.

Q: What is point-in-time correctness?
+ A feature uses only information that existed at the moment of the prediction
- Using the latest value always :: That can leak the future.
- Joining on any key :: Keys alone do not fix time.
- Running jobs at noon :: Unrelated.
> Correct: A feature uses only information that existed at the moment of the prediction. Re-read the matching lesson section for the full reasoning.

Q: What does a feature store mainly help with?
+ Defining features once and using them for both training and low-latency serving
- Storing model weights :: That is a registry.
- Running the GPU :: Unrelated.
- Replacing monitoring :: It does not.
> Correct: Defining features once and using them for both training and low-latency serving. Re-read the matching lesson section for the full reasoning.
```

```cards
leakage :: training uses information not available at prediction time
point-in-time join :: join features as they were at the event time
feature store :: one definition of features for training and serving
data contract :: agreed schema and meaning between data producer and consumer
```
