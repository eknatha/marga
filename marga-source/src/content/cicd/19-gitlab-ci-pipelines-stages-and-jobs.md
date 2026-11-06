---
title: GitLab CI: pipelines, stages and jobs
minutes: 14
summary: Write a .gitlab-ci.yml with stages, jobs, variables and images, and understand how pipelines, jobs and runners fit together.
---

GitLab CI is part of the GitLab product and is configured by one YAML file at the root of the repository. Learn the vocabulary of stages, jobs, scripts and images, and you can read almost any GitLab pipeline.

## What you will learn

- The structure of .gitlab-ci.yml
- How stages and jobs run
- Choosing images and writing scripts
- Using variables and predefined variables

## The file

```yaml
stages: [build, test, deploy]

default:
  image: node:20-alpine

variables:
  NODE_ENV: test

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths: [dist/]
    expire_in: 1 day

unit:
  stage: test
  script:
    - npm test

lint:
  stage: test
  script:
    - npm run lint

deploy:
  stage: deploy
  script:
    - ./deploy.sh "$CI_COMMIT_SHORT_SHA"
  environment: production
  when: manual
```

**Stages** run in order and jobs inside a stage run in parallel. A job runs in the container named by `image`, and `script` is the list of commands. `before_script` and `after_script` wrap it. Here `unit` and `lint` run at the same time after `build` finishes.

## Variables

GitLab provides predefined variables such as `CI_COMMIT_SHA`, `CI_COMMIT_BRANCH` and `CI_PIPELINE_ID`. You set your own in `variables:` at file or job level, or in project settings where they can be **masked** and **protected**. A job-level value overrides a file-level one.

## Faster pipelines with needs

```yaml
unit:
  stage: test
  needs: [build]
  script: [npm test]
```

With `needs`, a job starts as soon as the jobs it names finish, even if the rest of its stage is still running. This turns the stage list into a graph and often shortens pipelines a lot.

## Reading a pipeline

The pipeline page shows jobs as boxes by stage. Open a job to see the log, the image and the runner that ran it. Use `CI Lint` in the editor to check syntax before pushing, and retry only the failed job instead of the whole pipeline.

## Incident: The stage that waited for nothing

> **Incident:** A pipeline took 40 minutes because every stage waited for the one before it.

```console
Pipeline #5521 duration: 40m12s
build 6m  test 21m  package 4m (waited 21m)
package depended only on build
```

The package job needed only build output but sat in a later stage and waited for the slow tests. Adding needs: [build] let it start immediately, and the pipeline dropped to 28 minutes. The team also moved quick lint to the first stage so developers saw feedback within two minutes.

## Common mistakes

- Putting slow jobs first so feedback is late
- Not using needs, so jobs wait unnecessarily
- Hard-coding values instead of variables
- Storing secrets in the YAML file

```quiz
Q: How do jobs in one stage run?
+ In parallel
- One at a time :: No.
- Only manually :: No.
- Only on tags :: No.
> Stages run in order but their jobs run together.

Q: What lets a job start before its stage begins?
+ needs
- image :: No.
- script :: No.
- tags :: No.
> needs defines a graph.

Q: Where do you set the container image for all jobs?
+ default
- stages :: No.
- artifacts :: No.
- rules :: No.
> default applies to every job.

Q: Which variable holds the short commit hash?
+ CI_COMMIT_SHORT_SHA
- CI_JOB_ID :: No.
- HOME :: No.
- PATH :: No.
> A predefined variable.
```

```cards
Stage :: An ordered group of jobs
Job :: A unit of work with a script, run on a runner
needs :: Lets a job start when named jobs finish
Predefined variable :: A CI_ variable GitLab sets for each job
artifacts :: Files kept from a job and passed on
```
