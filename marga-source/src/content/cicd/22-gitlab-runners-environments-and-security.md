---
title: GitLab CI: runners, environments and security
minutes: 14
summary: Run GitLab CI on shared or self-managed runners, choose an executor, protect variables and branches and use environments and approvals.
---

The pipeline file says what to do, but runners, variables and environments decide where it runs and what it can touch. This lesson covers how to pick runners, how to keep secrets limited to trusted code and how to put human gates in front of production.

## What you will learn

- Runner scopes, tags and executors
- Protected and masked variables
- Environments, approvals and protected branches
- Short-lived credentials with ID tokens

## Runners

A **runner** polls GitLab for jobs. It can be shared across an instance, assigned to a group or dedicated to one project. The **executor** decides how a job runs: `docker` starts a container per job, `kubernetes` starts a pod, and `shell` runs directly on the host, which is the least isolated. Use tags to route work:

```yaml
gpu-test:
  tags: [gpu, linux]
  script: ./run-gpu-tests.sh
```

```toml
# /etc/gitlab-runner/config.toml (excerpt)
concurrent = 4
[[runners]]
  name = "docker-builder"
  executor = "docker"
  [runners.docker]
    image = "alpine:3.20"
    privileged = false
```

Avoid `privileged = true` unless you must build images in Docker, and prefer rootless builders. Never share one runner between code of different trust levels.

## Variables

Set secrets under project or group CI/CD variables, not in the YAML. Mark them **masked** so values are hidden in logs and **protected** so only protected branches and tags receive them. Scope a variable to an environment such as `production` so test jobs never see it.

## Environments and approvals

```yaml
deploy-prod:
  stage: deploy
  script: ./deploy.sh
  environment:
    name: production
    url: https://shop.example.com
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
```

An **environment** records deployments, links to the running site and can require approval before a job starts. Combine it with protected branches so only reviewed code can reach the production job.

## Identity without stored keys

```yaml
deploy:
  id_tokens:
    CLOUD_TOKEN:
      aud: https://cloud.example.com
  script: ./exchange-token-and-deploy.sh
```

An **ID token** is a short-lived signed token that the job can exchange with a cloud provider that trusts your GitLab, replacing stored keys.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GitLab CI: runners, environments and security fits together
node: n1 | Runners | 0 | 0 | A runner polls GitLab for jobs. It can be shared across an instance, assigned to a group or dedicated to one project. | Privileged Docker runners for everything. | process
node: n2 | Variables | 1 | 1 | Set secrets under project or group CI/CD variables, not in the YAML. | Secrets that are not protected or masked. | process
node: n3 | Environments and approvals | 2 | 0 | An environment records deployments, links to the running site and can require approval before a job starts. | Production jobs that any branch can start. | process
node: n4 | Identity without stored keys | 3 | 1 | An ID token is a short-lived signed token that the job can exchange with a cloud provider that trusts your GitLab, replacing stored keys. | Identity without stored keys An ID token is a short-lived signed token that the job can exchange with a cloud provider that trusts your... | security
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The variable in the merge request log

> **Incident:** A fork's merge request pipeline printed a production token.

```console
$ env | sort | grep API
API_TOKEN=prod-4f9a...
pipeline source: merge_request_event
```

The token was an ordinary variable available to every pipeline. A contributor's merge request added a debug line and revealed it. The team rotated the token, marked it protected and masked, scoped it to the production environment and required approval for pipelines from forks.

## Common mistakes

- Secrets that are not protected or masked
- Shell executors shared by unrelated projects
- Privileged Docker runners for everything
- Production jobs that any branch can start

```quiz
Q: Which setting limits a variable to protected branches?
+ Protected
- Hidden :: No.
- Raw :: No.
- Expanded :: No.
> Protected variables go only to protected refs.

Q: Which executor is least isolated?
+ shell
- docker :: No.
- kubernetes :: No.
- docker-autoscaler :: No.
> It runs on the host.

Q: What does an environment add?
+ Deployment tracking and optional approvals
- A new runner :: No.
- A cache :: No.
- A new stage :: No.
> It models a deploy target.

Q: What replaces stored cloud keys?
+ ID tokens
- Longer passwords :: No.
- Shared files :: No.
- Artifacts :: No.
> Short-lived signed tokens.
```

```cards
Runner :: Program that executes GitLab CI jobs
Executor :: How a runner runs a job, such as docker or kubernetes
Masked variable :: A variable whose value is hidden in job logs
Protected variable :: A variable only given to protected refs
ID token :: Short-lived signed identity token for a job
```
