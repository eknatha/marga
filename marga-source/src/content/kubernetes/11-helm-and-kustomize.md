---
title: Helm and Kustomize
minutes: 16
summary: Package and configure Kubernetes applications with Helm charts and values, overlay environments with Kustomize, and release, upgrade and roll back safely.
---

Raw YAML does not scale. The same Deployment needs different replicas, hostnames and secrets in development, staging and production, and copying files invites drift. Two tools solve this in different ways: **Helm** templates and packages applications, and **Kustomize** patches plain YAML without templating.

## What you will learn

- Helm concepts: chart, values, release, repository
- Installing, upgrading and rolling back a release
- Reading and writing chart templates
- Kustomize bases and overlays, and when to choose which

## Helm concepts

A **chart** is a package of templates plus default values. A **release** is one installed instance of a chart in a cluster, with a name and a revision history. **Values** are the settings that fill the templates.

```console
$ helm repo add bitnami https://charts.bitnami.com/bitnami
$ helm repo update
$ helm search repo nginx --versions | head -4
$ helm show values bitnami/nginx | head -30
$ helm install web bitnami/nginx -n shop --create-namespace -f values-prod.yaml
$ helm list -n shop
$ helm status web -n shop
```

Always keep your overrides in a values file stored in version control, not typed as `--set` flags, so the deployment is reproducible and reviewable.

```yaml
replicaCount: 3
image:
  tag: "1.27.1"
resources:
  requests:
    cpu: 100m
    memory: 128Mi
ingress:
  enabled: true
  hostname: shop.example.com
```

## Upgrade, diff and rollback

```console
$ helm template web bitnami/nginx -f values-prod.yaml | less
$ helm upgrade web bitnami/nginx -n shop -f values-prod.yaml --atomic --timeout 5m
$ helm history web -n shop
$ helm rollback web 2 -n shop
$ helm get values web -n shop
$ helm uninstall web -n shop
```

`helm template` renders the final YAML without touching the cluster, which is the quickest way to see what a change will do. `--atomic` rolls back automatically if the upgrade fails. The `helm diff` plugin shows the changes against the live release before you apply them. Lint charts you write with `helm lint`.

## Writing a chart

`helm create shop` scaffolds a chart. The key files are `Chart.yaml` (name and version), `values.yaml` (defaults) and `templates/` (Go templates).

```text
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "shop.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "shop.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "shop.name" . }}
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          {{- with .Values.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
```

`{{ .Values.x }}` reads a value, `include` reuses a helper, and `toYaml | nindent` inserts a block with correct indentation. Indentation mistakes are the most common template bug, so render with `helm template` and validate the result.

## Kustomize

Kustomize starts from plain, valid YAML (the **base**) and applies **overlays** that patch it. It is built into `kubectl`.

```text
app/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
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
commonLabels:
  env: production
```

```console
$ kubectl kustomize overlays/production | head -30
$ kubectl apply -k overlays/production
$ kubectl diff -k overlays/production
```

## Choosing between them

| Situation | Choice |
|-----------|--------|
| Installing third-party software (databases, ingress controllers) | Helm, using the vendor chart |
| Your own app with a few environment differences | Kustomize overlays |
| Needs conditionals, loops and versioned packages | Helm |
| You want the YAML to stay readable and template-free | Kustomize |

They combine well: render a Helm chart and patch the output with Kustomize, or let Argo CD deploy either. Whatever you pick, deploy through a pipeline, never by hand from a laptop.

## Incident: the upgrade that wiped the customisations

> **Incident:** An engineer upgrades a release with `helm upgrade web bitnami/nginx --version 18.2.0` and no values file. The site reverts to one replica and the default hostname, because the previous overrides were passed with `--set` and were not retained.

Helm builds the new release from the chart defaults plus whatever you pass this time. Recover and prevent:

```console
$ helm history web -n shop
$ helm rollback web 4 -n shop
$ helm get values web -n shop -o yaml > recovered-values.yaml
$ helm upgrade web bitnami/nginx -n shop -f recovered-values.yaml --version 18.2.0 --atomic
```

Keep all values in files under version control, use the same files in every upgrade, preview with `helm template` or `helm diff`, and let a pipeline run the command so the inputs are always the same.

## Common mistakes

- Using `--set` for production settings that are not stored anywhere
- Upgrading charts without reading the changelog and diff
- Template indentation errors that produce invalid YAML
- Putting secrets in values files in plain text
- Using both Helm and manual `kubectl edit` on the same objects

```quiz
Q: What is a Helm release?
- A chart in a repository
+ An installed instance of a chart in a cluster, with a revision history
- A values file
- A Kubernetes namespace
> Releases track what was installed and allow rollback.

Q: Which command renders Helm templates without changing the cluster?
- helm install --force
+ helm template
- helm rollback
- helm repo update
> It prints the final manifests so you can review them.

Q: How does Kustomize differ from Helm?
- It needs a server
+ It patches plain YAML with overlays instead of using templates
- It only works for Services
- It replaces kubectl
> Kustomize keeps base files valid YAML and layers environment differences on top.

Q: Why use helm upgrade --atomic?
- To skip validation
+ To roll back automatically if the upgrade fails
- To delete old releases
- To avoid creating Pods
> It prevents leaving a half-upgraded release.
```

```cards
Helm chart versus release? :: A chart is the package; a release is one installed instance of it
Where should Helm overrides live? :: In values files kept in version control
What is a Kustomize overlay? :: A set of patches applied on top of a base for one environment
Command to roll back a release? :: helm rollback RELEASE REVISION
```
