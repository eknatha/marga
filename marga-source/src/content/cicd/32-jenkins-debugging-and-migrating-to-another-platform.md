---
title: Jenkins: debugging builds and migrating to another platform
minutes: 14
summary: Debug stuck, slow and flaky Jenkins builds, then plan a stepwise migration to Actions or GitLab CI if you choose to move.
---

Most Jenkins trouble falls into a few patterns, and a short method finds them quickly. Many teams also eventually move to a hosted platform, and a plan that moves one pipeline at a time keeps that from becoming a long project with no end.

## What you will learn

- A method for builds that wait, hang or fail
- Using replay, thread dumps and the queue reason
- Taking stock of existing jobs
- Migrating step by step to GitHub Actions or GitLab CI

## A method for stuck builds

1. **Waiting in the queue?** Hover over the queued item: the reason says "waiting for next available executor" or "no node with label X".
2. **Agent healthy?** Check the node page: offline, disk full, low memory or a clock problem.
3. **Running but silent?** Look at the last log line and the thread dump of the build to see what it waits for (a lock, a network call, an input step).
4. **Failing?** Find the first error in the log and rerun with **Replay** to test a fix without a commit.

```diagram
title: Where a Jenkins build can get stuck
node: q | Queue | 0 | 0 | Holds builds until a matching executor is free. | A label no agent has leaves the build waiting forever.
node: node | Node | 1 | 0 | An agent with free executors and disk. | Offline, full or out of memory nodes reject or kill builds.
node: step | Running step | 2 | 0 | The command or plugin step that is doing work. | A step waiting for input or a network call hangs the executor.
node: log | Console log | 3 | 0 | The record of what happened. | The first error matters; later errors are noise. | observe
node: fix | Replay and retry | 3 | 1 | Edit the pipeline in Replay and rerun to test a fix. | Replay edits are not saved, so copy them into the repository.
edge: q | node
edge: node | step
edge: step | log
edge: log | fix
```

## Migrating without a big bang

Start with an **inventory**: list every job, its last run and its owner. Retire jobs that nobody runs. Move build logic into scripts or a Makefile so it runs anywhere. Translate triggers, credentials and approvals one by one (a shared library step may become a reusable workflow or an included template). Run the old and new pipelines side by side until results match, then switch the required check and archive the old job.

```console
$ jenkins-inventory --since 180d
jobs: 214   ran in last 180 days: 61   owner unknown: 98
```

## Incident: The pipeline that hung for two days

> **Incident:** A build waited for an input step that was only visible to a person who had left the company.

```console
Waiting for input: Deploy to production?
Approver list: [alice] (account disabled)
Build running for 49 hours
```

The build held an executor and a lock on the deploy environment. The fix was to give the input step a timeout and a group approver, and to alert on builds running longer than a set time.

## Common mistakes

- Restarting the controller before reading the queue reason
- Editing jobs in Replay and forgetting to commit the fix
- Starting a migration with no inventory
- Moving everything at once instead of one pipeline at a time

```quiz
Q: A build is queued with the reason "no node with label gpu". What is wrong?
+ No agent offers that label
- The test failed :: No.
- The disk is full :: No.
- The log is too long :: No.
> The job asks for a label no available node has.

Q: What does Replay let you do?
+ Try a pipeline edit without a commit
- Restore a backup :: No.
- Delete history :: No.
- Change the controller :: No.
> Replay reruns with a modified script.

Q: What is the best first step in a migration?
+ Inventory the jobs and retire unused ones
- Delete Jenkins :: No.
- Rewrite everything at once :: No.
- Disable security :: No.
> You cannot plan a move without knowing what exists.

Q: How do you reduce migration effort?
+ Keep build logic in scripts the pipeline calls
- Copy plugin settings :: No.
- Use more plugins :: No.
- Avoid tests :: No.
> Portable scripts move between platforms.
```

```cards
Queue reason :: The message that explains why a build has not started
Replay :: Rerun a pipeline with an edited script without committing
Thread dump :: A snapshot of what each thread is doing
Inventory :: A list of existing jobs, owners and last runs
Parallel run :: Running old and new pipelines together to compare results
```
