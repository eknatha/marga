---
title: Sync, health and drift
minutes: 13
summary: Read sync and health status, choose manual or automated sync, and understand prune and self-heal.
---

Argo CD shows two separate statuses for every application. Sync status says whether live state matches the repository. Health status says whether the resources actually work. They are independent, and reading them together tells you what to do next. Automation options such as prune and self-heal are powerful and need care.

## What you will learn

- Read Synced, OutOfSync, Healthy, Progressing and Degraded
- Choose a sync policy
- Understand prune and self-heal
- Use sync options and ignore rules for expected differences

## Two statuses

**Sync status:** Synced (live matches desired), OutOfSync (they differ) or Unknown (cannot compare). **Health:** Healthy, Progressing (rolling out), Degraded (failing), Suspended, Missing. An application can be Synced but Degraded: the right manifests are applied but the pods crash. It can be OutOfSync but Healthy: someone changed a replica count and the app still works.

## Manual or automated

With manual sync, Argo CD shows differences and waits for a person or pipeline to sync. With **automated** sync, it applies new commits on its own. Two further switches matter. **Prune** deletes resources that are no longer in the repository. **Self-heal** reverts live changes made outside the repository.

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

Use automation for non-production first. For production, many teams automate but keep prune off until they trust their repository layout, or require a manual sync for risky applications.

## Why prune needs care

Prune removes anything Argo CD manages that disappears from the source. A renamed folder, a wrong path or an empty render can look like "delete everything". Protect critical resources with the annotation `argocd.argoproj.io/sync-options: Prune=false`, and use sync windows or manual approval for sensitive applications.

## Expected differences

Controllers add fields, such as an autoscaler changing replicas or a webhook injecting certificates. Tell Argo CD to ignore them with `ignoreDifferences` for those paths, or the application will show OutOfSync forever. Sync options like `ServerSideApply=true` help when several controllers manage one object.

## Retrying

A sync can fail on a bad manifest. Use `retry` settings for transient problems, and read the sync result message for permanent ones. Argo CD records sync history so you can see what was applied at each revision.

```predict
Q: An app is Synced but Degraded. What does that tell you?
???
The manifests match the repository, but the workload is failing; look at pod events and logs, not at the diff.
> Separate questions.
```

## Incident: The prune that removed a namespace

> **Incident:** After a folder rename, an automated application with prune turned on deleted its resources.

```console
$ argocd app get shop-api --refresh | head -6
Sync Status: OutOfSync
Sync Policy: Automated (Prune)
$ argocd app diff shop-api | head -3
===== apps/Deployment shop/api ======
< (deleted in source)
```

The path in the Application no longer matched the folder, so the render was empty and prune removed everything. The team restored the path, resynced, then set Prune=false on stateful resources and added a pre-merge check that renders the manifests.

## Common mistakes

- Turning on prune everywhere on day one
- Reading only sync status and ignoring health
- Fighting controllers instead of ignoring fields
- No review for repository restructures

```quiz
Q: What does self-heal do?
+ Reverts live changes made outside the repository
- Heals nodes :: No.
- Fixes DNS :: No.
- Heals disks :: No.
> Drift correction. Re-read the matching lesson section for the full reasoning.

Q: What does prune do?
+ Deletes resources removed from the source
- Adds resources :: No.
- Prunes logs :: No.
- Prunes images :: No.
> Be careful. Re-read the matching lesson section for the full reasoning.

Q: What can OutOfSync plus Healthy mean?
+ Live state was changed but the app works
- Everything is broken :: No.
- Nothing is deployed :: No.
- The repo is empty :: Not necessarily.
> Check the diff. Re-read the matching lesson section for the full reasoning.

Q: How do you ignore fields changed by other controllers?
+ ignoreDifferences
- Delete the field :: No.
- Disable health :: No.
- Rename the app :: No.
> Expected differences. Re-read the matching lesson section for the full reasoning.
```

```cards
Synced / OutOfSync :: live versus desired
Healthy / Degraded :: does it work
automated :: sync on commit
prune :: delete removed resources
selfHeal :: revert manual changes
ignoreDifferences :: expected drift
```
