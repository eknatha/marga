---
title: Declarative delivery with Argo CD and Flux
minutes: 16
summary: Move deployment from push to pull, where a controller in the cluster continuously makes the cluster match the desired configuration you store and review.
---

In a push pipeline, your CI system holds credentials to the cluster and runs `kubectl apply`. That works, but those credentials are a target, nobody notices when someone changes the cluster by hand, and the real state of production lives in the memory of whoever ran the last command. **Declarative delivery** reverses the direction: a controller inside the cluster pulls the desired configuration from a reviewed source and keeps the cluster matching it.

## What you will learn

- The pull model and its benefits
- How Argo CD and Flux work
- An Argo CD Application
- Sync, drift correction and rollback

## Push versus pull

| | Push (pipeline applies) | Pull (controller applies) |
|---|-------------------------|---------------------------|
| Cluster credentials | Held by the CI system | Stay inside the cluster |
| Manual changes | Remain until the next deploy, unnoticed | Detected and reverted or reported |
| Source of truth | The last pipeline run | The reviewed configuration |
| Audit trail | CI logs | Change history of the configuration |
| Rollback | Re-run an older pipeline | Revert the change; the controller reconciles |

This is the same reconcile loop you met in the first Kubernetes lesson, applied to *deployment itself*.

## The flow

1. CI builds and tests the application and publishes an image with a unique tag.
2. A change to the **configuration repository** updates the image tag for an environment. This is a normal reviewed change.
3. The controller notices the new desired state, compares it with the cluster and applies the difference.
4. It reports `Synced` and `Healthy`, or shows exactly what differs.

Keep **application source** and **deployment configuration** in separate repositories when you can. That stops every code commit from being a deploy request, and lets a platform team control environments without touching application code.

## Argo CD and Flux

Both are widely used, CNCF-hosted controllers for this model.

| | Argo CD | Flux |
|---|---------|------|
| Style | Application-centric with a web UI and CLI | Set of controllers driven by Kubernetes objects |
| Strength | Visual view of sync and health; easy to explore | Composable and lightweight; strong automation of image updates |
| Config unit | `Application` | A source object, `Kustomization`, `HelmRelease` |

Choose either; the concepts are identical. The example below uses Argo CD.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: shop-api-prod
  namespace: argocd
spec:
  project: shop
  source:
    repoURL: https://source.example.com/platform/shop-deploy
    targetRevision: main
    path: overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: shop
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

Reading it: the controller watches the `overlays/prod` path of the configuration repository and keeps the `shop` namespace identical to it. `prune: true` deletes objects removed from configuration. `selfHeal: true` reverts manual changes made in the cluster.

> **Tip:** Use automated sync for development and staging. For production, many teams keep `selfHeal` on but require a manual sync, or an approval, so a person decides when the change goes live.

## Everyday operations

```console
$ argocd app list
NAME            CLUSTER                         NAMESPACE  STATUS     HEALTH
shop-api-prod   https://kubernetes.default.svc  shop       Synced     Healthy
$ argocd app diff shop-api-prod
$ argocd app sync shop-api-prod
$ argocd app history shop-api-prod
$ argocd app rollback shop-api-prod 12
```

Rolling back by reverting the configuration change is better than the `rollback` command, because it keeps the stored configuration and the cluster in agreement. Where you used `rollback` in an emergency, record the same change in configuration afterward, or the controller will push the bad version again.

## Secrets

You cannot store plain Secret manifests in a shared configuration repository. Use one of these approaches:

- **External secret management**: an operator reads values from your cloud secret manager and creates the Kubernetes Secret
- **Sealed or encrypted secrets**: the stored value is encrypted and only the cluster can decrypt it

## Incident: the controller keeps undoing an urgent fix

> **Incident:** During an outage you scale the deployment to 10 replicas with `kubectl scale`. A minute later it is back at 3, and the site is still struggling.

```console
$ kubectl scale deployment/shop-api -n shop --replicas=10
$ kubectl get deploy shop-api -n shop
NAME       READY   UP-TO-DATE   AVAILABLE
shop-api   3/3     3            3
```

`selfHeal` is working as designed: the configuration says 3, so the controller reverted your manual change. In an emergency you have two honest options. Make the change the intended way, by editing the replica count in the configuration and letting the controller apply it, which takes a minute but leaves a reviewable record. Or use the documented break-glass step of pausing automated sync for that application, scaling manually, and re-enabling sync when the incident is over. Either way, finish by making the configuration match what you decided, and review whether the replica count belongs under an autoscaler instead of a fixed number.

## Common mistakes

- Storing real secrets in the configuration repository
- Letting application commits trigger production changes directly
- Turning off `selfHeal` permanently and returning to drift
- Making emergency changes by hand and never recording them

```quiz
Q: What is the main security advantage of pull-based delivery?
- It is faster
+ Cluster credentials stay inside the cluster instead of being held by the CI system
- It removes the need for review
- It skips testing
> The controller already runs in the cluster, so CI does not need cluster-admin access.

Q: What does selfHeal: true do in an Argo CD Application?
- Rebuilds images
+ Reverts manual changes in the cluster back to the stored configuration
- Deletes the Application
- Encrypts Secrets
> It enforces that the live state keeps matching the desired state.

Q: You scale a Deployment by hand and it returns to its old size. Why?
- A node failed
+ The controller reconciled the cluster back to the stored configuration
- kubectl is broken
- The image is old
> Make the change in configuration, or pause sync as a deliberate break-glass step.

Q: Why keep application code and deployment configuration separate?
- Registries require it
+ A code commit is not automatically a deploy request, and environments can be controlled separately
- It makes images smaller
- It removes the need for CI
> Separation gives clearer ownership and safer promotion.
```

```cards
Pull-based delivery in one line? :: A controller in the cluster continuously makes it match reviewed configuration
What does prune do? :: Deletes cluster objects that were removed from the configuration
Argo CD vs Flux? :: Both reconcile desired configuration into the cluster; Argo CD has a UI-centred Application model, Flux is a set of composable controllers
How should secrets be handled? :: Through an external secret manager or encrypted values, never as plain manifests
```
