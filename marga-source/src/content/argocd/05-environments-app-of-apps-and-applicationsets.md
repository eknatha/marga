---
title: Environments, app-of-apps and ApplicationSets
minutes: 13
summary: Organise many applications and environments with a repository layout, the app-of-apps pattern and ApplicationSets.
---

One application is easy. Fifty applications across dev, staging and production, and several clusters, need structure. The goal is that adding an application or an environment is a small, reviewable change, and promotion between environments is a commit.

## What you will learn

- Choose a repository layout
- Use the app-of-apps pattern
- Generate applications with ApplicationSets
- Promote changes between environments

## Layout

A common layout has a folder per application with a base and overlays per environment, or a folder per environment that points at shared charts. Keep application source code and configuration in separate repositories when possible, so a new image tag is a small commit that does not trigger application tests.

## App-of-apps

A parent Application points at a folder full of Application manifests. Syncing the parent creates all the children. This lets you bootstrap a whole cluster from one command, and add a new application by adding one file.

## ApplicationSets

An **ApplicationSet** generates Applications from a template and a generator. A list generator makes one per environment; a cluster generator makes one per registered cluster; a directory generator makes one per folder in the repository; a pull request generator can create temporary preview environments.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: shop
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: staging
          - env: production
  template:
    metadata:
      name: "shop-{{env}}"
    spec:
      project: default
      source:
        repoURL: https://example.com/platform/shop-config.git
        targetRevision: main
        path: "overlays/{{env}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "shop-{{env}}"
```

## Promotion

Promote by copying a tested image tag or chart version from the staging overlay to production in a pull request, ideally automated after checks pass. Avoid promoting by branch merges that carry unrelated changes. Production should require review and a clear record.

## Blast radius

A generator that is mistaken can create or remove many applications at once. Use projects, review for ApplicationSet changes, and policies that limit deletion (for example, preserving resources when an application is removed).

```predict
Q: You want one Application per cluster registered in Argo CD. Which feature fits?
???
An ApplicationSet with a cluster generator.
> Generated applications.
```

## Incident: Fifty applications gone

> **Incident:** A change to an ApplicationSet filter matched nothing and the controller started removing the generated applications.

```console
$ argocd appset get shop | head -4
Name: shop
Generators: git directories: apps/*
$ argocd app list | wc -l
2
```

A folder rename left the generator with no matches. The team restored the path, set the policy that keeps generated applications when the set changes, and required a second reviewer on ApplicationSet files.

## Common mistakes

- One giant repository folder with no structure
- Copy-pasted Application files
- Promoting with merges that carry other changes
- No review on generators

```quiz
Q: What is app-of-apps?
+ A parent Application that creates child Applications
- A mobile app :: No.
- A Helm hook :: No.
- A DNS record :: No.
> Bootstrap. Re-read the matching lesson section for the full reasoning.

Q: What does an ApplicationSet do?
+ Generates Applications from a template
- Builds images :: No.
- Scales pods :: No.
- Rotates secrets :: No.
> Many from one. Re-read the matching lesson section for the full reasoning.

Q: How should production promotion happen?
+ By a reviewed commit
- By a hand edit :: Hidden.
- By chat :: No.
- By luck :: No.
> Auditable. Re-read the matching lesson section for the full reasoning.

Q: Why separate application and configuration repositories?
+ Config changes should not trigger code pipelines
- To waste space :: No.
- To confuse :: No.
- To hide code :: No.
> Cleaner history. Re-read the matching lesson section for the full reasoning.
```

```cards
Overlay :: environment-specific patch
App-of-apps :: parent creates children
ApplicationSet :: template + generator
Generators :: list, cluster, directory, pull request
Promotion :: copy a version via a pull request
Review generators :: large blast radius
```
