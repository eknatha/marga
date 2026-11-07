---
title: GitHub Actions: triggers, matrices and caching
minutes: 13
summary: Choose the right triggers, run a build matrix, cancel stale runs and cache dependencies to keep Actions fast and predictable.
---

A workflow that runs on everything is slow and expensive, and one that misses an important event is useless. This lesson covers triggers that match intent, matrices that test several versions and caches that stop rebuilding what has not changed.

## What you will learn

- Common triggers and path and branch filters
- Build matrices with include, exclude and fail-fast
- Concurrency groups that cancel stale runs
- Caching with keys and restore keys

## Triggers

```yaml
on:
  push:
    branches: [main]
    paths: ['src/**', 'package-lock.json']
  pull_request:
    types: [opened, synchronize, reopened]
  schedule:
    - cron: '17 3 * * 1'
  workflow_dispatch:
```

`push` and `pull_request` are the everyday triggers. `paths` skips runs that cannot be affected. `schedule` uses UTC cron, and `workflow_dispatch` adds a manual button. Be careful with `pull_request_target`: it runs with write access and secrets in the context of the base branch, so never check out and run untrusted pull request code there.

## Matrices

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        node: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
        exclude:
          - os: windows-latest
            node: 18
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm test
```

A matrix creates one job per combination. `fail-fast: false` lets the others finish so you see every failure. Use `exclude` to drop combinations and `include` to add special ones. Large matrices multiply cost, so test the edges of your support range, not every value.

## Concurrency and caching

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

This cancels an older run when a newer commit lands on the same branch. Do not use it for deployments to production, where you want runs to queue instead.

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: npm-
```

The **key** must change when dependencies change, so hash the lockfile. `restore-keys` allow a partial hit that still saves time. Caches are shared by branch scope and are not for secrets or build outputs you rely on being fresh.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GitHub Actions: triggers, matrices and caching fits together
node: n1 | Triggers | 0 | 0 | push and pull_request are the everyday triggers. | Using pull_request_target to run untrusted code. | process
node: n2 | Matrices | 1 | 1 | A matrix creates one job per combination. | Running every workflow on every push. | process
node: n3 | Concurrency and caching | 2 | 0 | This cancels an older run when a newer commit lands on the same branch. | Cache keys that never change, so stale dependencies persist. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Two deploys at once

> **Incident:** Two runs deployed to production at the same time and left a mixed release.

```console
run 812: deploying build 41
run 813: deploying build 42
cancelled run 812 midway
service reports versions 41 and 42
```

Cancel-in-progress had been copied from the test workflow to the deploy workflow. A newer push cancelled a deployment halfway through and left the service half updated. The team separated the two: tests cancel stale runs, while deployments use a concurrency group that queues and never cancels.

## Common mistakes

- Running every workflow on every push
- Using pull_request_target to run untrusted code
- Cache keys that never change, so stale dependencies persist
- Cancelling in-progress deployments

```quiz
Q: What makes a good cache key for dependencies?
+ A hash of the lockfile
- The current time :: No.
- The branch name only :: No.
- A random value :: No.
> The key must change when dependencies change.

Q: What does fail-fast false do in a matrix?
+ Lets other combinations finish after one fails
- Stops all jobs at once :: No.
- Skips the matrix :: No.
- Hides errors :: No.
> You see every failing combination.

Q: What should you avoid with pull_request_target?
+ Checking out and running untrusted pull request code
- Using paths :: No.
- Using cron :: No.
- Using needs :: No.
> It has secrets and write access.

Q: Where is cancel-in-progress usually unsafe?
+ Production deployments
- Linting :: No.
- Unit tests :: No.
- Documentation builds :: No.
> Cancelling a deploy can leave a mixed release.
```

```cards
paths filter :: Runs a workflow only when matching files change
Matrix :: One job expanded across combinations of values
concurrency group :: Limits runs sharing a key to one at a time
restore-keys :: Fallback cache prefixes for partial hits
workflow_dispatch :: Trigger for a manual run
```
