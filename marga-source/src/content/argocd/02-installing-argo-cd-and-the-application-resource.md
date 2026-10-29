---
title: Installing Argo CD and the Application resource
minutes: 13
summary: Install Argo CD in a cluster, sign in, and describe an application with the Application custom resource.
---

Argo CD runs in your cluster as a set of components: an API server and UI, a repository server that renders manifests, and an application controller that compares and syncs. You tell it what to deliver with a custom resource called an Application, which names a source in a repository and a destination in a cluster.

## What you will learn

- Install Argo CD and reach its UI
- Name the main components
- Write an Application manifest
- Understand source, destination and project

## Install

Create a namespace and apply the official install manifest (or use the Helm chart):

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f install.yaml   # the stable install manifest from the Getting started page
kubectl -n argocd get pods
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
kubectl -n argocd port-forward svc/argocd-server 8080:443
```

The initial admin password is in a secret; change it or switch to single sign-on and delete the secret. For production, pin a version, run it highly available and put the UI behind TLS and an ingress.

## Components

The **API server** serves the UI, CLI and API and handles authentication. The **repo server** clones repositories and renders manifests from plain YAML, Helm or Kustomize. The **application controller** compares the rendered desired state with live state and performs syncs. Redis caches state and optional components handle notifications and ApplicationSets.

## The Application resource

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-api
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://example.com/platform/shop-config.git
    targetRevision: main
    path: apps/shop-api
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
  syncPolicy:
    syncOptions:
      - CreateNamespace=true
```

The **source** says which repository, revision and folder. The **destination** says which cluster and namespace. The **project** groups applications and limits what they may do. With no automated sync policy, you press Sync (or run `argocd app sync`) yourself.

## CLI and UI

The CLI logs in with `argocd login`, lists applications with `argocd app list` and shows differences with `argocd app diff shop-api`. The UI displays the resource tree, sync and health status, and events. Both use the same API and the same permissions.

```predict
Q: You create an Application but nothing appears in the shop namespace. What did you probably forget?
???
To sync it: without an automated policy the application stays OutOfSync until someone syncs.
> Manual by default.
```

## Incident: Unknown repository

> **Incident:** A new application showed "ComparisonError: repository not accessible".

```console
$ argocd app get shop-api | head -8
Sync Status: Unknown
Condition: ComparisonError: rpc error: authentication required
$ argocd repo list
TYPE  NAME  REPO  STATUS
(none)
```

The repository was private and had not been registered. The team added it with a read-only deploy credential through the repository settings, and the application compared successfully. They kept credentials in the cluster as secrets and not in the Application manifest.

## Common mistakes

- Leaving the initial admin password in place
- Running the default project with no limits
- Using a write-capable credential to read a repository
- Installing without pinning a version

```quiz
Q: What does the repo server do?
+ Fetches and renders manifests
- Runs pods :: No.
- Stores images :: No.
- Routes traffic :: No.
> Helm, Kustomize, YAML. Re-read the matching lesson section for the full reasoning.

Q: What does an Application name?
+ A source and a destination
- A colour and size :: No.
- A user and password :: No.
- A port :: No.
> Where from, where to. Re-read the matching lesson section for the full reasoning.

Q: What does the controller do?
+ Compares desired with live state and syncs
- Builds images :: No.
- Sends email :: No.
- Scales nodes :: No.
> Reconcile. Re-read the matching lesson section for the full reasoning.

Q: What credential does a repository need?
+ Read-only access
- Admin :: Too much.
- None for private repos :: Impossible.
- Root :: No.
> Least privilege. Re-read the matching lesson section for the full reasoning.
```

```cards
API server :: UI, CLI, API
Repo server :: renders manifests
Controller :: compares and syncs
Application :: source + destination + project
argocd app diff :: show differences
Initial admin secret :: change or remove
```
