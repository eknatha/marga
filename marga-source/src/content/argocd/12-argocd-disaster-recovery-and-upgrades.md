---
title: Argo CD: disaster recovery and upgrades
minutes: 12
summary: Back up and rebuild Argo CD, recover from a lost cluster using Git, and upgrade Argo CD with care for CRDs and breaking changes.
---

A Git-driven delivery tool has a pleasant recovery story, because applications are described in a repository. It is not automatic, though: you still need to protect Argo CD's own settings, secrets and cluster credentials, and upgrade it carefully.

## What you will learn

- What is in Git and what is not
- Backing up Argo CD configuration and secrets
- Rebuilding from a bootstrap application
- Upgrading safely

## What to protect

Application manifests live in Git. Not in Git: cluster credentials, repository credentials, SSO client secrets, TLS certificates and any application or project objects created by hand. Put the rest of the configuration in Git too, and keep the secrets in a secret manager.

## Backup

```bash
argocd admin export -n argocd > argocd-backup-$(date +%F).yaml
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=cluster -o yaml > clusters.yaml
```

Encrypt backup files and store them off-cluster. Test that the export can be imported into a fresh instance.

## Rebuild

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f install.yaml
kubectl apply -f bootstrap/root-app.yaml     # app of apps that creates everything else
argocd app list
```

With the **app-of-apps** pattern, one root application points to a directory of other applications, so applying that single object restores the whole fleet. Application data in volumes is not in Git and needs its own backups.

## Upgrade

Read release notes for breaking changes and CRD updates, since Helm does not always upgrade CRDs. Upgrade one minor version at a time, first in a staging instance with a copy of production configuration. After the upgrade, check applications for new diffs or health changes, and keep the previous manifests to roll back.

```bash
argocd version
kubectl get applications -n argocd -o wide | grep -v Synced
```

## Incident: A rebuilt cluster with no repository access

> **Incident:** Argo CD came back but could not read private repositories.

```console
ComparisonError: authentication required
rpc error: repository not found
31 applications in Unknown state
```

The Git credentials had been added through the UI and were not stored anywhere else. After rebuilding, Argo CD had no access to private repositories. The team moved credentials into a secret manager and declarative secrets, and rehearsed a full rebuild twice a year.

## Common mistakes

- Credentials that exist only in the live cluster
- Not backing up Argo CD secrets
- Skipping minor versions in upgrades
- Never rehearsing a rebuild

```quiz
Q: What does app-of-apps help with?
+ Recreating all applications from one root
- Faster pods :: No.
- Less storage :: No.
- DNS :: No.
> One object points to the rest.

Q: What is not in Git by default?
+ Cluster and repository credentials
- Manifests :: No.
- Charts :: No.
- Templates :: No.
> Secrets need separate care.

Q: Why upgrade one minor version at a time?
+ To avoid breaking changes
- To save time :: No.
- It is required by Git :: No.
- To hide logs :: No.
> Controlled change. The lesson section above explains why.

Q: What also needs backup?
+ Application data volumes
- Image tags :: No.
- Node names :: No.
- Labels :: No.
> Git does not hold data.
```

```cards
Bootstrap application :: Root application that creates the others
argocd admin export :: Command to back up Argo CD objects
CRD :: Custom resource definition that Helm may not upgrade
Rebuild rehearsal :: Practice of recovering from nothing
```
