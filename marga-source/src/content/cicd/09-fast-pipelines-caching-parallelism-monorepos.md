---
title: Fast pipelines: caching, parallelism and monorepos
minutes: 13
summary: Cut pipeline time by running independent jobs in parallel, caching dependencies and build output, running only what changed in a monorepo, and measuring where the minutes go.
---

A pipeline that takes forty minutes teaches people to batch changes, skip tests and stop trusting the result. Fast feedback is a quality feature. The good news is that most slow pipelines waste time in a few predictable places, and you can fix them one by one.

## What you will learn

- Measuring a pipeline before changing it
- Parallel jobs and test sharding
- Dependency and build caches that are correct
- Running only what changed in a monorepo
- Runner sizing and keeping images small

## Measure first

Write down the duration of each stage over the last twenty runs. Look at the median and at the slowest run, not the best. The usual suspects: installing dependencies, building images from scratch, a long single test job, waiting for a shared runner, and slow end-to-end tests. Fix the biggest first.

## Parallelism

Jobs that do not depend on each other should run at the same time: lint, unit tests, type checks, and security scans. Split a long test job into shards (for example four jobs, each running a quarter of the tests, balanced by recorded duration):

```yaml
test:
  parallel: 4
  script:
    - ./run-tests.sh --shard $SHARD_INDEX/$SHARD_TOTAL
```

Keep the number of parallel jobs below your runner capacity, or jobs wait in a queue and the gain disappears.

## Caching correctly

A cache must be fast and must never serve stale or poisoned data. Rules:

- Key dependency caches on a hash of the lockfile, so a change in dependencies creates a new cache.
- Cache the package manager's download directory, not the installed project.
- Use read-only caches for pull request builds when you worry about cache poisoning from untrusted code.
- For container builds, use a registry cache (see the lesson on BuildKit).
- Build tools such as Bazel, Gradle and Nx have remote caches that reuse build and test results by input hash.

## Monorepos: only run what changed

In a repository with many services, build and test only what a change can affect:

```yaml
rules:
  - changes: ["services/payments/**/*", "libs/common/**/*"]
```

Dependency-aware tools (Nx, Bazel, Turborepo) compute the affected targets from the dependency graph. Be careful: if a shared library changes, all dependents must run. Always run the full pipeline on the main branch on a schedule to catch gaps in the rules.

## Other savings

- Use a small, prebuilt image with your tools instead of installing them in each run.
- Run slow end-to-end tests after merge or on a schedule, and keep a small smoke test on each change.
- Cancel old runs when a new commit arrives for the same branch.
- Use larger runners for heavy builds; one four-core job may be cheaper than a sixteen-minute two-core job.
- Fail fast: run the cheapest checks first.

```predict
Q: Your dependency cache key is only the branch name. What goes wrong?
???
When the lockfile changes, the old cache is reused, so builds use outdated dependencies, or fail in confusing ways.
> Include a hash of the lockfile in the key.
```

## Incident: the thirty-eight minute pipeline

> **Incident:** A team's merge request pipeline grows to 38 minutes, and developers start merging without waiting for it.

```console
stage        median   p95
install      9m       14m
unit tests   16m      19m
e2e          10m      22m
build image  3m       5m
```

Dependencies were reinstalled each run, the unit tests ran in one job and the end-to-end tests ran on every change. The team cached by lockfile hash (install fell to one minute), sharded unit tests into four jobs (to five minutes), moved most end-to-end tests to run after merge, kept three smoke tests on each change, and canceled outdated runs. The median fell to eleven minutes, and people started to wait for it again.

## Common mistakes

- Optimising without measuring
- Caches that can be poisoned or stale
- More parallel jobs than runners
- Skipping the full run for the monorepo

```quiz
Q: What should you do before optimising a slow pipeline?
- Buy larger runners :: You may fix the wrong stage.
+ Measure the duration of each stage across many runs
- Delete tests :: This lowers quality.
- Rewrite the application :: Unrelated.
> Fix the biggest cost first.

Q: What is a good dependency cache key?
- The branch name :: It does not change with dependencies.
+ A hash of the lockfile
- The date :: It expires for no reason.
- The author :: Unrelated.
> New dependencies produce a new cache.

Q: Why run a scheduled full pipeline on a monorepo with path-based rules?
+ To catch changes that the path rules failed to connect
- To save money :: It costs more.
- To delete caches :: Unrelated.
- To rename files :: Unrelated.
> Rules can miss dependencies.

Q: What is test sharding?
+ Splitting tests across parallel jobs
- Encrypting tests :: Unrelated.
- Skipping slow tests :: That is a different decision.
- Merging tests into one file :: Opposite.
> Balanced shards reduce wall time.
```

```cards
First step in speeding up a pipeline? :: Measure each stage
Cache key for dependencies? :: Hash of the lockfile
What is sharding? :: Splitting tests across parallel jobs
Monorepo saving? :: Run only the affected targets
Quick wins? :: Cancel outdated runs, small prebuilt images, fail fast
```
