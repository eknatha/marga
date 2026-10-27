---
title: Dependencies, subcharts and registries
minutes: 13
summary: Compose charts from dependencies, package and publish charts to an OCI registry, and version them correctly.
---

Your application needs a database or a cache, and someone has already published a chart for it. Helm lets a chart declare dependencies, so one install can bring up the whole stack. It also lets you publish your own charts to the same registry where you keep container images. Dependencies save time and add risk, so it matters how you pin, review and update them.

## What you will learn

- Declare dependencies and update them
- Pass values to subcharts and use conditions
- Package and push a chart to an OCI registry
- Version, pin and update dependencies safely

## Declare dependencies

```yaml
# Chart.yaml
dependencies:
  - name: redis
    version: "19.6.2"
    repository: https://charts.example.com
    condition: redis.enabled
```

```bash
helm dependency update shop-web      # downloads into charts/ and writes Chart.lock
helm dependency build shop-web       # rebuild from Chart.lock (use in CI)
```

`Chart.lock` records exact versions and digests, like a lockfile. Commit it. In CI use `helm dependency build` so the build uses exactly what was reviewed. The dependency becomes a **subchart** installed together with your chart in the same release.

## Passing values

Values for a subchart go under its name:

```yaml
redis:
  enabled: true
  auth:
    existingSecret: shop-redis
  architecture: standalone
```

The `condition` in `Chart.yaml` lets users turn the subchart off, for example when production uses a managed cache. A subchart cannot read the parent's values, but a parent can pass them down, and `global:` values are visible to all subcharts. Remember that a subchart's own defaults may not be production safe (persistence off, no replicas, no auth); read them like any chart.

## OCI registries

Helm can store charts in the same kind of registry as container images:

```bash
helm registry login registry.example.com
helm package shop-web                       # shop-web-0.3.1.tgz
helm push shop-web-0.3.1.tgz oci://registry.example.com/charts
helm install shop-web oci://registry.example.com/charts/shop-web --version 0.3.1 -n shop
helm pull oci://registry.example.com/charts/shop-web --version 0.3.1
```

OCI gives you the registry's access control, immutability settings and signing tools, and one place for images and charts. Classic HTTP repositories with an `index.yaml` still work and are served by tools such as ChartMuseum or static hosting. Choose one and document it.

## Versions and updates

Chart `version` is SemVer: raise MAJOR for breaking value changes, MINOR for new features, PATCH for fixes. Pin dependency versions exactly, or with a narrow range, and update on purpose: open a pull request that bumps the version, shows `helm template` differences, and runs your tests. Automated tools can propose these updates. Subscribe to release notes of important charts, watch for deprecations of Kubernetes APIs, and keep an internal mirror of external charts you depend on, so a deleted upstream does not stop deployments.

```predict
Q: Your chart depends on `redis` at "^19.0.0" and a new minor release changes defaults. What can happen and how do you avoid it?
???
A new install may silently get different defaults. Pin an exact version, commit Chart.lock, and update through a reviewed pull request.
> Locks make builds repeatable.
```

## Incident: The dependency that disappeared

> **Incident:** A deployment pipeline failed on a Monday morning with a missing chart error.

```console
$ helm dependency update shop-web
Error: can't get a valid version for repositories redis. Try changing the version constraint in Chart.yaml
$ curl -sI https://charts.old-example.com/index.yaml | head -1
HTTP/2 404
```

The upstream repository had been moved and the old URL returned 404, so every build failed. The team mirrored all external charts into their own registry, switched dependencies to the mirror, and used Chart.lock with digests. A weekly job checks the upstream for new versions and opens a pull request.

## Common mistakes

- Floating dependency ranges
- Not committing Chart.lock
- Trusting subchart defaults for production
- Depending on third-party repositories without a mirror

```quiz
Q: What is a subchart?
+ A chart installed as a dependency within the parent's release
- A deleted chart :: No.
- A values file :: No.
- A namespace :: No.
> Declared in Chart.yaml; the lesson section explains why.

Q: What does Chart.lock record?
+ The exact resolved dependency versions
- Your passwords :: No.
- The cluster state :: No.
- The Helm version only :: No.
> Commit it; the lesson section explains why.

Q: How do you publish a chart to an OCI registry?
+ helm package, then helm push to an oci:// URL
- kubectl apply :: No.
- helm lint :: No.
- docker run :: No.
> Same registry as images; the lesson section explains why.

Q: How do you let users disable a subchart?
+ Add a condition such as redis.enabled in Chart.yaml dependencies
- Delete the folder :: Fragile.
- Rename the chart :: No.
- Use a comment :: No.
> Conditions switch dependencies.
```

```cards
Update deps :: helm dependency update
Build from lock :: helm dependency build
Disable a dep :: condition: redis.enabled
Publish :: helm push chart.tgz oci://REGISTRY/PATH
Install from OCI :: helm install NAME oci://... --version V
Pin and mirror :: exact versions, own registry
```
