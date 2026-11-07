---
title: What MLOps is and how ML systems fail
minutes: 14
summary: A model is only a small part of a machine learning system. This lesson shows the parts around it and the quiet ways they fail in production.
---

A normal service fails loudly: a crash, an error rate, a timeout. A machine learning system can fail while every dashboard is green. The server answers, the latency is fine, and the predictions are slowly getting worse. MLOps is the set of habits that make those quiet failures visible and fixable, by applying the same ideas you already use for software: versioning, testing, automated delivery and monitoring.

## What you will learn

- Name the parts of a production ML system beyond the model
- Explain why a model can be wrong while the service looks healthy
- Define training-serving skew and silent failure
- Say what MLOps adds to DevOps and what it does not replace

## The model is the small box

Code for the model itself is usually a small part of the system. Around it sit data collection, data checks, feature computation, training, evaluation, packaging, serving, monitoring and the process to retrain. Most production trouble lives in those surrounding parts. If you only version the model file, you have versioned the smallest piece.

## Two things change, not one

In ordinary software the code changes and the behaviour follows. In ML the code, the data and the model all change, and the behaviour depends on all three. The same code with new data gives a different model. A model that never changed can degrade because the world changed under it. So you must track data and model versions as carefully as code.

## Training-serving skew

Skew means the model sees different inputs in production than it saw in training. The cause is often boring: a feature computed in a notebook with one library and in the service with another, a unit that changed, a column that is now empty, or a time zone. The model is not broken. It is being fed something it never learned from.

## Silent failure

A fraud model that starts approving more risky payments raises no error. A recommendation model that favours old items still returns a list. You only see the damage through a business metric or a quality check, often days later. This is why monitoring in MLOps includes the data and the predictions, not only CPU and latency.

## What MLOps adds

Add four things to your DevOps toolbox: data and model versioning, automated evaluation as a release gate, monitoring of inputs and outputs, and a retraining path that is as safe as a code deploy. You still need containers, pipelines, observability and on-call.

## What a healthy service can hide

```console
$ curl -s localhost:8080/health
{"status":"ok","model":"churn-v14"}
$ curl -s localhost:8080/metrics | grep -E "latency|errors"
predict_latency_seconds_p95 0.041
predict_errors_total 0
$ python check_inputs.py --window 24h
feature days_since_login: 31% null (training: 0.2% null)
feature plan_tier: 4 new values not seen in training
```

The service is healthy by every operational signal, yet a third of one feature is missing. Only a data check shows the problem. The output is a simulated illustration.

## How it fails

A feature pipeline changes upstream and fills a column with nulls. A model trained on last year stays in production for two years. Training used a clean sample while production sees messy data. Nobody owns the question "is the model still good?", so nobody asks it.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How What MLOps is and how ML systems fail fits together
node: n1 | The model is the small box | 0 | 0 | Code for the model itself is usually a small part of the system. | Versioning the model file but not the data or features. | process
node: n2 | Two things change, not one | 1 | 1 | In ordinary software the code changes and the behaviour follows. | Treating a deployed model as finished. | process
node: n3 | Training-serving skew | 2 | 0 | Skew means the model sees different inputs in production than it saw in training. | Computing features twice, once for training and once for serving. | process
node: n4 | Silent failure | 3 | 1 | A fraud model that starts approving more risky payments raises no error. | Monitoring only latency and errors. | process
node: n5 | What MLOps adds | 4 | 0 | Add four things to your DevOps toolbox: data and model versioning, automated evaluation as a release gate, monitoring of inputs and outputs, and a retraining path that... | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n6 | What a healthy service can hide | 5 | 1 | The service is healthy by every operational signal, yet a third of one feature is missing. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: A green dashboard and a falling conversion rate

> **Incident:** A team shipped a ranking model and watched latency and errors. Both stayed healthy. Weeks later the business noticed a drop in conversions. An upstream change had renamed a field, so one important feature arrived empty and the model quietly ranked worse.

```console
$ python check_inputs.py --window 7d
feature item_popularity: 100% null since 2026-03-02
feature price_bucket: ok
$ git log --oneline -1 upstream-schema
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. The lesson is real and common: input checks on every feature, with an alert when a feature goes null or shifts, would have caught this on day one instead of week three.

## Interview question

"Our model has 99.9 percent uptime but results got worse. What do you check?" Look at input data first (nulls, ranges, new categories), then compare live feature distributions with training, then check upstream changes, then evaluate the model on recent labelled data.

## Common mistakes

- Monitoring only latency and errors
- Versioning the model file but not the data or features
- Computing features twice, once for training and once for serving
- Treating a deployed model as finished

```quiz
Q: Why can an ML service be wrong while all operational dashboards are green?
+ Predictions can degrade from data or world changes without causing errors or latency
- The server is overloaded :: That would show in latency and errors.
- Models crash when they are wrong :: Wrong models usually still answer.
- Dashboards never work for ML :: They work, but they miss data and quality.
> Correct: Predictions can degrade from data or world changes without causing errors or latency. Re-read the matching lesson section for the full reasoning.

Q: What is training-serving skew?
+ The model sees different inputs in production than it saw in training
- The model trains slower than it serves :: That is about speed, not inputs.
- Two models give the same answer :: That is agreement, not skew.
- The server has too many replicas :: Unrelated to inputs.
> Correct: The model sees different inputs in production than it saw in training. Re-read the matching lesson section for the full reasoning.

Q: Which three things change in an ML system?
+ Code, data and the model
- Only code :: Data and the model change too.
- Only the model file :: Code and data matter just as much.
- Only infrastructure :: That is true of any service.
> Correct: Code, data and the model. Re-read the matching lesson section for the full reasoning.

Q: What is a good first protection against silent failure?
+ Checks and alerts on input features and prediction distributions
- A larger server :: Does not detect bad data.
- A faster network :: Unrelated.
- Fewer releases :: Does not catch drift.
> Correct: Checks and alerts on input features and prediction distributions. Re-read the matching lesson section for the full reasoning.
```

```cards
training-serving skew :: model sees different inputs in production than in training
silent failure :: quality drops with no error or alert
feature :: an input value the model uses to predict
MLOps :: applying DevOps habits to data, models and retraining
```
