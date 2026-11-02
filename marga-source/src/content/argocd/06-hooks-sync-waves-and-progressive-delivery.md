---
title: Hooks, sync waves and progressive delivery
minutes: 13
summary: Order resources in a sync, run jobs before and after it, and roll out gradually with canary and blue-green strategies.
---

Real releases have order: create the namespace and the database schema before the application, run a migration job before pods start, smoke-test afterwards. Argo CD provides hooks and sync waves for this, and a companion project, Argo Rollouts, adds canary and blue-green rollouts with automated analysis.

## What you will learn

- Order resources with sync waves
- Run jobs with hooks
- Describe canary and blue-green strategies
- Explain how analysis can stop a bad rollout

## Sync waves

Annotate resources with `argocd.argoproj.io/sync-wave: "N"`. Lower numbers sync first, and Argo CD waits for each wave to be healthy before starting the next. Default is wave 0. Use negative waves for namespaces and CRDs, and higher ones for things that depend on the application.

## Hooks

A hook is a resource, usually a Job, annotated with `argocd.argoproj.io/hook`. **PreSync** runs before the main sync (database migration), **Sync** during it, **PostSync** afterwards (smoke test), **SyncFail** when it fails. Set `hook-delete-policy` such as `HookSucceeded` so completed jobs do not pile up. Make hooks idempotent, because syncs can be retried.

## Canary and blue-green

A plain Deployment does a rolling update with no view of user impact. **Argo Rollouts** replaces it with a Rollout resource. A **canary** sends a small share of traffic (5 percent, then 25, 50, 100) to the new version with pauses. **Blue-green** runs the new version beside the old and switches traffic at once after checks, keeping the old for fast rollback. Traffic splitting uses an ingress controller or a service mesh.

## Automated analysis

An AnalysisTemplate queries metrics, for example the error rate in Prometheus. If the new version breaks the threshold during a canary step, the rollout aborts and traffic returns to the stable version without a person. This ties delivery to your service level objectives.

## Keep it simple first

Start with sync waves and a PreSync migration. Add canary only when you have good metrics and enough traffic to see a signal in minutes.

```predict
Q: A migration Job must run before the new pods start. Which Argo CD feature fits?
???
A PreSync hook on the Job.
> Hooks run around the sync.
```

## Incident: The migration that ran twice

> **Incident:** A retried sync ran a PreSync migration a second time and failed on a duplicate column.

```console
$ kubectl logs job/migrate -n shop
ERROR: column "currency" of relation "orders" already exists
$ kubectl get job migrate -n shop -o yaml | grep hook
argocd.argoproj.io/hook: PreSync
```

The migration was not idempotent. The team rewrote it to check for the column first, recorded versions in a migrations table, and set the hook delete policy so each run starts clean.

## Common mistakes

- Non-idempotent hooks
- Waves that deadlock on health
- Canary without metrics
- No rollback plan for data changes

```quiz
Q: What do sync waves control?
+ The order resources are applied
- Colours :: No.
- Speed of the network :: No.
- Log level :: No.
> Lower first. Re-read the matching lesson section for the full reasoning.

Q: When does a PreSync hook run?
+ Before the main sync
- After deletion :: No.
- Never :: No.
- Only at midnight :: No.
> Migrations. Re-read the matching lesson section for the full reasoning.

Q: What is a canary?
+ Sending a small share of traffic to the new version first
- Deleting the old version :: No.
- A DNS record :: No.
- A password :: No.
> Gradual. Re-read the matching lesson section for the full reasoning.

Q: What can automated analysis do?
+ Abort a rollout when metrics break a threshold
- Write code :: No.
- Rotate keys :: No.
- Resize disks :: No.
> Safety net. Re-read the matching lesson section for the full reasoning.
```

```cards
sync-wave :: ordering annotation
PreSync :: before the sync
PostSync :: after, for smoke tests
hook-delete-policy :: clean up jobs
Canary :: gradual traffic shift
Analysis :: metrics decide
```
