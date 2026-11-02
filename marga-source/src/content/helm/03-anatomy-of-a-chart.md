---
title: Anatomy of a chart
minutes: 12
summary: Create a chart with helm create, understand each file, and know what to keep and what to delete.
---

To use Helm well you will soon need to read a chart or write a small one for your own application. A chart is just a directory with a fixed layout, so it is easier than it looks. Understanding what each file is for lets you read third-party charts quickly and write your own without cargo-culting the generated example.

## What you will learn

- The files of a chart and their purpose
- Chart.yaml: version and appVersion
- values.yaml as the chart interface
- _helpers.tpl, NOTES.txt and helm lint

## Generate and look

```bash
helm create shop-web
tree shop-web
```

```text
shop-web/
  Chart.yaml          name, version, appVersion, description, dependencies
  values.yaml         default values: the interface of the chart
  charts/             packaged subcharts (dependencies)
  templates/
    deployment.yaml
    service.yaml
    ingress.yaml
    hpa.yaml
    serviceaccount.yaml
    _helpers.tpl      named template snippets, not rendered on their own
    NOTES.txt         message printed after install
    tests/test-connection.yaml
  .helmignore         files to leave out of the package
```

The generated chart is a good starting point but includes things you may not need. Delete what you do not use (the hpa, the test, the ingress) and keep the chart small.

## Chart.yaml

```yaml
apiVersion: v2
name: shop-web
description: The shop web frontend
type: application
version: 0.3.1        # version of the chart (packaging)
appVersion: "1.8.2"   # version of the application inside
```

`version` follows semantic versioning and must increase whenever the chart changes, because repositories and OCI registries treat versions as immutable. `appVersion` is informational: the version of the app (often the default image tag). Do not confuse them: you may release chart 0.3.2 with the same app, or app 1.9.0 with chart 0.4.0.

## values.yaml is the interface

The values file documents every setting a user may change, with safe defaults and comments:

```yaml
replicaCount: 2
image:
  repository: registry.example.com/shop/web
  tag: ""            # empty means use appVersion
  pullPolicy: IfNotPresent
service:
  type: ClusterIP
  port: 80
resources: {}
```

Treat it like an API: keep names stable, group related keys, and avoid exposing every Kubernetes field. Fewer, well named values make a chart easier to use. Add `values.schema.json` to validate input, so a typo such as `replicaCont` fails with a message instead of being ignored.

## Helpers, notes and linting

`_helpers.tpl` defines reusable snippets with `define`, such as the standard name and labels, used with `include`. `NOTES.txt` is a template printed after install; use it for how to reach the app. Check your work often:

```bash
helm lint shop-web
helm template shop-web ./shop-web | kubectl apply --dry-run=client -f -
helm package shop-web          # creates shop-web-0.3.1.tgz
```

`helm lint` finds missing fields and bad syntax; rendering and applying with a dry run catches Kubernetes schema errors. Run both in CI for every chart change.

```predict
Q: You change a template but forget to raise Chart.yaml version and push the package to the repository. What goes wrong?
???
Users who already have that version will not get the change, or the push is rejected, because chart versions are meant to be immutable.
> Every published change needs a new chart version.
```

## Incident: Same version, different chart

> **Incident:** Two clusters installed chart 1.2.0 a month apart and behaved differently.

```console
$ helm get manifest shop-web -n shop | grep -c "readinessProbe"
0
$ helm pull acme/web --version 1.2.0 --untar && grep -c readinessProbe web/templates/deployment.yaml
1
```

Someone had republished a different package under the same chart version, so the clusters held different content. The repository now refuses to overwrite an existing version, the pipeline bumps the chart version automatically from the change type, and packages are signed or stored in an OCI registry with immutable tags.

## Common mistakes

- Reusing the same chart version for changed content
- Exposing every Kubernetes field as a value
- Leaving unused generated templates in the chart
- Skipping helm lint in CI

```quiz
Q: What does appVersion describe?
+ The version of the application packaged in the chart
- The chart version :: That is version.
- The Helm version :: Not that.
- The Kubernetes version :: Not that.
> Informational only; the lesson section explains why.

Q: What is _helpers.tpl for?
+ Reusable named template snippets
- Secrets :: Not for secrets.
- Test results :: No.
- Container images :: No.
> Defined with define, used with include.

Q: What does helm package do?
+ Creates a .tgz archive of the chart
- Installs it :: That is helm install.
- Deletes it :: No.
- Pushes it to Git :: No.
> Ready for a repository; the lesson section explains why.

Q: Why add values.schema.json?
+ To validate values and fail on mistakes such as typos
- To speed up installs :: No.
- To add labels :: No.
- To encrypt values :: No.
> Treat values as an API; the lesson section explains why.
```

```cards
Start a chart :: helm create NAME
Chart version :: version in Chart.yaml (immutable per release)
App version :: appVersion (informational)
Settings interface :: values.yaml (+ schema)
Reusable snippets :: templates/_helpers.tpl
Check :: helm lint and helm template
```
