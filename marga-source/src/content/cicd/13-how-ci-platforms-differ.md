---
title: How CI platforms work and how the three differ
minutes: 12
summary: Compare the shared model behind every CI system and what makes GitHub Actions, GitLab CI and Tekton different in practice.
---

Before learning any one tool, it helps to see the model they all share. A pipeline is a set of jobs that run on workers when something happens, and each platform is a different answer to who defines the pipeline, who owns the workers and how much is built in.

## What you will learn

- The shared model: event, pipeline, job, step, runner, artifact
- How GitHub Actions, GitLab CI and Tekton each express that model
- What differs in hosting, extensibility and security defaults
- A simple rule for choosing between them

## The shared model

An **event** (a push, a pull request, a tag, a schedule or a manual click) starts a **pipeline**. The pipeline is made of **jobs**, and each job is a list of **steps** that run on a **runner**, which is just a machine or container that executes work. Jobs can pass **artifacts** to each other and report a status back to the change that triggered them. Learn these words once and every platform becomes a dialect of the same language.

## Three dialects

```yaml
# GitHub Actions: .github/workflows/ci.yml
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: make test
```

```yaml
# GitLab CI: .gitlab-ci.yml
test:
  image: alpine:3.20
  script:
    - make test
```

```yaml
# Tekton: a Task is a Kubernetes resource
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: test
spec:
  steps:
    - name: test
      image: alpine:3.20
      script: make test
```

Actions and GitLab CI read a YAML file from the repository and run it on runners the platform schedules. Tekton has no server of its own: a Task or Pipeline is a custom resource in Kubernetes, a **TaskRun** or **PipelineRun** creates pods, and each step is a container in one pod.

## What really differs

- **Where it lives:** Actions is built into the hosted code service, GitLab CI into the GitLab product, Tekton into any cluster.
- **Who owns workers:** hosted runners are zero effort but limited and billed by minute. Self-hosted runners give control and cost you patching and isolation work.
- **Extensibility:** Actions has a large marketplace of reusable actions. GitLab leans on includes and templates. Tekton gives you building blocks and expects you to assemble your own platform.
- **Security defaults:** a marketplace action is third-party code in your pipeline, a shared runner is shared infrastructure and a Tekton service account is real cluster access. Each model has a different risk to manage.

## A simple choice rule

Use the platform that sits next to your code and reviews, unless you have a clear reason not to. Choose Tekton when you must run CI inside your own clusters, need Kubernetes-native scheduling and policies, or are building an internal delivery platform. Avoid mixing three tools without a reason, because every extra system is another thing to patch, secure and teach.

## Incident: The pipeline that did not translate

> **Incident:** A migration stalled because the new platform handled caching and approvals differently.

```console
$ ci-migrate check old-pipeline.yml
warning: cache key syntax not supported
warning: manual approval has no direct equivalent
2 of 11 jobs need redesign
```

The team had assumed a pipeline was just a list of shell commands. The commands moved easily, but caching, approvals, secrets and runner labels were platform features with different rules. They rewrote those parts on purpose, kept the build logic in scripts that any platform can call, and treated the pipeline file as a thin wrapper.

## Common mistakes

- Putting all build logic inside platform-specific YAML
- Choosing a tool by popularity instead of where code and workers live
- Ignoring who patches and isolates self-hosted runners
- Running three CI systems with no owner for any

```quiz
Q: What is a runner?
+ The machine or container that executes a job
- The file that defines the pipeline :: No.
- The branch that triggers a build :: No.
- The registry that stores images :: No.
> Jobs run on runners; the lesson section on the shared model explains why.

Q: Which platform expresses pipelines as Kubernetes resources?
+ Tekton
- GitLab CI :: No.
- GitHub Actions :: No.
- Jenkins freestyle :: No.
> A Task or Pipeline is a custom resource.

Q: What keeps migrations easier between platforms?
+ Keeping build logic in scripts the pipeline calls
- Copying vendor YAML everywhere :: No.
- Disabling caching :: No.
- Using only manual jobs :: No.
> Thin pipeline files port better.

Q: When is Tekton a strong choice?
+ When CI must run inside your own clusters or form an internal platform
- When you only need a hosted free tier :: No.
- When no Kubernetes exists :: No.
- When you want a marketplace of actions :: No.
> It is Kubernetes-native.
```

```cards
Event :: Something that starts a pipeline, such as a push or tag
Runner :: The worker that executes a job's steps
TaskRun :: A Tekton resource that runs one Task as a pod
Artifact :: A file passed between jobs or kept after a run
Thin pipeline :: Pipeline config that calls scripts instead of holding logic
```
