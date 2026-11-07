---
title: GitLab CI: rules, artifacts and caches
minutes: 13
summary: Control when jobs run with rules, pass build output with artifacts and speed pipelines with caches that are keyed correctly.
---

Real pipelines do different things for merge requests, the default branch and tags. GitLab expresses that with rules, and it gives you two tools for keeping files, artifacts and caches, which look similar but have very different guarantees.

## What you will learn

- Writing rules with if, changes and exists
- Preventing duplicate pipelines with workflow rules
- When to use artifacts and when caches
- Cache keys, policies and expiry

## Rules

```yaml
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS
      when: never
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_COMMIT_TAG

docs:
  script: make docs
  rules:
    - changes: [docs/**/*]

release:
  script: ./release.sh
  rules:
    - if: $CI_COMMIT_TAG
      when: on_success
    - when: never
```

`rules` are checked in order and the first match decides. A job with no matching rule is not added. `workflow:rules` controls whether the whole pipeline is created, which is how you stop the duplicate branch and merge request pipelines. Prefer `rules` over the older `only` and `except`, and do not combine them in one job.

## Artifacts and caches

```yaml
build:
  script: [make build]
  artifacts:
    paths: [dist/]
    expire_in: 1 week
    reports:
      junit: report.xml

test:
  cache:
    key:
      files: [package-lock.json]
    paths: [.npm/]
    policy: pull-push
  script: [npm ci --cache .npm, npm test]
```

**Artifacts** are uploaded to GitLab, passed to later jobs and downloadable, so use them for results you must rely on: binaries, reports and test output. **Cache** stores dependency files between pipelines on the runner side or in object storage, and it may be missing, so every job must work without it. Key the cache by the lockfile so it refreshes when dependencies change, and use `policy: pull` in jobs that only read it.

## Pitfalls

Do not put build outputs in the cache and expect them later. Set `expire_in` on artifacts so storage does not grow without bound. Never place secrets in artifacts, because anyone with access can download them.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GitLab CI: rules, artifacts and caches fits together
node: n1 | Rules | 0 | 0 | rules are checked in order and the first match decides. | Mixing only and except with rules in one job. | process
node: n2 | Artifacts and caches | 1 | 1 | Artifacts are uploaded to GitLab, passed to later jobs and downloadable, so use them for results you must rely on: binaries, reports and test output. | Cache keys that never change. | store
node: n3 | Pitfalls | 2 | 0 | Do not put build outputs in the cache and expect them later. | Relying on cache for build outputs. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Two pipelines for one change

> **Incident:** Every merge request ran a branch pipeline and a merge request pipeline.

```console
Pipeline #901 for branch feature/login
Pipeline #902 for merge request !44
same commit, same jobs, double runner time
```

Jobs had no rules, so GitLab created a pipeline for the branch push and another for the merge request. The team added workflow rules that run merge request pipelines and skip the branch pipeline when a merge request is open, which removed half of the load and the confusing duplicate statuses.

## Common mistakes

- Mixing only and except with rules in one job
- Relying on cache for build outputs
- Artifacts without expiry
- Cache keys that never change

```quiz
Q: Which file type is guaranteed to reach later jobs?
+ Artifacts
- Cache :: No.
- Variables :: No.
- Tags :: No.
> Artifacts are uploaded and passed on.

Q: What does workflow rules control?
+ Whether the whole pipeline is created
- The cache key :: No.
- The image :: No.
- The runner tag :: No.
> It prevents duplicate pipelines.

Q: How should a dependency cache be keyed?
+ By the lockfile contents
- By a fixed word :: No.
- By the job name only :: No.
- By time :: No.
> The key changes when dependencies change.

Q: What happens when no rule matches a job?
+ The job is not added to the pipeline
- It runs anyway :: No.
- The pipeline fails :: No.
- It runs twice :: No.
> Rules decide inclusion.
```

```cards
rules :: Conditions that decide whether a job is added
workflow rules :: Pipeline-level rules for creating a pipeline
Artifact :: Job output stored and passed on with a guarantee
Cache :: Best-effort store of files between runs
expire_in :: How long artifacts are kept
```
