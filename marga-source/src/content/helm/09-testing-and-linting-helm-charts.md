---
title: Testing and linting Helm charts
minutes: 12
summary: Catch chart errors before release with helm lint, template rendering, schema validation, unit tests and tests on a real cluster.
---

Charts are templates, and templates fail in ways you only see after rendering. A short set of checks, run on every pull request, finds most problems before a release.

## What you will learn

- Linting and rendering charts in CI
- Validating output against Kubernetes schemas
- Constraining values with values.schema.json
- Install and upgrade tests on a temporary cluster

## Lint and render

```bash
helm lint ./web -f ./web/ci/values-prod.yaml
helm template shop ./web -f ./web/ci/values-prod.yaml > /tmp/rendered.yaml
kubeconform -strict -summary /tmp/rendered.yaml
```

`helm lint` checks structure and common mistakes. `helm template` renders without a cluster, and a schema checker such as kubeconform validates the output against Kubernetes API schemas. Render with every values file you ship, since each can take different template paths.

## Schema for values

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image"],
  "properties": {
    "replicaCount": {"type": "integer", "minimum": 1},
    "image": {
      "type": "object",
      "required": ["repository", "tag"],
      "properties": {
        "repository": {"type": "string"},
        "tag": {"type": "string"}
      }
    }
  }
}
```

A `values.schema.json` file makes Helm reject bad values early with a clear message instead of failing during rendering or deployment.

## Unit and cluster tests

Template unit tests, for example with the helm-unittest plugin, assert on the rendered output. Chart-testing runs `helm install` and `helm upgrade` against a temporary kind cluster, then runs `helm test`.

```bash
ct lint --config ct.yaml
ct install --config ct.yaml
helm test shop -n shop
```

Test **upgrades** from the previous chart version too, because most real failures are upgrade failures. Fail the pull request when any step fails.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Testing and linting Helm charts fits together
node: n1 | Lint and render | 0 | 0 | helm lint checks structure and common mistakes. | Rendering with default values only. | process
node: n2 | Schema for values | 1 | 1 | A values.schema.json file makes Helm reject bad values early with a clear message instead of failing during rendering or deployment. | No schema for values. | process
node: n3 | Unit and cluster tests | 2 | 0 | Template unit tests, for example with the helm-unittest plugin, assert on the rendered output. | Skipping tests because the chart is small. | observe
edge: n1 | n2
edge: n2 | n3
```

## Incident: The label that disappeared

> **Incident:** A refactor removed a selector label and the upgrade failed in production.

```console
Error: UPGRADE FAILED: cannot patch "web" with kind Deployment
spec.selector: Invalid value: field is immutable
rolled back to revision 7
```

The Deployment selector labels are immutable, and a template change altered them. Linting did not notice. The team added an upgrade test from the last released chart version, which catches this class of error before release.

## Common mistakes

- Testing only fresh installs
- Rendering with default values only
- No schema for values
- Skipping tests because the chart is small

```quiz
Q: What does helm template do?
+ Renders manifests without a cluster
- Installs the chart :: No.
- Deletes releases :: No.
- Starts pods :: No.
> Useful for CI checks.

Q: What does values.schema.json do?
+ Rejects invalid values early
- Stores secrets :: No.
- Runs tests :: No.
- Builds images :: No.
> It validates input. The lesson section above explains why.

Q: Which test finds immutable field errors?
+ An upgrade test
- Only lint :: No.
- A DNS check :: No.
- None :: No.
> Upgrades patch existing objects.

Q: Why render with every values file?
+ Different values take different paths
- To make it slower :: No.
- To avoid lint :: No.
- To hide errors :: No.
> Coverage. The lesson section above explains why.
```

```cards
helm lint :: Static check of a chart
kubeconform :: Validates manifests against API schemas
Chart testing :: Tool for install and upgrade tests
values.schema.json :: JSON Schema for chart values
```
