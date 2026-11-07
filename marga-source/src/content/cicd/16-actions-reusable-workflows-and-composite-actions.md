---
title: GitHub Actions: reusable workflows and composite actions
minutes: 13
summary: Remove copy and paste between repositories with reusable workflows, composite actions and sensible versioning.
---

Copying a workflow into every repository works until the first change that must be made everywhere. Actions offers two sharing tools, and choosing the right one keeps pipelines small, consistent and easy to update.

## What you will learn

- When to use a reusable workflow and when a composite action
- Defining inputs, secrets and outputs
- Calling a shared workflow safely
- Versioning shared automation

## Reusable workflows

```yaml
# .github/workflows/deploy.yml in the platform repository
on:
  workflow_call:
    inputs:
      environment:
        type: string
        required: true
    secrets:
      deploy_key:
        required: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - uses: actions/checkout@v4
      - run: ./deploy.sh
        env:
          DEPLOY_KEY: ${{ secrets.deploy_key }}
```

```yaml
# a service repository
jobs:
  release:
    uses: acme/platform/.github/workflows/deploy.yml@v2
    with:
      environment: staging
    secrets:
      deploy_key: ${{ secrets.STAGING_KEY }}
```

A reusable workflow is a whole job set triggered by `workflow_call`. The caller uses it at the job level, passes inputs and passes secrets explicitly. It runs as its own jobs, so it can have its own runners, environments and permissions.

## Composite actions

```yaml
# .github/actions/setup-tools/action.yml
name: setup-tools
description: Install the standard toolchain
inputs:
  version:
    description: Tool version
    default: '1.8'
runs:
  using: composite
  steps:
    - run: ./install-tools.sh ${{ inputs.version }}
      shell: bash
```

A composite action packages several **steps** that you call inside any job with `uses`. It is best for small repeated sequences such as setup. It does not create jobs, runners or environments.

## Choosing and versioning

Use a reusable workflow to standardize a whole pipeline stage, such as build and deploy. Use a composite action for a few steps inside a job. Callers should pin to a release tag, or a full commit SHA when the source is outside your control, never to a moving branch. Publish changelogs and keep old major versions working for a while, so one change does not break forty pipelines at once.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GitHub Actions: reusable workflows and composite... fits together
node: n1 | Reusable workflows | 0 | 0 | A reusable workflow is a whole job set triggered by workflow_call. | Calling shared workflows at a moving branch. | queue
node: n2 | Composite actions | 1 | 1 | A composite action packages several steps that you call inside any job with uses. | Using a composite action where separate jobs are needed. | process
node: n3 | Choosing and versioning | 2 | 0 | Use a reusable workflow to standardize a whole pipeline stage, such as build and deploy. | Passing every secret with inherit when two are needed. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The shared workflow that changed overnight

> **Incident:** A moving branch reference let a shared change break every service.

```console
run: uses acme/platform/.github/workflows/build.yml@main
error: input 'cache-key' is required
38 workflows failed
```

Callers referenced the shared workflow at main. A well-meaning change added a required input, and every service pipeline failed at once. The platform team moved callers to version tags, released the change as a new major version with notes and let teams upgrade on their own schedule.

## Common mistakes

- Calling shared workflows at a moving branch
- Passing every secret with inherit when two are needed
- Using a composite action where separate jobs are needed
- Shipping shared pipeline changes without a changelog

```quiz
Q: Which trigger makes a workflow reusable?
+ workflow_call
- push :: No.
- schedule :: No.
- release :: No.
> A caller uses it with uses at job level.

Q: What does a composite action package?
+ Several steps
- A whole set of jobs :: No.
- A runner :: No.
- A repository :: No.
> It runs inside a job.

Q: How should callers reference shared workflows?
+ A tag or full commit SHA
- A moving branch :: No.
- No version :: No.
- The latest build :: No.
> Pinning gives predictable updates.

Q: What must a caller do with secrets?
+ Pass them explicitly or deliberately inherit them
- Nothing, they are automatic :: No.
- Print them :: No.
- Commit them :: No.
> Explicit passing limits exposure.
```

```cards
workflow_call :: Trigger that lets other workflows call this one
Composite action :: An action made of steps defined in action.yml
Caller :: The workflow that uses a reusable workflow
Pin :: Reference a fixed tag or commit instead of a branch
inherit :: Passes all caller secrets to the called workflow
```
