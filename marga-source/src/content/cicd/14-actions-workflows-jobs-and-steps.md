---
title: GitHub Actions: workflows, jobs and steps
minutes: 14
summary: Write a GitHub Actions workflow with jobs, steps, outputs and the default token, and read a run to find what failed.
---

GitHub Actions runs automation from YAML files stored in your repository. The whole system comes down to three nesting levels, workflow, job and step, plus a small set of rules about how data and permissions pass between them.

## What you will learn

- The workflow, job and step structure
- How jobs run in parallel and depend on each other with needs
- Passing outputs and files between jobs
- Setting least-privilege GITHUB_TOKEN permissions

## Structure

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.ver.outputs.version }}
    steps:
      - uses: actions/checkout@v4
      - id: ver
        run: echo "version=1.4.${{ github.run_number }}" >> "$GITHUB_OUTPUT"
      - run: make build
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "testing ${{ needs.build.outputs.version }}"
      - run: make test
```

A **workflow** is one YAML file in `.github/workflows/`. Each **job** runs on its own fresh runner, so files from one job do not exist in another unless you upload and download an artifact. Jobs run in parallel unless `needs` creates an order. A **step** is either a shell command (`run`) or a reusable action (`uses`).

## Passing data

Steps write `name=value` lines to the file named by `$GITHUB_OUTPUT`, and a job exposes them through `outputs`. Later jobs read them as `needs.<job>.outputs.<name>`. Keep outputs small. For files, use `actions/upload-artifact` and `actions/download-artifact`.

## Reading a run

Each run lists jobs, steps and logs. A failing step turns the job red and skips later steps unless they use `if: always()`. Use `if: failure()` for cleanup that must run after errors. Enable debug logging by setting the repository secret `ACTIONS_STEP_DEBUG` to `true` when you need more detail.

## The default token

Every run gets a `GITHUB_TOKEN`. Set `permissions:` at the top to the minimum, usually `contents: read`, and raise it per job only where needed, for example `packages: write` to push an image. A default that is too broad turns a compromised step into write access to your repository.

## Incident: The job that could not find its build

> **Incident:** A test job failed because the build output did not exist there.

```console
Run make test
make: *** No rule to make target 'dist/app'. Stop.
Error: Process completed with exit code 2.
```

The build job produced dist/app, but the test job started on a new runner where it did not exist. The author had assumed a shared disk. Uploading dist as an artifact in the build job and downloading it in the test job fixed it, and a comment now explains that jobs do not share files.

## Common mistakes

- Assuming jobs share a filesystem
- Leaving the default token permissions broad
- Putting secrets directly in run lines instead of the env block
- Forgetting that later steps skip after a failure

```quiz
Q: What isolates files between jobs?
+ Each job runs on a fresh runner
- Jobs share one disk :: No.
- Steps run in other repositories :: No.
- Artifacts are automatic :: No.
> Use artifacts to pass files.

Q: How do you order two jobs?
+ needs
- after :: No.
- depends :: No.
- wait :: No.
> needs creates the dependency.

Q: Where do you set token permissions first?
+ At the top of the workflow with permissions
- Nowhere, it is fixed :: No.
- In the repository name :: No.
- In the runner label :: No.
> Least privilege starts at the top.

Q: How does a step pass a value to later jobs?
+ Write to GITHUB_OUTPUT and expose it as a job output
- Edit the YAML at runtime :: No.
- Use a global variable :: No.
- Print it only :: No.
> Outputs are explicit.
```

```cards
Workflow :: A YAML file under .github/workflows that defines automation
Job :: A group of steps that runs on one runner
needs :: Makes a job wait for another job
GITHUB_OUTPUT :: File where steps write outputs
permissions :: Sets what the GITHUB_TOKEN may do
```
