---
title: GitHub Actions: runners, environments and deployments
minutes: 13
summary: Choose hosted or self-hosted runners, protect deployments with environments and approvals, and keep runner fleets safe and scalable.
---

Two decisions shape most Actions setups: where jobs run and how deployments are protected. Hosted runners are easy but limited, self-hosted runners are powerful but risky, and environments add the human and technical gates that production deserves.

## What you will learn

- Hosted versus self-hosted runners and when to choose each
- Why ephemeral runners are safer
- Environments, reviewers and scoped secrets
- Deploy jobs with concurrency and rollback thinking

## Choosing runners

Hosted runners are fresh virtual machines that the platform patches and discards, with fixed sizes and per-minute billing. Choose **self-hosted** runners when jobs need private network access, special hardware such as GPUs, large caches or lower unit cost at scale. Select them with labels:

```yaml
jobs:
  build:
    runs-on: [self-hosted, linux, x64, gpu]
```

## Make self-hosted runners ephemeral

A long-lived runner keeps files, caches and credentials from earlier jobs. The safer pattern is an **ephemeral** runner that registers, runs one job and is destroyed, usually launched on demand by an autoscaler such as a Kubernetes controller. Never attach self-hosted runners to public repositories, because a pull request from a stranger could run code inside your network.

## Environments

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://shop.example.com
    concurrency:
      group: deploy-production
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
        env:
          TOKEN: ${{ secrets.PROD_TOKEN }}
```

An **environment** can require reviewers, add a wait timer, limit which branches may deploy and hold its own secrets. The job pauses until a reviewer approves, and the deployment is recorded with its URL. The concurrency group queues deployments one at a time.

## Deployment habits

Deploy the artifact you tested, by digest or version, not a fresh rebuild. Run a smoke test after deploy and make rollback a normal path: redeploy the previous version through the same workflow. Record who approved and what shipped.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GitHub Actions: runners, environments and... fits together
node: n1 | Choosing runners | 0 | 0 | Hosted runners are fresh virtual machines that the platform patches and discards, with fixed sizes and per-minute billing. | Long-lived self-hosted runners shared across trust levels. | process
node: n2 | Make self-hosted runners ephemeral | 1 | 1 | A long-lived runner keeps files, caches and credentials from earlier jobs. | Self-hosted runners on public repositories. | process
node: n3 | Environments | 2 | 0 | An environment can require reviewers, add a wait timer, limit which branches may deploy and hold its own secrets. | Production deploys with no approval or branch restriction. | process
node: n4 | Deployment habits | 3 | 1 | Deploy the artifact you tested, by digest or version, not a fresh rebuild. | Rebuilding for deploy instead of promoting the tested artifact. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The runner that remembered

> **Incident:** A leftover credential on a long-lived runner was used by a later job.

```console
Run ls ~/.aws
credentials  config
job 7731 used role from job 7702
```

The team ran a handful of permanent self-hosted runners. An earlier job wrote credentials to the home directory and never cleaned up. A different repository's job later found and used them. The team moved to ephemeral runners created per job, one runner group per trust level and OIDC so no key was written to disk.

## Common mistakes

- Long-lived self-hosted runners shared across trust levels
- Self-hosted runners on public repositories
- Production deploys with no approval or branch restriction
- Rebuilding for deploy instead of promoting the tested artifact

```quiz
Q: What makes a runner ephemeral?
+ It runs one job then is destroyed
- It is always on :: No.
- It is hosted by a customer :: No.
- It has no labels :: No.
> Fresh state each job removes leftovers.

Q: What can an environment add?
+ Required reviewers and scoped secrets
- A new branch :: No.
- A new language :: No.
- A cache key :: No.
> Environments gate deployments.

Q: When pick self-hosted runners?
+ Private network access or special hardware
- Never :: No.
- Only for small repositories :: No.
- To avoid patching :: No.
> They suit special needs.

Q: Why avoid self-hosted runners on public repositories?
+ Strangers' pull requests could run code in your network
- They are slower :: No.
- They cost more :: No.
- They lack logs :: No.
> Untrusted code reaches your infrastructure.
```

```cards
Hosted runner :: A platform-managed fresh virtual machine
Self-hosted runner :: A machine you run and register yourself
Ephemeral runner :: A runner that handles one job and is removed
Environment :: A named deployment target with protection rules
Runner label :: Tag used by runs-on to choose a runner
```
