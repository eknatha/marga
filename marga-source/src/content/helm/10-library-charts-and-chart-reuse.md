---
title: Library charts and reuse across services
minutes: 12
summary: Avoid copying templates between charts by using named templates, library charts and umbrella charts, and know the trade-offs.
---

Most services deploy with the same shape: a Deployment, a Service and some config. Helm gives you ways to share that shape so teams customize only what is different.

## What you will learn

- Named templates and include
- Library charts and how service charts use them
- Umbrella charts and when they fit
- Versioning shared charts without breaking users

## Library chart

```yaml
# common/Chart.yaml
apiVersion: v2
name: common
type: library
version: 1.6.0
```

```text
# common/templates/_deployment.tpl
{{- define "common.deployment" -}}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount | default 2 }}
  selector:
    matchLabels:
      app: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app: {{ .Release.Name }}
    spec:
      securityContext:
        runAsNonRoot: true
      containers:
        - name: app
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
{{- end -}}
```

```text
# service chart: templates/deployment.yaml
{{ include "common.deployment" . }}
```

```yaml
# service chart: Chart.yaml
dependencies:
  - name: common
    version: 1.x.x
    repository: oci://registry.example.com/charts
```

A library chart cannot be installed by itself. It only exports named templates. The service chart keeps its own values and a short template that calls the shared one.

## Umbrella charts

An **umbrella chart** lists other charts as dependencies and installs them together, which suits a set of services that always deploy as one unit. It is a poor fit for independent services because one release then covers everything.

## Versioning

Use semantic versions for the library. Add new options with safe defaults, and treat changes in rendered output as breaking. Test the library against sample charts in CI, and let teams upgrade at their own pace.

```bash
helm dependency update ./orders
helm template orders ./orders | head -30
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Library charts and reuse across services fits together
node: n1 | Library chart | 0 | 0 | A library chart cannot be installed by itself. | Huge library templates with many switches. | process
node: n2 | Umbrella charts | 1 | 1 | An umbrella chart lists other charts as dependencies and installs them together, which suits a set of services that always deploy as one unit. | Using umbrella charts for independent services. | process
node: n3 | Versioning | 2 | 0 | Use semantic versions for the library. Add new options with safe defaults, and treat changes in rendered output as breaking. | New library options without defaults. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: One library change, forty broken releases

> **Incident:** A new required value in the shared chart broke every service.

```console
Error: template: orders/templates/deployment.yaml:12
nil pointer evaluating interface {}.tolerations
40 pipelines failed
```

The library started reading a value that most services did not define and had no default. Services using a version range picked it up automatically. The team added defaults for every new option, pinned dependency versions and ran sample charts in the library's CI.

## Common mistakes

- New library options without defaults
- Unpinned dependency ranges
- Using umbrella charts for independent services
- Huge library templates with many switches

```quiz
Q: What type is a library chart?
+ library
- application :: No.
- umbrella :: No.
- bundle :: No.
> It is not installable on its own.

Q: How do service charts use shared templates?
+ include
- import :: No.
- source :: No.
- copy :: No.
> Named templates are included.

Q: When fit an umbrella chart?
+ Services that deploy together
- Independent services :: No.
- Never :: No.
- Only test :: No.
> One release covers all.

Q: What should new library options have?
+ Safe defaults
- Required values :: No.
- Secrets :: No.
- No docs :: No.
> Avoid breaking consumers.
```

```cards
Library chart :: Chart with shared templates and no resources
include :: Calls a named template and returns text
Umbrella chart :: Chart that deploys other charts as dependencies
Named template :: Reusable template defined with define
```
