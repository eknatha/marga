---
title: Choosing and migrating between CI platforms
minutes: 12
summary: Compare GitHub Actions, GitLab CI and Tekton on cost, security, scale and effort, and plan a safe migration from one to another.
---

Choosing a CI platform is a long-term decision, and moving later costs real time. A clear comparison and a careful migration plan avoid both the wrong choice and a stalled migration.

## What you will learn

- A comparison table you can reuse
- Questions that decide the choice
- A migration plan that limits risk
- Measuring whether the move helped

## Comparison

| Area | GitHub Actions | GitLab CI | Tekton |
| --- | --- | --- | --- |
| Where it runs | Hosted by the code platform, or your runners | Hosted or self-managed, or your runners | Your Kubernetes clusters |
| Config | YAML in the repository | YAML in the repository | Kubernetes custom resources |
| Reuse | Marketplace, reusable workflows | Includes, templates | Tasks, bundles, catalogs |
| Strength | Ecosystem and ease | Integrated platform and DAG | Control and cloud-native fit |
| Cost to run | Minutes plus runner effort | License plus runner effort | Cluster and platform team effort |

Tekton is rarely a developer's first choice on its own. It fits when a platform team builds a delivery product on Kubernetes.

## Questions that decide

- Where do code and reviews live now? Staying close removes integration work.
- Who must own and patch the workers, and is that acceptable?
- Do builds need private networks, special hardware or air-gapped clusters?
- What audit, approval and policy evidence does your industry require?
- What does the bill look like at your build volume?
- What skills does the team already have?

## Migration plan

```bash
# inventory: list pipelines and what they use
grep -rl "docker build" --include="*.yml" . | wc -l
# move logic into scripts any platform can call
./ci/build.sh && ./ci/test.sh && ./ci/package.sh
```

1. **Inventory** pipelines, secrets, runners, schedules and integrations.
2. **Extract** build logic into scripts so the platform file becomes thin.
3. **Pilot** with one low-risk service and write down what surprised you.
4. **Run in parallel** and compare duration, results and cost.
5. **Cut over** in waves with a rollback date, then archive the old pipeline.

## Measure

Track lead time, failure rate, queue time and cost before and after. If the numbers do not improve, find out why before moving the next wave.

## Incident: Ten months for a three month plan

> **Incident:** A migration dragged on because every pipeline had hidden dependencies.

```console
inventory: 214 pipelines
undocumented secrets found: 61
pipelines calling internal scripts by path: 87
```

The plan treated each pipeline as a copy job. Discovery showed secrets nobody had documented and scripts called by absolute path. The team paused, built the shared scripts layer, ran a pilot, documented the surprises and then moved in waves, finishing predictably.

## Common mistakes

- Choosing by trend instead of requirements
- Migrating everything at once
- Leaving logic in platform-specific YAML
- No success metrics for the move

```quiz
Q: What is the first migration step?
+ Inventory pipelines, secrets and runners
- Switch off the old system :: No.
- Delete the old runners :: No.
- Rewrite all YAML :: No.
> You cannot plan what you have not found.

Q: Why extract logic into scripts?
+ The platform file becomes thin and portable
- Scripts are slower :: No.
- It removes tests :: No.
- It hides secrets :: No.
> Scripts run on any platform.

Q: When is Tekton a fit?
+ When a platform team builds on Kubernetes
- When you want zero operations :: No.
- When you have no cluster :: No.
- When you only need a hosted free tier :: No.
> It requires cluster ownership.

Q: How do you know a migration helped?
+ Compare lead time, failure rate and cost before and after
- Count the YAML files :: No.
- Ask nobody :: No.
- Delete the old logs :: No.
> Measure results. The lesson section above explains why.
```

```cards
Pilot :: A small first migration to learn what breaks
Thin pipeline :: Platform config that calls portable scripts
Parallel run :: Running old and new pipelines to compare results
Cutover :: Switching traffic or builds to the new system
Inventory :: A full list of pipelines, secrets and runners
```
