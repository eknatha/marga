---
title: Debugging failing and flaky pipelines
minutes: 14
summary: Reproduce pipeline failures locally, tell real failures from flaky ones, find environment drift, cache and secret problems, and stop one bad run from blocking a team.
---

Pipelines fail for reasons that have nothing to do with your change: a cache that went stale, a dependency that moved, a runner that ran out of disk, or a test that depends on timing. If you cannot tell a real failure from noise, people start re-running until green, and real problems pass through.

## What you will learn

- Reading a failing job from the first error, not the last line
- Reproducing a failure outside the pipeline
- Flaky tests, cache problems and drift between local and CI
- Debugging secrets and permissions without printing them

## Read the first error

The last lines of a job often say only "exit code 1". The cause is higher up. Search the log for the first line containing `error`, `failed` or a stack trace, and check what ran just before it. Note the exact command, the working directory and the versions of tools printed at the start of the job.

## Reproduce it locally

```bash
docker run --rm -it -v "$PWD":/work -w /work node:20.11 bash   # same image as the job
npm ci && npm test                                                # same commands
env | sort | grep -v -i -E 'token|secret|key|pass'                # compare environment, safely
```

Use the same image tag, the same commands and a clean checkout. If it passes locally and fails in CI, compare tool versions, environment variables, file permissions, time zone, available memory and network access.

## Flaky or real?

| Sign | Likely cause | Fix |
|------|--------------|-----|
| Passes on retry, fails randomly | Timing, order or shared state | Remove sleeps, isolate data, fix the test |
| Fails only on one runner | Runner disk, memory or stale cache | Clean the runner, pin its image |
| Fails after a dependency release | Unpinned versions | Use a lockfile and pinned versions |
| Fails near midnight or month end | Date logic | Inject the clock in tests |

Track flaky tests in a list with a count. A retry hides the symptom and keeps the cost, so use it only with a limit and a ticket.

## Caches and secrets

A cache keyed only on the branch name can serve old build output. Key it on a hash of the lockfile. For secrets, check that the variable exists and is not empty without printing it:

```bash
[ -n "${API_TOKEN:-}" ] && echo "API_TOKEN is set (length ${#API_TOKEN})" || echo "API_TOKEN missing"
```

Masking hides values in logs but does not stop a script from encoding and printing them, so never enable shell tracing in jobs that handle secrets.

```predict
Q: A test passes alone but fails when the whole suite runs. What is the most likely reason?
???
Tests share state such as a database row, a file or a global variable, and one test changes what another expects.
> Run the failing test with the one before it, then isolate or reset the shared data. Random test ordering finds these problems early.
```

```diagram
title: Triage of a red pipeline
node: first | First error in the log | 0 | 1 | Find the earliest error, the exact command and tool versions. | The last line usually only repeats the exit code.
node: repro | Reproduce locally | 1 | 1 | Run the same image and commands on a clean checkout. | A different local setup passes and proves nothing.
node: classify | Real or flaky | 2 | 0 | Retry once and compare with recent runs on the same commit. | Endless retries hide a genuine defect.
node: env | Environment drift | 2 | 2 | Compare versions, variables, caches and runner state. | Unpinned tools change without any commit.
node: fix | Fix and prevent | 3 | 1 | Add a pin, a test or a cache key so it cannot recur. | A one-time rerun leaves the cause in place.
edge: first | repro
edge: repro | classify
edge: repro | env
edge: classify | fix
edge: env | fix
```

## Incident: green yesterday, red today, same commit

> **Incident:** The main branch pipeline fails at the build step with a compile error. No one changed the code since yesterday.

```console
$ diff <(grep -A2 'lodash' yesterday.log) <(grep -A2 'lodash' today.log)
< lodash 4.17.21
> lodash 4.18.0
```

The project installed dependencies with a range and no lockfile, so a new release was picked up silently and broke the build. The team committed a lockfile, switched to `npm ci`, pinned the build image, and added a scheduled build so drift shows up before a release day.

## Common mistakes

- Re-running until green
- Reading only the last 20 lines
- Caches keyed on a branch name
- Printing environment variables that contain secrets

```quiz
Q: Where should you look first in a long failing job log?
- The last line only :: It often repeats only the exit code.
+ The first error, and the command that ran just before it
- The footer with timing :: Timing rarely explains a failure.
- The job title :: It does not say what failed.
> Later failures are often consequences of the first one.

Q: A pipeline broke without any code change. What is the most likely cause?
- The commit message was too long :: Messages do not affect builds.
+ A dependency, image or tool version changed because it was not pinned
- The repository got larger :: Size alone does not break a build.
- The browser cache was cleared :: A browser is not part of the pipeline.
> Lockfiles and pinned images make builds repeatable.

Q: What is the risk of automatic retries on every failing test?
+ They hide flaky tests and real defects while costing time
- They make tests faster :: They add run time.
- They encrypt the logs :: They do not change log content.
- They remove the cache :: They are unrelated to caches.
> Retries should be limited, counted and tracked with a ticket.

Q: How do you check that a secret variable is set without exposing it?
- Print it with echo :: That puts the value in the log.
+ Test that it is non-empty and print only its length or a yes/no
- Turn on set -x :: Tracing prints expanded values.
- Commit it to the repository :: Never store secrets in the repository.
> A presence check proves the variable exists without leaking it.
```

```cards
Where is the real cause in a long log? :: In the first error, not the last line
What makes builds repeatable? :: Lockfiles, pinned images and pinned tool versions
What is a flaky test? :: One that passes and fails on the same code
Good cache key? :: A hash of the lockfile
Why avoid set -x in secret jobs? :: It can print secret values
```
