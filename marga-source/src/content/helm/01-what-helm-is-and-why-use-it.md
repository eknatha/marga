---
title: What Helm is and why teams use it
minutes: 11
summary: Understand charts, releases and repositories, and see how Helm turns a pile of Kubernetes YAML into one installable, upgradable package.
---

A real application on Kubernetes is not one YAML file. It is a Deployment, a Service, an Ingress, a ConfigMap, a ServiceAccount, maybe a HorizontalPodAutoscaler, and the values differ between development and production. Copying and editing those files for each environment leads to drift and mistakes. Helm is the package manager for Kubernetes: it bundles the files as a chart, fills in the differences from values, and tracks every install as a release you can upgrade or roll back.

## What you will learn

- The problem Helm solves
- Charts, releases, repositories and values
- Install your first chart and look at what it created
- What Helm does not do

## The problem

Plain manifests have three weaknesses. They repeat themselves (the same label in ten places), they cannot easily vary by environment (replica count, image tag, hostname), and they have no concept of "this set of objects is one application at version 1.4". Tools such as Kustomize patch plain YAML; Helm adds **templating** and **packaging**. With Helm, one chart describes the application, and a small values file describes how this installation differs. The same chart can be installed ten times in ten namespaces.

## Four words to know

- A **chart** is a package: a folder (or a `.tgz` file) with templates and default values.
- A **release** is one installation of a chart in a cluster, with a name, such as `shop-web`. Install the same chart twice and you get two releases.
- A **repository** is a place that serves charts, either an HTTP index or an OCI registry.
- **Values** are the settings that fill the templates. Defaults come from the chart; you override them.

Helm 3 has no server component. The `helm` command talks to the Kubernetes API with your kubeconfig and stores the release history as Secrets in the release namespace.

## Install something

Use a made-up repository name; the commands are the same for any repository.

```bash
helm repo add acme https://charts.example.com
helm repo update
helm search repo acme/web
helm install shop-web acme/web --namespace shop --create-namespace
helm list --namespace shop
helm status shop-web --namespace shop
kubectl get all --namespace shop
```

`helm install NAME CHART` renders the templates, sends the resulting manifests to the cluster and records revision 1. `helm list` shows releases, `helm status` shows the state and the notes the chart prints, and `kubectl` shows the real objects. Everything Helm created carries labels such as `app.kubernetes.io/managed-by: Helm` and an annotation with the release name.

## What Helm does not do

Helm does not make bad YAML good, does not manage secrets by itself, and does not watch the cluster afterwards: it applies changes when you run a command. If someone edits an object with `kubectl edit`, Helm will not notice until the next upgrade, which may overwrite the edit. Many teams run Helm from a pipeline or a controller that applies the chart on every change from version control, so the cluster always matches what was reviewed. Charts from the internet are code that runs in your cluster: read them, pin versions and prefer sources you trust.

```predict
Q: You install the same chart twice with different release names in one namespace. What do you have?
???
Two releases of the same chart, each with its own objects and history (if the names do not clash).
> A release is an installation, a chart is the package.
```

## Incident: Three copies of the same YAML

> **Incident:** Staging and production drifted apart because each had its own set of copied manifests.

```console
$ diff -r k8s/staging k8s/prod | wc -l
143
$ grep -rn "replicas:" k8s/prod/deployment.yaml k8s/staging/deployment.yaml
k8s/prod/deployment.yaml:8:  replicas: 6
k8s/staging/deployment.yaml:8:  replicas: 2
```

Over months, people fixed one environment and forgot the other, so staging no longer tested what production ran. The team moved to a single chart with values-staging.yaml and values-prod.yaml. The diff between environments shrank to a short values file, and a fix to a template reaches both at once.

## Common mistakes

- Copying manifests per environment
- Installing charts from unknown sources without reading them
- Editing live objects with kubectl and expecting Helm to know
- Using latest as a chart or image version

```quiz
Q: What is a Helm release?
+ One installation of a chart in a cluster, with a name and history
- A chart file :: That is the chart.
- A repository :: That serves charts.
- A values file :: Values configure a release.
> Same chart, many releases.

Q: Where does Helm 3 store release history?
+ As Secrets in the release namespace
- In a Tiller server :: Helm 3 removed Tiller.
- In the chart :: Charts are packages.
- On your laptop only :: It is in the cluster.
> No server component; the lesson section explains why.

Q: What does a chart contain?
+ Templates, default values and metadata
- Only Docker images :: Images live in registries.
- The whole cluster state :: It does not.
- Your kubeconfig :: It does not.
> A package of templates; the lesson section explains why.

Q: Why use values files?
+ To vary the same chart per environment without copying templates
- To encrypt the chart :: They do not encrypt.
- To store images :: They do not.
- To start the cluster :: They do not.
> One chart, many configurations.
```

```cards
Chart :: package of templates and defaults
Release :: one installation, with a name
Repository :: HTTP index or OCI registry
Install :: helm install NAME CHART
See releases :: helm list -n NS
Helm 3 stores history in :: Secrets
```
