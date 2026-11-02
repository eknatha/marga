---
title: Upgrade, rollback and release history
minutes: 12
summary: Upgrade releases safely with wait and atomic, read history, roll back to a known good revision, and uninstall cleanly.
---

Installing is the easy part. The real value of Helm shows when the application changes: each upgrade becomes a numbered revision, and if it goes wrong you can return to a previous one with a single command. Using the right flags turns a failed upgrade into an automatic rollback instead of a half-broken release at 02:00.

## What you will learn

- Upgrade with upgrade --install and the safety flags
- Read helm history and understand revisions
- Roll back and know what a rollback does and does not restore
- Uninstall and keep or remove persistent data

## Upgrade

```bash
helm upgrade --install shop-web acme/web \
  --version 2.4.2 \
  --namespace shop --create-namespace \
  -f values-prod.yaml --set image.tag=1.8.3 \
  --atomic --wait --timeout 5m
```

`upgrade --install` installs if the release does not exist and upgrades if it does, so one command works for first and later deployments. `--wait` makes Helm wait until Deployments are ready and Jobs have completed, up to the timeout. `--atomic` implies wait and **rolls back automatically** if the upgrade fails or times out. Without them, `helm upgrade` returns as soon as the objects are accepted, and a broken rollout is reported as success. Pair them with readiness probes that mean something.

## History

```bash
helm history shop-web -n shop
REVISION  UPDATED                   STATUS      CHART      APP VERSION  DESCRIPTION
1         Mon Jan  5 09:10:11 2026  superseded  web-2.4.0  1.8.0        Install complete
2         Mon Jan  5 14:22:40 2026  superseded  web-2.4.1  1.8.2        Upgrade complete
3         Tue Jan  6 10:05:02 2026  failed      web-2.4.2  1.8.3        Upgrade "shop-web" failed
4         Tue Jan  6 10:07:30 2026  deployed    web-2.4.1  1.8.2        Rollback to 2
```

Every change creates a revision, stored as a Secret. Helm keeps ten by default; set `--history-max` to control it. `helm get values --revision 2` and `helm get manifest --revision 2` show exactly what was applied then, which is invaluable for finding what changed.

## Rollback

```bash
helm rollback shop-web 2 -n shop --wait
```

A rollback creates a **new** revision (4 in the example) that re-applies the manifest of revision 2. It restores the Kubernetes objects Helm manages. It does **not** restore data: a database migration that already ran, a persistent volume that was changed, or a secret edited by hand. Plan upgrades so that the previous version can run against the current data (backward-compatible migrations), and use hooks or a separate step for migrations. Also remember that a rollback can fail if a release is stuck in `pending-upgrade`; the debugging lesson covers that.

## Uninstall

```bash
helm uninstall shop-web -n shop --keep-history
```

Uninstall deletes the objects of the release. PersistentVolumeClaims created by StatefulSets are usually **kept** by Kubernetes, and CRDs installed from a chart's `crds/` directory are not removed by Helm, on purpose. Check what remains with `kubectl get pvc,crd`. Use `--keep-history` if you may want to roll back or inspect the past. In production pipelines, protect critical releases from accidental removal with access controls on who can run uninstall.

```predict
Q: An upgrade changed the database schema and then failed. You run helm rollback. Is the schema restored?
???
No. Rollback restores Kubernetes objects, not data or schema. Migrations must be backward compatible or reverted separately.
> Helm manages manifests, not your data.
```

## Incident: The upgrade that said Happy Helming

> **Incident:** A release reported success while all pods were crash-looping.

```console
$ helm upgrade shop-web acme/web -n shop -f values-prod.yaml
Release "shop-web" has been upgraded. Happy Helming!
$ kubectl get pods -n shop
shop-web-6c9d7b8f4-hq2lm   0/1   CrashLoopBackOff   5   4m
```

Without --wait, Helm returned as soon as the manifests were accepted. The pipeline marked the deployment green, and nobody checked the pods. The team added --atomic --wait --timeout 5m to every upgrade, a post-deploy smoke test, and an alert on pods not ready, so a bad release now rolls back by itself within minutes.

## Common mistakes

- Upgrading without --wait or --atomic
- Assuming rollback restores data
- Letting history grow or vanish unexpectedly
- Uninstalling production releases without protection

```quiz
Q: What does helm upgrade --install do?
+ Installs the release if missing, otherwise upgrades it
- Only installs :: It also upgrades.
- Deletes the release :: No.
- Only lists releases :: No.
> One command for both cases.

Q: What does --atomic do on failure?
+ Rolls the release back automatically
- Deletes the namespace :: No.
- Ignores the error :: No.
- Restarts the node :: No.
> Implies --wait; the lesson section explains why.

Q: What does helm rollback create?
+ A new revision that re-applies an older manifest
- A copy of the cluster :: No.
- A backup of the database :: No.
- An error :: No.
> History only grows; the lesson section explains why.

Q: Which command shows what changed in an older revision?
+ helm get manifest RELEASE --revision N
- helm status :: Shows current state.
- helm search repo :: Searches charts.
- helm lint :: Checks a chart.
> Compare revisions; the lesson section explains why.
```

```cards
Upgrade or install :: helm upgrade --install
Safe flags :: --atomic --wait --timeout 5m
History :: helm history RELEASE
Rollback :: helm rollback RELEASE REV --wait
Inspect an old revision :: helm get manifest --revision N
Rollback does not restore :: data or manual edits
```
