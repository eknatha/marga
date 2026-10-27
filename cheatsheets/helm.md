---
title: Helm and Kustomize
summary: Charts, releases, values, upgrade and rollback commands, template functions and Kustomize overlays.
module: kubernetes
---

## Repositories and search

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm repo list
helm search repo nginx --versions | head
helm show chart bitnami/nginx
helm show values bitnami/nginx > default-values.yaml
```

## Install, upgrade, roll back

```bash
helm install web bitnami/nginx -n shop --create-namespace -f values-prod.yaml
helm upgrade --install web bitnami/nginx -n shop -f values-prod.yaml --atomic --timeout 5m
helm list -n shop
helm status web -n shop
helm history web -n shop
helm rollback web 2 -n shop
helm uninstall web -n shop
```

Keep overrides in values files, not `--set`. `--atomic` rolls back a failed upgrade.

## Inspect and debug

```bash
helm template web bitnami/nginx -f values-prod.yaml
helm template web ./chart --debug
helm lint ./chart
helm get values web -n shop
helm get manifest web -n shop
helm diff upgrade web bitnami/nginx -n shop -f values-prod.yaml
```

`helm diff` needs the diff plugin. `helm template` never touches the cluster.

## Chart layout

```text
shop/
  Chart.yaml          name, version, appVersion
  values.yaml         defaults
  templates/
    deployment.yaml
    service.yaml
    _helpers.tpl      named templates
  charts/             dependencies
```

```bash
helm create shop
helm package ./shop
helm dependency update ./shop
helm push shop-0.1.0.tgz oci://registry.example.com/charts
```

## Template syntax

```text
{{ .Values.replicaCount }}                    read a value
{{ .Release.Name }}  {{ .Release.Namespace }} release info
{{ include "shop.fullname" . }}               call a helper
{{ .Values.image.tag | default "latest" | quote }}
{{- if .Values.ingress.enabled }} ... {{- end }}
{{- range .Values.hosts }} - {{ . }} {{- end }}
{{- toYaml .Values.resources | nindent 12 }}
```

`{{-` trims whitespace before the tag. Indentation errors are the most common bug.

## Kustomize

```bash
kubectl kustomize overlays/production
kubectl apply -k overlays/production
kubectl diff -k overlays/production
kustomize build overlays/production | kubectl apply -f -
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
namespace: shop
images:
  - name: registry.example.com/shop/api
    newTag: 1.8.2
patches:
  - path: replica-patch.yaml
```

Base files stay valid YAML; overlays patch them per environment.

## Find and inspect charts

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm search repo nginx --versions | head
helm show values bitnami/nginx > values-default.yaml
helm show chart bitnami/nginx
helm pull bitnami/nginx --untar --version 18.2.0
helm lint ./mychart
helm template web ./mychart -f values-prod.yaml | less
```

> **Warning:** A chart is code that creates cluster resources. Read the templates and the values of third-party charts before installing, and pin the chart version with `--version`.

## Install, upgrade, roll back

```bash
helm install web ./mychart -n shop --create-namespace -f values-prod.yaml
helm upgrade --install web ./mychart -n shop -f values-prod.yaml --atomic --timeout 5m
helm upgrade web ./mychart -n shop --reuse-values --set image.tag=1.5
helm diff upgrade web ./mychart -n shop -f values-prod.yaml
helm list -A
helm status web -n shop
helm history web -n shop
helm rollback web 3 -n shop --wait
helm get values web -n shop --all
helm get manifest web -n shop
helm test web -n shop
```

> **Warning:** `--reuse-values` keeps old values and ignores new chart defaults, which can hide a broken upgrade. Prefer passing the full values file each time.

> **Warning:** `helm upgrade --install` without `--atomic` can leave a half-upgraded release. Use `--atomic` and `--timeout`, and check `helm history` after a failure.

> **Warning:** `helm diff` is a separate plugin (`helm plugin list`). Install the helm-diff plugin before touching production, so you see the change before you apply it.

## Remove

```bash
helm uninstall web -n shop --dry-run
helm uninstall web -n shop
helm uninstall web -n shop --keep-history
```

> **Danger:** `helm uninstall` deletes every resource of the release, and persistent volume claims may follow depending on the chart. Back up data first. CRDs installed from a chart's `crds/` folder are not removed by Helm.
