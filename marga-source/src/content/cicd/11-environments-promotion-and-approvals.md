---
title: Environments, promotion and approvals
minutes: 12
summary: Move one build through test, staging and production with the right checks, approvals and records for each step.
---

The release checklist says "deploy to staging, test, deploy to production", but each deploy rebuilds the code and picks up slightly different dependencies. What passed in staging is not exactly what reaches production. Promotion fixes this: build once, then move the same artifact through environments, with a gate at each step.

## What you will learn

- What an environment is and how many you need
- Promote the same artifact instead of rebuilding
- Automatic gates and human approvals, and when to use each
- Records: who approved what, and what is running where

## Environments and their purpose

An environment is a place where the application runs with its own configuration and data. Common ones are **dev** (fast, breakable), **test** or **staging** (production-like, used for final checks) and **production**. Add more only when a stage has a real purpose, such as performance testing or a customer demo. Each extra environment costs money and attention, and an environment that drifts from production gives false confidence.

Keep differences between environments in configuration (addresses, sizes, secrets), not in code, and keep configuration in files that are reviewed like code.

## Build once, promote many times

The pipeline builds an artifact (a container image or package) one time, gives it a version, and records its digest. Every later stage deploys exactly that artifact. Only the configuration changes.

```text
build  ->  image shop@sha256:9f2c...  ->  dev  ->  staging  ->  production
                                          ^ tests    ^ checks     ^ approval
```

If a bug is found in staging, you fix it in code, build a new artifact, and start the journey again. You never patch an artifact on its way to production. Promotion by digest also gives you rollback for free: the previous digest is known and was already tested.

## Gates: automatic and human

A **gate** is a condition for moving to the next environment.

- Automatic gates: tests pass, scan has no critical findings, smoke test on the new environment, error rate normal for ten minutes.
- Human approvals: needed where a person must judge risk, for example a database migration or a change in a regulated system.

Use automation wherever the answer can be computed, because people approving everything become a rubber stamp. When a human approves, show the evidence: what changed, test results, the risk, and the rollback plan. The approver should not be the author. Also define an emergency path with fewer steps but the same record, so that urgent fixes do not tempt people to bypass the pipeline.

## Know what runs where

At any moment you should be able to answer: which version runs in production, who approved it, and which commit it came from. Record deploy events (environment, version, time, approver) in one place, and show the current versions on a dashboard. Add a deploy marker to monitoring graphs, so that a change in error rate can be tied to a release within seconds. For audits, keep the approval and test evidence with the release for the period the rules require.

```predict
Q: Staging uses a build from Monday, but production gets a build from Tuesday made from the same branch. What risk did you create?
???
Production runs code and dependencies that were never tested in staging. Promote the same artifact instead of rebuilding.
> Rebuilding for each environment breaks the link between test and release.
```

## Incident: Tested in staging, broken in production

> **Incident:** A release passed every staging check and failed on its first request in production with a missing library.

```console
$ docker inspect --format "{{.Image}}" staging-shop prod-shop
sha256:41aa...
sha256:b072...
```

Staging and production ran different images. The pipeline had one job per environment and each job ran its own `docker build`. A transitive dependency was released between the two builds. The team changed the pipeline to build once, push the image with its digest, and deploy that digest to each environment, and a check now fails the production deploy if the digest was not first deployed and tested in staging.

## Common mistakes

- Rebuilding the artifact for each environment
- Letting staging drift away from production
- Approvals without evidence, so people click through
- No emergency path, which leads to bypassing the pipeline

```quiz
Q: What does promotion mean in a delivery pipeline?
+ Moving the same built artifact through environments
- Giving someone a higher role :: That is a different promotion.
- Rebuilding with the same commit :: That produces a different artifact.
- Copying source code between servers :: That is not how artifacts move.
> Same artifact, different configuration.

Q: Where should differences between environments live?
+ In configuration, not in code
- In separate branches of the code :: That makes drift certain.
- In the artifact :: That breaks promotion.
- In people's memory :: It is not repeatable.
> Configuration is reviewed and applied per environment.

Q: When is a human approval most useful?
+ When a person must judge risk that cannot be computed, such as a risky migration
- For every test run :: That wastes attention.
- For comment changes :: The risk is tiny.
- Never :: Some changes need human judgement.
> Automate what you can compute.

Q: How does promotion by digest help rollback?
+ The previous digest is known and was already tested
- It deletes the new version :: Nothing is deleted.
- It builds the old code again :: It reuses the old artifact.
- It disables monitoring :: It does not.
> Rollback means deploying the old digest.
```

```cards
Build once, then :: promote the same digest
Differences between environments :: configuration only
Automatic gate examples :: tests, scan, smoke test, error rate
Approver should be :: not the author
Show on graphs :: deploy markers
```
