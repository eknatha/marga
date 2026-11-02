---
title: Model registry, packaging and safe releases
minutes: 14
summary: Store models with their history, package them for serving, and release with shadow tests, canaries and fast rollback.
---

Once a model passes its checks, it needs a home and a safe path to users. A model registry gives each version a name, a lineage and a stage. Packaging makes the model run the same way everywhere. A careful release then exposes the model to real traffic in small steps, with a quick way back.

## What you will learn

- Describe what a model registry stores and why
- Package a model with its dependencies and interface
- Compare shadow, canary and A/B release methods
- Roll back a model in minutes

## What a registry holds

A registry stores each model version with its run id, code and data versions, metrics, owner, and a stage such as staging, production or archived. It answers "what is live, who approved it, what trained it and what was the previous one?" in one place.

## Package it like a service

Wrap the model in a container with pinned libraries, a clear input schema and a health endpoint. Include the exact feature code or call it from a shared library. Record the image digest in the registry, so the thing you tested is the thing you run.

## Shadow release

In shadow mode the new model receives a copy of real traffic, but its answers are only logged, not used. You compare it with the live model on real inputs with zero user risk. It also shows latency and error rates under real load.

## Canary and A/B

A canary sends a small share of traffic, say 1 to 5 percent, to the new model and watches errors, latency and quality metrics before widening. An A/B test goes further and measures a business outcome between groups, which needs enough traffic and time to be meaningful.

## Rollback

Keep the previous model loaded or one command away. Make rollback a registry stage change, not a rebuild. Decide the triggers in advance: error rate, latency, a quality proxy or a business metric beyond a limit. Practise it before you need it.

## Moving a model through stages

```console
$ mlreg show churn --stage production
version: 13  image: registry.example.com/churn@sha256:4f2a...
trained: run 3b88d216  data: churn-2026-02-01
$ mlreg promote churn 14 --to staging
$ deploy canary churn --version 14 --share 5%
canary: error_rate 0.1% latency_p95 44ms (baseline 41ms)
$ mlreg promote churn 14 --to production --keep-previous 13
$ mlreg rollback churn --to 13   # if a trigger fires
```

The registry holds the version, the image digest and the previous version. A canary at five percent is checked before promotion. The output is a simulated illustration.

## How it fails

The model file is copied by hand to a server. A release has no previous version to return to. The canary watches only latency, not quality. Everyone assumes someone else approved the model.

## Incident: A rollback that took a day

> **Incident:** A new model started giving poor results in production. The team wanted to go back, but the old model had been deleted from the server and its training environment no longer existed. Rebuilding it took most of a day.

```console
$ mlreg show churn --stage archived
version: 13  artifact: MISSING
$ mlreg rollback churn --to 13
error: artifact not found, rebuild required
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Keeping the previous model artifact and its image in the registry, and treating rollback as a stage change, turns an all-day rebuild into a minute-long switch.

## Interview question

"How do you release a new model safely?" Register it with lineage, package it, run shadow traffic, then a small canary with quality and latency checks, promote in steps, and keep the previous version ready for an instant rollback.

## Common mistakes

- Copying model files by hand
- Deleting old versions after release
- Canarying with only latency checks
- No named owner or approval for a model

```quiz
Q: What does shadow mode do?
+ Runs the new model on real traffic without using its answers
- Serves the new model to everyone :: That is a full release.
- Trains the model again :: Not its purpose.
- Disables the old model :: It stays live.
> Correct: Runs the new model on real traffic without using its answers. Re-read the matching lesson section for the full reasoning.

Q: Why record the image digest in the registry?
+ So the exact tested artifact is the one that runs
- To make images smaller :: Not its purpose.
- To avoid versions :: It supports versions.
- To skip canaries :: Canaries are still needed.
> Correct: So the exact tested artifact is the one that runs. Re-read the matching lesson section for the full reasoning.

Q: What makes rollback fast?
+ The previous version stays available and switching is a stage change
- Rebuilding from scratch :: That is slow.
- Asking the author :: Not a process.
- Retraining from today's data :: That gives a different model.
> Correct: The previous version stays available and switching is a stage change. Re-read the matching lesson section for the full reasoning.

Q: When is an A/B test more suitable than a canary?
+ When you must measure a business outcome between groups
- When you only need to check errors :: A canary does that.
- When there is no traffic :: A/B needs traffic.
- When you want no monitoring :: Both need monitoring.
> Correct: When you must measure a business outcome between groups. Re-read the matching lesson section for the full reasoning.
```

```cards
model registry :: catalogue of model versions with lineage and stages
shadow mode :: new model sees real traffic but its output is not used
canary :: small share of traffic sent to a new version
rollback :: return to the previous known good version
```
