---
title: Debugging ML systems in production
minutes: 16
summary: A bottom-up checklist for a model that is wrong, slow or silent in production: data first, then features, then the model, then serving.
---

When a model misbehaves, the model is rarely the first thing to blame. Work from the data upward and change one layer at a time, so that each check rules something out.

## What you will learn

- Walk a bottom-up checklist: data, features, model, serving
- Tell training-serving skew from real drift using logged inputs
- Replay a bad prediction from stored inputs and the model version
- Write the regression test that stops the same fault returning

## Start with what changed

List what changed in the last week: data sources, feature code, model version, serving image, traffic mix. Most production faults follow a change. If nothing changed, suspect slow drift or an upstream system that changed without telling you.

## Check the data, then the features

Compare today's inputs with the training set: null rates, ranges, new category values, row counts. Then compare the feature values the service computed with the values the training pipeline would compute for the same record. A difference is skew, and skew is a code fault, not a model fault.

## Replay the prediction

Log the model version, the input features and the output for a sample of requests. With those three you can replay one bad prediction offline, get the same answer, and then change one thing at a time to see which change fixes it.

## Then the model, then serving

Only when data and features match do you look at the model: evaluate the served version on a fresh labelled slice and compare with its gate result. Last, check serving: wrong model version loaded, stale cache, a fallback silently answering instead of the model.

## Predict before you look

Say what you expect each check to show before running it. A wrong guess teaches you where your picture of the system is wrong.

```predict
Q: Latency and errors are normal, but conversion from the recommendations has dropped for two days. What do you check first?
???
What changed in the last few days, then input and feature distributions against training, before touching the model.
> A healthy service can still serve bad predictions, so start with data and features.
```

## Make it stay fixed

Add a data check at the pipeline boundary, a test that computes a feature the same way in training and serving, and an alert on the signal that would have caught this. Write down the cause in one paragraph.

## A bottom-up check from the shell

```console
$ python check_inputs.py --window 48h --baseline training
feature days_since_login: 31% null (training: 0.2% null)
$ python compare_features.py --sample 500 --serving-vs-training
feature days_since_login: 29% of rows differ between serving and training
$ python replay.py --request-id 7f3a --model churn-v14
replayed output 0.12, logged output 0.12, expected 0.81
```

The data check finds the null rate, the comparison shows serving computes the feature differently, and the replay reproduces the bad output. The model is fine. The output is a simulated illustration.

## How it fails

The team retrains the model first, which changes nothing because the fault is in a feature. Nobody logs inputs, so the bad prediction cannot be replayed. Several things are changed at once, so no one knows which fixed it.

## Incident: The retrain that fixed nothing

> **Incident:** Conversion from recommendations fell for two days. The team retrained the model twice with no improvement. A feature pipeline had started filling a column with nulls after an upstream schema change.

```console
$ python check_inputs.py --window 48h --baseline training
feature days_since_login: 31% null (training: 0.2% null)
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A data check at the pipeline boundary would have caught the nulls the day they began, before any retraining was tried.

## Interview question

"A model's results got worse in production. Where do you start?" Check what changed, then data, then features against training, replay a bad prediction from logs, and only then the model and serving. Change one thing at a time and add a test afterwards.

## Common mistakes

- Retraining before checking the data
- Not logging inputs, outputs and model version
- Changing several layers at once
- Fixing it without adding a check that would have caught it

```quiz
Q: Why start with data and features rather than the model?
+ Most production faults come from changed inputs or feature code, and each check rules out a layer
- Models never fail :: They can, but later in the order.
- Data checks are faster to read :: Speed is not the reason.
- Retraining is expensive :: Cost is not the reason.
> Correct: Most production faults come from changed inputs or feature code, and each check rules out a layer. Re-read the matching lesson section for the full reasoning.

Q: What do you need logged to replay a bad prediction?
+ The model version, the input features and the output
- Only the output :: You cannot reproduce it without the inputs.
- Only the request time :: Not enough to rerun the model.
- Only the CPU usage :: Unrelated to the prediction.
> Correct: The model version, the input features and the output. Re-read the matching lesson section for the full reasoning.

Q: What does a difference between served and training feature values show?
+ Training-serving skew, which is a code fault
- Concept drift :: Drift is a change in the world, not in the code.
- A broken GPU :: Unrelated.
- A bad label :: Labels are not involved.
> Correct: Training-serving skew, which is a code fault. Re-read the matching lesson section for the full reasoning.

Q: Why change one layer at a time?
+ So you know which change fixed the problem
- It is required by the registry :: No such rule.
- It uses less memory :: Unrelated.
- It avoids writing tests :: It does the opposite.
> Correct: So you know which change fixed the problem. Re-read the matching lesson section for the full reasoning.
```

```cards
skew :: served features differ from training features
replay :: rerun a logged request offline with the same model version
bottom-up :: check data, features, model, then serving
boundary check :: a data test where a pipeline hands data on
```
