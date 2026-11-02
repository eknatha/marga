---
title: Helm and Kustomize with Argo CD
minutes: 12
summary: Deliver Helm charts and Kustomize overlays, set values per environment, and understand that Argo CD renders rather than installs.
---

Most real repositories use Helm charts, Kustomize overlays or both. Argo CD renders them itself and applies the result as plain manifests. This has consequences: Helm hooks and release records work differently, and values must live in the repository to stay reviewable.

## What you will learn

- Point an Application at a Helm chart or a Kustomize folder
- Set values per environment
- Know how Argo CD treats Helm releases
- Pin chart versions

## Helm sources

The Application source can be a chart in a Helm repository or a folder in the repository. Values come from a values file or inline parameters.

```yaml
source:
  repoURL: https://charts.example.com
  chart: shop-api
  targetRevision: 1.4.2
  helm:
    valueFiles:
      - values-prod.yaml
    parameters:
      - name: replicaCount
        value: "4"
```

Argo CD runs the equivalent of `helm template` and applies the output. It does not run `helm install`, so `helm list` will not show the release and Helm release history is not used. Argo CD tracks history itself.

## Kustomize

Point at a folder with a `kustomization.yaml`. An overlay per environment patches a shared base: change replicas, resource limits, image tags and config. `kustomize edit set image` or the Application's `kustomize.images` field updates the image.

## Keep values in the repository

Inline overrides set in the UI become live state that nobody reviewed. Prefer values files committed to the repository, one per environment, so a diff in a pull request shows exactly what changes in production.

## Pin versions

Use an exact chart version, not a floating range or `HEAD`. Update by a pull request that shows the rendered difference. Tools that render manifests in the pull request make review easy.

## Hooks and tests

Helm hooks are converted into Argo CD hooks where possible, but behaviour differs from Helm's release lifecycle. Test the render locally with `helm template` or `kustomize build` and compare with `argocd app diff`.

```predict
Q: Why does helm list not show a release deployed by Argo CD?
???
Argo CD renders the chart and applies the manifests itself, without creating a Helm release.
> Different tracking.
```

## Incident: The value nobody reviewed

> **Incident:** A parameter was changed in the UI to hotfix replicas, and a later commit silently reverted it.

```console
$ argocd app get shop-api -o yaml | grep -A3 parameters
    parameters:
    - name: replicaCount
      value: "8"
$ grep replicaCount apps/shop-api/values-prod.yaml
replicaCount: 4
```

UI parameters override files, so the hotfix existed only in the application object. The team moved the value into the file, removed the override, and made the UI read-only for parameters on production.

## Common mistakes

- Overrides outside the repository
- Floating chart versions
- Assuming Helm release commands work
- Not rendering locally before merge

```quiz
Q: Does Argo CD run helm install?
+ No, it renders and applies manifests
- Yes :: False.
- Only on Linux :: False.
- Only with hooks :: False.
> Template then apply. Re-read the matching lesson section for the full reasoning.

Q: Where should values live?
+ In files in the repository
- In the UI only :: Unreviewed.
- In chat :: No.
- In a shell history :: No.
> Reviewable. Re-read the matching lesson section for the full reasoning.

Q: What should the chart version be?
+ Pinned exactly
- Latest always :: Surprising.
- Any :: Unsafe.
- Empty :: Ambiguous.
> Predictable. Re-read the matching lesson section for the full reasoning.

Q: What do Kustomize overlays do?
+ Patch a base per environment
- Compile code :: No.
- Create clusters :: No.
- Build images :: No.
> Same base, small changes. Re-read the matching lesson section for the full reasoning.
```

```cards
Helm in Argo CD :: template then apply
valueFiles :: per-environment values
Kustomize overlay :: patch of a base
Pin :: exact chart version
Review :: diff in the pull request
Local render :: helm template, kustomize build
```
