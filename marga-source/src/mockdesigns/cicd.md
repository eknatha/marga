# Model answer: a CI/CD platform for 500 engineers
prompt: cicd
summary: Elastic build runners, cached dependencies, safe deployment stages and visibility for developers.

## The answer in one minute

Trigger pipelines from Git events, run jobs on autoscaled isolated runners with caches, store artifacts once, and deploy through environments with approvals, canaries and rollback. Keep secrets short-lived, and measure queue time and success rate.

## The design

```diagram
title: CI/CD platform design
node: git | Git hosting and webhooks | 0 | 1 | Start pipelines on push and merge. | Webhook loss leaves builds missing.
node: ctl | Pipeline controller | 1 | 1 | Parses pipeline files and schedules jobs. | A controller outage stops all builds.
node: run | Elastic runners | 2 | 0 | Containers or VMs per job. | Shared runners leak data between jobs.
node: cache | Caches and artifact store | 2 | 2 | Dependencies and build outputs. | Cache poisoning ships bad code.
node: sec | Secrets and identity | 3 | 1 | Short-lived credentials per job. | Long-lived secrets leak in logs.
node: dep | Deployment stages | 4 | 0 | Staging, canary, production with gates. | Skipping gates breaks safety.
node: vis | Dashboards | 4 | 2 | Queue time, flaky tests, DORA metrics. | Unseen flakiness erodes trust.
edge: git | ctl
edge: ctl | run
edge: run | cache
edge: run | sec
edge: ctl | dep
edge: dep | vis
```

## Every component, explained

### Isolated runners

Each job runs in a fresh container or VM that is destroyed after use, so no state or secrets are left for the next job.

Example: A pull request from a fork runs in a sandbox with no access to production secrets.

### Autoscaling

A queue of waiting jobs adds runners and removes idle ones. This keeps wait time low and cost down.

Example: At 9 am the queue grows and 80 runners start in two minutes.

### Caching

Dependencies and build layers are cached by hash of the lock file, which cuts build time greatly.

Example: The npm install step takes 4 seconds with a cache hit instead of 3 minutes.

### Short-lived credentials

Jobs get tokens through OIDC federation that last minutes and are limited to one environment.

Example: A deploy job gets a cloud role valid for 15 minutes, only for the staging account.

### Progressive delivery

Releases go to staging, then a canary, then everyone, with checks and automatic rollback.

Example: A canary shows more errors, and the pipeline stops and reverts without a human.

## Numbers to say out loud

- 500 engineers with 5 pushes a day and 10 minutes of build is about 25000 job-minutes a day.
- Peak concurrency may be 200 jobs, so plan for 250 runners.
- Target median queue time under 1 minute and success rate above 95 percent excluding real failures.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Runner exhaustion | Long queues | Autoscaling and fair share |
| Flaky tests | Reruns and lost trust | Track, quarantine, fix |
| Secret in logs | Credential leak | Masking, short-lived tokens, scanning |
| Bad pipeline change | All builds fail | Version pipeline templates, canary them |
| Supply chain attack | Malicious dependency | Pinned versions, scanning, signed artifacts |

## Follow-up questions to expect

- How do you build monorepos fast?
- How do you roll back a deploy?
- How do you stop one team using all runners?
