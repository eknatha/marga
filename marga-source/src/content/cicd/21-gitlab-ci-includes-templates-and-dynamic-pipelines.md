---
title: GitLab CI: includes, templates and child pipelines
minutes: 14
summary: Share pipeline configuration with include and extends, split large pipelines into parent and child pipelines and generate jobs dynamically.
---

One file works for a small project, but a company with hundreds of repositories needs sharing. GitLab gives you includes, inheritance and downstream pipelines so common logic lives in one place and large repositories do not run everything every time.

## What you will learn

- Using include to share configuration
- Reusing blocks with extends and hidden jobs
- Parent and child pipelines for monorepos
- Generating a child pipeline dynamically

## Include and extends

```yaml
include:
  - project: platform/ci-templates
    ref: v3.2.0
    file: /templates/build.yml
  - local: /ci/lint.yml

.deploy-base:
  image: registry.example.com/tools/deploy:1.9
  before_script:
    - ./login.sh

deploy-staging:
  extends: .deploy-base
  script: ./deploy.sh staging

deploy-prod:
  extends: .deploy-base
  script: ./deploy.sh production
  when: manual
```

`include` pulls in files from the same project, another project, a remote URL or GitLab's own templates. Always set `ref` to a tag so a template change cannot break every project unexpectedly. A job starting with a dot is **hidden**: it does not run, but other jobs can inherit from it with `extends`, and the child's keys override the parent's.

## Parent and child pipelines

```yaml
trigger-api:
  trigger:
    include: services/api/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes: [services/api/**/*]
```

A **child pipeline** is a separate pipeline started by a job in the parent. With `strategy: depend` the parent waits and takes the child's result. Combined with `changes`, only affected services run, which is the usual answer for monorepos.

## Dynamic child pipelines

```yaml
generate:
  stage: build
  script: ./make-pipeline.sh > generated.yml
  artifacts:
    paths: [generated.yml]

run-generated:
  stage: test
  trigger:
    include:
      - artifact: generated.yml
        job: generate
```

A script writes a YAML file as an artifact, and the next job triggers it as a pipeline. Use this when the set of jobs depends on the change, such as one job per modified package. Keep generators simple and test the generated YAML, because an error appears only at run time.

## Incident: The template that broke every project

> **Incident:** An unpinned shared template change failed pipelines across the company.

```console
include: project platform/ci-templates, ref main
error: jobs:build config contains unknown keys: cahce
112 pipelines failed in 10 minutes
```

A typo was merged to the shared template, and every project followed the main branch. The platform team pinned includes to version tags, added tests that lint the template against sample projects and published a release process, so changes roll out gradually.

## Common mistakes

- Including shared templates from a moving branch
- Deeply nested includes nobody can follow
- Dynamic pipelines with no tests for the generator
- Running all services on every change in a monorepo

```quiz
Q: What does a hidden job start with?
+ A dot
- An underscore :: No.
- A hash :: No.
- A dash :: No.
> Hidden jobs do not run and are used with extends.

Q: What does strategy depend do on a trigger job?
+ The parent waits for the child pipeline result
- Skips the child :: No.
- Runs the child twice :: No.
- Cancels the parent :: No.
> It links their status.

Q: How should include refs be set?
+ Pinned to a tag
- To a moving branch :: No.
- Left empty :: No.
- To a random commit :: No.
> Stable refs avoid surprise breakage.

Q: When use a dynamic child pipeline?
+ When the jobs depend on what changed
- Never :: No.
- Only for docs :: No.
- Only for deploys :: No.
> A script generates the YAML.
```

```cards
include :: Imports CI config from another file or project
extends :: Inherits keys from another job
Child pipeline :: A pipeline started by a job in a parent pipeline
Hidden job :: A job name beginning with a dot that is a template only
Dynamic pipeline :: A child pipeline generated as an artifact
```
