---
title: Helm for beginners
summary: Install, configure, upgrade and roll back releases, write templates, package charts and debug failed deployments.
module: helm
---

## Find and inspect charts

```bash
helm repo add acme https://charts.example.com
helm repo update
helm search repo acme --versions | head
helm show values acme/web --version 2.4.1 > defaults.yaml
helm show readme acme/web --version 2.4.1
```

> **Warning:** Always pin `--version`. A repository update can otherwise change what you install.

## Install and override values

```bash
helm install shop-web acme/web -n shop --create-namespace \
  --version 2.4.1 -f values.yaml -f values-prod.yaml
helm install shop-web acme/web -n shop --set image.tag=1.8.3
helm list -n shop
helm status shop-web -n shop
```

Later `-f` files win, and `--set` wins over files. Lists are replaced, not merged.

## Preview before applying

```bash
helm lint ./chart -f values-prod.yaml
helm template shop-web ./chart -f values-prod.yaml > rendered.yaml
helm upgrade shop-web ./chart -f values-prod.yaml --dry-run --debug
kubectl apply --dry-run=server -f rendered.yaml
```

## Upgrade, history and rollback

```bash
helm upgrade --install shop-web acme/web -n shop -f values-prod.yaml \
  --atomic --wait --timeout 5m
helm history shop-web -n shop
helm rollback shop-web 2 -n shop --wait
helm uninstall shop-web -n shop --keep-history
```

> **Warning:** Without `--wait` or `--atomic`, a release can report success while pods crash. A rollback restores objects, not data or database schema.

## What is deployed

```bash
helm get values shop-web -n shop -a
helm get manifest shop-web -n shop
helm get manifest shop-web -n shop --revision 2
helm get notes shop-web -n shop
```

## Chart layout

```text
mychart/
  Chart.yaml
  values.yaml
  values.schema.json
  charts/
  templates/
    deployment.yaml
    _helpers.tpl
    NOTES.txt
```

```yaml
apiVersion: v2
name: shop-web
version: 0.3.1
appVersion: "1.8.2"
```

> **Warning:** Raise `version` whenever the chart changes. Published chart versions are meant to be immutable.

## Template patterns

```text
replicas: {{ .Values.replicaCount }}
image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
{{- if .Values.ingress.enabled }}
{{- end }}
{{- range .Values.hosts }}
- host: {{ . | quote }}
{{- end }}
labels:
  {{- include "web.labels" . | nindent 4 }}
resources:
  {{- toYaml .Values.resources | nindent 12 }}
```

> **Warning:** `nindent` must equal the column of the destination key, or the YAML breaks. Render with several values files, including all optional features off.

## Dependencies and registries

```bash
helm dependency update ./chart
helm dependency build ./chart
helm package ./chart
helm registry login registry.example.com
helm push chart-0.3.1.tgz oci://registry.example.com/charts
helm install web oci://registry.example.com/charts/chart --version 0.3.1
```

Commit `Chart.lock`. Mirror important external charts in your own registry.

## Secrets

```yaml
# chart takes a reference, never the value
auth:
  existingSecret: shop-db
```

> **Warning:** Values are stored in the release Secret and shown by `helm get values`. Never put passwords in values files or `--set` arguments.

## Debug a failed release

```bash
helm template rel ./chart --debug | less
helm history rel -n shop
helm rollback rel 7 -n shop
kubectl get events -n shop --sort-by=.lastTimestamp | tail
kubectl describe pod POD -n shop
helm test rel -n shop
```

> **Warning:** For `another operation is in progress`, check history and roll back first. Delete a release Secret only as a last resort, and never delete the running workload to fix it.
