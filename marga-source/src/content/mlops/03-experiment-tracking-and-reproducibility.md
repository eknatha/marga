---
title: Experiment tracking and reproducibility
minutes: 13
summary: Record what produced each model so you can compare runs, repeat a result and explain a decision later.
---

Training a model is closer to running experiments than to building a feature. You try settings, compare numbers and keep the best. Without records, the best model becomes a mystery: nobody remembers which data, code or parameters produced it. Experiment tracking turns that mess into a searchable history, and reproducibility means you can run the same recipe again and get the same result.

## What you will learn

- List what to record for every training run
- Explain why runs should be compared on the same data and metric
- Control randomness so a result can be repeated
- Link a model in production back to its run

## What to record

For every run, record the code version, the data version, the parameters, the environment (library versions, hardware), the random seed, the metrics, and the output files. Together these are the recipe. If any one is missing, you can look at a number but you cannot trust or repeat it.

## A tracking server

Tools such as MLflow, or any system that stores runs, give you a place to log parameters and metrics from code and then compare runs in a table or chart. The tool matters less than the habit: every training job writes a run record automatically, with no manual notes.

## Compare fairly

A new model beating an old one means little if they used different data splits or metrics. Fix the evaluation set and the metric, keep it out of training, and compare on the same slice. Report the metric on important sub-groups too, because an average can hide a group the model serves badly.

## Control randomness

Random seeds, data shuffling and some GPU operations make results vary between runs. Set seeds, pin library versions and record hardware. Some noise cannot be removed, so run important comparisons several times and look at the spread. A one-point gain inside the noise is not a gain.

## Reproduce on demand

Package training in a container with pinned dependencies, run it from a commit, and read data by version id. Then "retrain model 14 exactly" becomes a command, not an archaeology project. This also makes audits and rollbacks safe.

## Logging a run

```console
$ mlflow run . -P learning_rate=0.05 -P max_depth=6 --env-manager=local
run_id: 7c1e9a40
code_version: a94f3c2
data_version: churn-2026-03-01
seed: 42
metric auc_valid: 0.871
metric auc_valid_new_customers: 0.804
artifact: model/ (12 MB)
$ mlflow runs compare 7c1e9a40 3b88d216
```

One command trains and records code, data, seed and metrics together. The new-customer slice is logged too, so an average does not hide a weak group. The output is a simulated illustration.

## How it fails

Results live in a notebook that was changed after the run. The data path points at a file that was overwritten. A seed is unset, so nobody can repeat the number. Two people compare runs on different test sets and argue about it.

## Incident: The best model nobody could rebuild

> **Incident:** A team deployed the best model from weeks of experiments. When it needed retraining, the new run was much worse. The notebook had been edited, the training file replaced and the library upgraded, and nobody had recorded the original settings.

```console
$ python train.py --config best.yaml
auc_valid: 0.842
$ python compare.py --old model-prod --new run-latest
code version: unknown for model-prod
data version: unknown for model-prod
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration of a very common situation. Recording code, data, parameters and environment for every run would have made the old result repeatable and the gap explainable.

## Interview question

"How do you make an ML result reproducible?" Version code and data, pin the environment in a container, fix seeds, log parameters and metrics to a tracking system, and evaluate on a fixed held-out set.

## Common mistakes

- Keeping results in notebooks with no run record
- Comparing runs on different test sets
- Leaving seeds and library versions unrecorded
- Choosing a model on a difference smaller than the noise

```quiz
Q: Which is NOT needed to reproduce a training run?
+ The name of the person who started it
- Code version :: Needed to repeat it.
- Data version :: Needed to repeat it.
- Parameters and seed :: Needed to repeat it.
> Correct: The name of the person who started it. Re-read the matching lesson section for the full reasoning.

Q: Why compare runs on the same evaluation set and metric?
+ Otherwise a difference may come from the test, not the model
- It makes training faster :: Unrelated to speed.
- It removes the need for versions :: Versions are still needed.
- It improves the model :: It only makes the comparison fair.
> Correct: Otherwise a difference may come from the test, not the model. Re-read the matching lesson section for the full reasoning.

Q: What does a tracking server mainly provide?
+ A searchable history of runs with parameters, metrics and artifacts
- Faster GPUs :: It does not change hardware.
- Automatic model fixes :: It records, it does not fix.
- Free storage :: Not its purpose.
> Correct: A searchable history of runs with parameters, metrics and artifacts. Re-read the matching lesson section for the full reasoning.

Q: What should you do when two models differ by a tiny amount?
+ Repeat runs and check whether the difference is bigger than the noise
- Always pick the higher number :: It may be noise.
- Ignore the metric :: The metric still matters.
- Retrain until it wins :: That is cherry-picking.
> Correct: Repeat runs and check whether the difference is bigger than the noise. Re-read the matching lesson section for the full reasoning.
```

```cards
experiment tracking :: recording parameters, metrics and artifacts for each run
reproducibility :: getting the same result from the same recipe
random seed :: a value that fixes random choices so runs can repeat
held-out set :: data kept out of training to judge the model
```
