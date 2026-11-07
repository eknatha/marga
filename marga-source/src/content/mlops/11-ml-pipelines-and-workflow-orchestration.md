---
title: ML pipelines and workflow orchestration
minutes: 12
summary: Run training as a repeatable pipeline with steps, caching, retries, parameters and scheduled retraining on an orchestrator.
---

A pipeline makes every step explicit: where data comes from, how it is checked, how the model is trained and what must be true before it is released. That is the foundation for continuous training.

## What you will learn

- Breaking work into pipeline steps
- Passing data and artifacts between steps
- Retries, caching and resource requests
- Scheduling and triggering retraining

## Steps

A typical pipeline: **ingest** data, **validate** it, **build features**, **train**, **evaluate** against a threshold, **register** the model and optionally **deploy**. Each step is a container or function with clear inputs and outputs.

```python
from airflow.decorators import dag, task
from datetime import datetime

@dag(schedule="0 3 * * 1", start_date=datetime(2026, 1, 1), catchup=False)
def retrain_churn():
    @task(retries=2)
    def validate(ds=None):
        return run_data_checks(ds)           # returns a dataset version

    @task
    def train(dataset_version):
        return train_model(dataset_version)  # returns a model run id

    @task
    def evaluate(run_id):
        score = evaluate_model(run_id)
        if score < 0.82:
            raise ValueError("model below threshold")
        return run_id

    @task
    def register(run_id):
        register_model(run_id, stage="staging")

    register(evaluate(train(validate())))

retrain_churn()
```

## Data between steps

Pass **references**, such as dataset versions and object storage paths, not large data through the orchestrator. Store artifacts in object storage or an artifact store with versioning.

## Reliability

Set retries with backoff for transient failures, but not for logic errors. Cache steps when inputs and code have not changed. Set resource requests, for example GPUs for training only. Make each step **idempotent**, so rerunning does not duplicate or corrupt results.

## Triggers

Run on a schedule, when new data arrives or when drift monitoring requests it. Require a successful evaluation gate before anything is registered, and send alerts on failed runs.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How ML pipelines and workflow orchestration fits together
node: n1 | Steps | 0 | 0 | A typical pipeline: ingest data, validate it, build features, train, evaluate against a threshold, register the model and optionally deploy. | Passing large data through the orchestrator. | process
node: n2 | Data between steps | 1 | 1 | Pass references, such as dataset versions and object storage paths, not large data through the orchestrator. | Steps that are not idempotent. | store
node: n3 | Reliability | 2 | 0 | Set retries with backoff for transient failures, but not for logic errors. | Notebooks as the only process. | process
node: n4 | Triggers | 3 | 1 | Run on a schedule, when new data arrives or when drift monitoring requests it. | No evaluation gate before registration. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The notebook that nobody could rerun

> **Incident:** A model could not be retrained because the process lived in a notebook.

```console
FileNotFoundError: /Users/amir/data/clean_v3.csv
notebook cell 14 depends on cell 31 being run first
retraining blocked for 3 weeks
```

The author had left, and the notebook referenced a local file and an undocumented order of cells. The team rebuilt the process as a pipeline with versioned data, explicit steps and tests, and retrained in an afternoon.

## Common mistakes

- Notebooks as the only process
- Passing large data through the orchestrator
- Steps that are not idempotent
- No evaluation gate before registration

```quiz
Q: What should pipeline steps pass between each other?
+ References to versioned artifacts
- Large raw data in memory :: No.
- Passwords :: No.
- Nothing :: No.
> Keep the orchestrator light.

Q: What does an evaluation gate do?
+ Blocks models below a threshold
- Starts training :: No.
- Deletes data :: No.
- Adds features :: No.
> Protects release quality.

Q: Why make steps idempotent?
+ Reruns do not corrupt results
- It is faster :: No.
- It adds logs :: No.
- It encrypts :: No.
> Safe retries. The lesson section above explains why.

Q: What can trigger retraining?
+ Schedule, new data or drift
- Only manual :: No.
- Never :: No.
- Only on release :: No.
> Several triggers fit.
```

```cards
Orchestrator :: Software that runs and tracks workflow steps
DAG :: Directed graph of steps
Artifact store :: Storage for pipeline outputs
Idempotent step :: Step that can be repeated safely
```
