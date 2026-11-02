---
title: Pipeline fundamentals
minutes: 14
summary: Understand continuous integration, delivery and deployment, the stages of a healthy pipeline, and the principles that keep it fast and trustworthy.
---

A team merges code on Friday, and an engineer spends the evening building, copying files to servers and hoping. The next release is delayed because nobody remembers the steps. A pipeline replaces that evening with an automated, repeatable path from a code change to a running service, and it does it the same way every time.

## What you will learn

- The difference between CI, continuous delivery and continuous deployment
- The stages of a typical pipeline
- Principles of fast, reliable pipelines
- How to measure whether delivery is healthy

## Three terms, often confused

| Term | Meaning |
|------|---------|
| **Continuous integration (CI)** | Every change is built and tested automatically, and merged into the shared mainline often |
| **Continuous delivery** | Every passing change is ready to release, and a human decides when |
| **Continuous deployment** | Every passing change is released to production automatically |

Most teams practise CI everywhere, continuous delivery as a baseline, and continuous deployment where their tests and monitoring are strong enough to trust it.

## Stages of a pipeline

1. **Checkout** the source at the exact revision.
2. **Build** the artifact once, for example a container image.
3. **Test**: fast unit tests first, then integration tests.
4. **Analyze**: linting, dependency checks, secret scanning, image scanning.
5. **Publish** the artifact to a registry with an immutable version tag.
6. **Deploy** to a test environment, run smoke tests.
7. **Promote** the *same artifact* to production, then verify it.

Two rules deserve emphasis:

- **Build once, deploy many.** The image tested in staging must be the image that reaches production. Rebuilding for each environment means you tested something different from what you shipped.
- **Order checks by speed.** Put the quick, cheap feedback first (lint, unit tests) so a typo fails in seconds, not after a 20-minute build.

## Principles

| Principle | Why |
|-----------|-----|
| Fast feedback | Developers wait for pipelines. Aim for the main checks in under ten minutes |
| Deterministic | The same input gives the same result. Pin tool and dependency versions |
| Fail loudly | A red build must block the merge or deploy. Never leave a "known flaky" step ignored |
| Secrets are managed | Credentials come from a secret store at run time, never from files in the source |
| Pipeline as code | The definition lives next to the application, reviewed like any change |
| Least privilege | Build jobs can push images but should not be able to modify production directly |

## Measuring delivery health

The four widely used delivery metrics (from DORA research) give you a shared language:

| Metric | Question it answers |
|--------|--------------------|
| Deployment frequency | How often do we release? |
| Lead time for changes | How long from commit to production? |
| Change failure rate | What share of releases cause a problem? |
| Time to restore service | How fast do we recover when one does? |

Frequent small releases generally improve **all four**, because small changes are easier to review, test and roll back.

## Incident: tests pass, production breaks

> **Incident:** The pipeline is green for version 2.4.0, but production returns errors immediately after the release. Staging was fine yesterday.

Compare what each environment actually runs:

```console
$ kubectl get deploy shop-api -n shop-staging -o jsonpath='{.spec.template.spec.containers[0].image}'
registry.example.com/shop-api:2.4.0-rc1
$ kubectl get deploy shop-api -n shop-prod -o jsonpath='{.spec.template.spec.containers[0].image}'
registry.example.com/shop-api:2.4.0
```

Staging ran a build from a release candidate, while production got a **separate rebuild** that picked up a newer dependency version. The artifact that was tested is not the artifact that shipped. Fix the pipeline so one build produces one image tagged with a unique revision, and every environment deploys that exact tag (or digest). Pin dependency versions with a lock file so rebuilds are reproducible. Roll production back to the last good tag while you do it.

## Predict the pipeline

```predict
Q: A pipeline has stages build, test and deploy. The test stage fails. What should happen to deploy?
???
It does not run, and the pipeline reports failure.
> Stages run in order and stop on failure. A broken change should never reach deployment.
```

```predict
Q: Two developers merge within seconds and both pipelines deploy to production. What risk appears?
???
The older build can finish last and overwrite the newer one.
> Use a concurrency group or a queue so only one deploy runs at a time, and deploy a specific version.
```

## Common mistakes

- Rebuilding the artifact per environment
- Treating a flaky test as noise instead of fixing or removing it
- Giving the pipeline broad production credentials
- Skipping post-deploy verification

```quiz
Q: What is the difference between continuous delivery and continuous deployment?
- There is none
+ Delivery keeps every change releasable with a human release decision; deployment releases automatically
- Deployment only applies to databases
- Delivery excludes tests
> Both automate the path; deployment removes the manual approval.

Q: Why build the artifact once and promote it?
- To save disk space
+ So the thing you tested is exactly the thing you ship
- Registries only allow one push
- Tests require it
> Rebuilding introduces differences that were never tested.

Q: Which check should run first in a pipeline?
+ Fast checks such as linting and unit tests
- Long end-to-end tests
- Production deployment
- Manual approval
> Cheap, fast feedback first avoids wasting time on a doomed build.

Q: Which metric measures how long it takes from commit to production?
- Change failure rate
- Time to restore service
+ Lead time for changes
- Deployment frequency
> Lead time is the delay between a commit and its release.
```

```cards
CI in one line? :: Merge often; build and test every change automatically
Build once, deploy many means? :: The same artifact is promoted through every environment
Four DORA metrics? :: Deployment frequency, lead time, change failure rate, time to restore
Why pin dependency versions? :: So rebuilds produce the same result
```
