---
title: Training pipelines and testing models in CI
minutes: 15
summary: Turn training into an automated, tested pipeline, with checks on data, code and model quality before anything is released.
---

A model trained by hand from a laptop cannot be released safely or repeated reliably. A training pipeline runs the same steps every time: fetch data, validate, build features, train, evaluate and package. Continuous integration then adds tests, so a change to code or data cannot ship a worse model without somebody seeing it first.

## What you will learn

- Describe the stages of a training pipeline
- Write tests for data, code and model quality
- Use an evaluation gate to block a worse model
- Run training jobs in containers with the right resources

## The stages

A typical pipeline has these stages: ingest data, validate it, build features, train, evaluate, register the model and notify. Each stage reads versioned inputs and writes versioned outputs, so a failed stage can be rerun without redoing everything and any result can be traced.

## Three kinds of tests

Test the code with ordinary unit tests, for example that feature functions give expected results on small inputs. Test the data with expectations on every batch. Test the model: it must load, accept the expected input shape, return outputs in a valid range and meet a minimum quality bar on a fixed evaluation set.

## The evaluation gate

Before a model is registered, compare it with the current production model on the same held-out data. Block the release if the key metric is worse by more than a small margin, or if any important group gets worse. A gate turns "I think it is better" into a measured rule.

## Behavioural checks

Add simple behaviour tests: a tiny change that should not matter does not flip the answer, an obviously bad input is handled, and known hard cases still work. They are cheap, and they catch failures that a single average hides.

## Containers and resources

Run each stage in a container with pinned dependencies and explicit CPU, memory and GPU requests. Expensive GPU nodes should run only the training step, while cheap nodes run validation and packaging. Add timeouts and retries so one stuck job does not block the queue.

## A pipeline with an evaluation gate

```yaml
name: train-churn-model
on:
  schedule: [{cron: "0 2 * * 1"}]
  push: {paths: ["features/**", "train/**"]}
jobs:
  validate-data:
    run: python -m checks.run --config checks.yaml
  train:
    needs: validate-data
    resources: {gpu: 1, memory: 16Gi}
    run: python train/train.py --data-version $DATA_VERSION --seed 42
  evaluate:
    needs: train
    run: >
      python eval/gate.py --candidate $RUN_ID --baseline prod
      --metric auc --min-delta -0.002 --groups new_customers,enterprise
  register:
    needs: evaluate
    run: python registry/register.py --run $RUN_ID --stage staging
```

Each job depends on the one before it. The gate allows a tiny drop in the overall metric but blocks any release that makes a named group worse, so a bad model never reaches the registry.

## How it fails

A pipeline trains on unvalidated data. A gate that only looks at the average lets a model that fails one customer group through. Training and serving use different library versions. A failed job is retried forever and fills the GPU queue.

## Incident: The retrain that shipped a worse model

> **Incident:** A weekly retraining job replaced the production model automatically. One week, a data problem lowered quality for new customers. The average metric barely moved, so nothing flagged it, and the support team noticed first.

```console
$ python eval/gate.py --candidate run-88 --baseline prod --metric auc
overall auc: 0.866 (prod 0.869)  within tolerance
new_customers auc: 0.741 (prod 0.803)  BELOW LIMIT
result: FAIL, not registered
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Checking named groups in the gate, not only the average, turns a quiet regression into a failed build before it reaches users.

## Interview question

"How would you automate model releases safely?" Build a pipeline with data checks, tests, a fixed evaluation set, a comparison against the production model that includes important groups, and an approval or canary step before full release.

## Common mistakes

- Evaluating only on the average metric
- Training and serving in different environments
- No gate between training and the registry
- Retrying failed GPU jobs without limits

```quiz
Q: What does an evaluation gate do?
+ Blocks a candidate model that is worse than the baseline on agreed metrics
- Speeds up training :: Not its purpose.
- Stores the data :: Not its purpose.
- Replaces unit tests :: It adds to them.
> Correct: Blocks a candidate model that is worse than the baseline on agreed metrics. Re-read the matching lesson section for the full reasoning.

Q: Which test catches a feature function bug?
+ A unit test on small known inputs
- A load test :: That measures capacity.
- A dashboard :: That shows data, it does not test code.
- A larger GPU :: Unrelated.
> Correct: A unit test on small known inputs. Re-read the matching lesson section for the full reasoning.

Q: Why include groups in the gate?
+ An average can hide a group the model now serves badly
- Groups make jobs faster :: Not the reason.
- Averages are illegal :: They are fine, just incomplete.
- Groups replace versions :: They do not.
> Correct: An average can hide a group the model now serves badly. Re-read the matching lesson section for the full reasoning.

Q: Why pin dependencies in training containers?
+ So the same code and versions give repeatable results
- To avoid using GPUs :: Unrelated.
- To make images bigger :: Not a benefit.
- To skip tests :: Tests are still needed.
> Correct: So the same code and versions give repeatable results. Re-read the matching lesson section for the full reasoning.
```

```cards
evaluation gate :: automated check that blocks a worse model
behavioural test :: checks that small input changes or hard cases behave sensibly
baseline :: the current model a candidate is compared with
pipeline stage :: one step with versioned inputs and outputs
```
