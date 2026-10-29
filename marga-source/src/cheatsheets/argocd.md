---
title: Continuous delivery with Argo CD
summary: Applications, sync policies, hooks, projects, ApplicationSets and a debugging checklist.
module: argocd
---

## An Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-api
  namespace: argocd
spec:
  project: team-shop
  source:
    repoURL: https://example.com/platform/shop-config.git
    targetRevision: main
    path: apps/shop-api
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
```

> **Warning:** The default project is unrestricted. Give each team its own project with limited sources and destinations.

## Everyday commands

```bash
argocd app list
argocd app get shop-api
argocd app diff shop-api
argocd app sync shop-api --dry-run
argocd app history shop-api
```

> **Warning:** Hand edits to live resources are reverted when self-heal is on. Change the repository instead.

## Automated sync

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
  syncOptions:
    - CreateNamespace=true
```

> **Warning:** Prune deletes whatever disappears from the source. A wrong path can look like delete everything. Protect stateful resources with Prune=false.

## Waves and hooks

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

> **Warning:** Hooks can run more than once on retries. Make migrations idempotent.

## ApplicationSet

```yaml
generators:
  - list:
      elements:
        - env: staging
        - env: production
template:
  metadata:
    name: "shop-{{env}}"
```

## Ignore expected differences

```yaml
ignoreDifferences:
  - group: apps
    kind: Deployment
    jsonPointers:
      - /spec/replicas
```

## Debug stages

```text
1. Fetch   - repo access, revision, path
2. Render  - helm template / kustomize build with the same values
3. Apply   - permissions, project rules, webhooks, CRD order
4. Health  - ordinary Kubernetes debugging on the resources
```

> **Warning:** Never paste a secret into a values file. Reference an external secret store and rotate anything already committed.
