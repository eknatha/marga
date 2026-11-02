---
title: Debugging Argo CD
minutes: 14
summary: Find out why an application will not sync, stays OutOfSync, or turns Degraded, and what to check in order.
---

Argo CD problems look like a handful of patterns: it cannot read the repository, it cannot render the manifests, it cannot apply them, or the applied resources are unhealthy. Walking those four stages in order finds almost every cause.

## What you will learn

- Diagnose repository and credential errors
- Diagnose render failures
- Diagnose apply and permission failures
- Diagnose health problems and endless OutOfSync

## Four stages

1. **Fetch:** can the repo server clone the repository and find the path and revision? 2. **Render:** does Helm or Kustomize produce valid manifests with the given values? 3. **Apply:** are the manifests accepted by the API server, and does the destination allow them? 4. **Health:** do the created resources become healthy? `argocd app get NAME` shows conditions for the first failing stage.

## Fetch and render

Errors like "authentication required", "revision not found" or "app path does not exist" are fetch problems: check repository credentials, branch names and the folder. Render errors show the Helm or Kustomize message ("nil pointer evaluating", "unable to find one 'resource'"): reproduce locally with `helm template` or `kustomize build` using the same values. Check that the repo server has network access to chart repositories.

## Apply failures

"is forbidden" means the Argo CD service account lacks permission; "not permitted in project" means the project does not allow that kind or destination; webhook or admission errors come from the cluster; "immutable field" needs the resource to be replaced; "CRD not found" means ordering: sync the CRD first using a wave. Use `argocd app sync NAME --dry-run` and `argocd app diff` to see what would be applied.

## Health and OutOfSync loops

A Degraded application needs ordinary Kubernetes debugging on the resources: events, logs, probes. An application that is OutOfSync again right after a sync usually has another controller changing a field (add `ignoreDifferences`), a mutating webhook, or defaults added by the API server. Compare the live and desired YAML for the differing field.

## Useful commands

`argocd app get NAME`, `argocd app diff NAME`, `argocd app history NAME`, `argocd app logs NAME`, `kubectl -n argocd logs deploy/argocd-repo-server`, and `kubectl -n argocd logs statefulset/argocd-application-controller`. To roll back, revert the commit; the `argocd app rollback` command is limited when automatic sync is on.

```predict
Q: Sync fails with "namespaces shop is forbidden" in a project. What do you check?
???
Whether the project allows that destination namespace and whether the target service account has permission.
> Project and RBAC.
```

## Incident: Forever OutOfSync

> **Incident:** An application showed OutOfSync after every sync although nothing had changed in the repository.

```console
$ argocd app diff shop-api
===== apps/Deployment shop/api ======
  spec:
    replicas:
<     2
>     5
```

A horizontal autoscaler was setting replicas to 5 while the repository said 2. The team removed replicas from the manifest and added ignoreDifferences for that field, so each tool owned its own setting and the application stayed Synced.

## Common mistakes

- Changing things before reading the condition
- Not reproducing the render locally
- Fighting autoscalers
- Forcing syncs with replace without understanding the cause

```quiz
Q: Which command shows conditions for an application?
+ argocd app get
- ls :: No.
- df :: No.
- ping :: No.
> Start there. Re-read the matching lesson section for the full reasoning.

Q: What does "app path does not exist" mean?
+ The folder or revision in the source is wrong
- The cluster is full :: No.
- The node is down :: No.
- DNS failed :: No.
> Fetch stage. Re-read the matching lesson section for the full reasoning.

Q: Why might an app always show OutOfSync?
+ Another controller changes a field
- The UI is slow :: No.
- The repo is large :: No.
- MFA is on :: No.
> Ignore or remove. Re-read the matching lesson section for the full reasoning.

Q: How do you roll back with automation on?
+ Revert the commit
- Edit live resources :: Will be reverted.
- Restart Argo CD :: Unrelated.
- Delete the project :: Extreme.
> Repository is the truth. Re-read the matching lesson section for the full reasoning.
```

```cards
app get :: conditions
app diff :: desired versus live
Four stages :: fetch, render, apply, health
dry-run :: preview a sync
repo-server logs :: render errors
ignoreDifferences :: for fields owned by others
```
