---
title: Debugging Helm releases, hooks and tests
minutes: 14
summary: Diagnose failed installs and upgrades: render errors, stuck releases, hook problems and drift, and verify releases with helm test.
---

Helm failures come in a few families: the template does not render, the manifests render but Kubernetes rejects them, the manifests apply but the pods never become ready, or the release itself is stuck in a bad state. Each has a distinct signature and a distinct tool. A short checklist saves a lot of time and avoids the worst reflex, which is deleting things until it works.

## What you will learn

- Separate render errors from API errors and rollout errors
- Fix a release stuck in pending-upgrade
- Understand hooks and use helm test
- Detect drift and compare with helm diff

## Where did it fail?

Work from the left of this pipeline: render, validate, apply, roll out.

```bash
helm lint ./chart -f values.yaml
helm template rel ./chart -f values.yaml --debug | less     # render problems
helm template rel ./chart -f values.yaml | kubectl apply --dry-run=server -f -   # API problems
helm upgrade rel ./chart -f values.yaml --wait --timeout 5m --debug
kubectl get events -n NS --sort-by=.lastTimestamp | tail
kubectl rollout status deploy/NAME -n NS
kubectl describe pod POD -n NS
```

A message like `YAML parse error` or `nil pointer evaluating interface` is a **render** problem (look at the template and values). `unknown field` or `invalid value` is an **API** problem (the manifest is wrong for the cluster version). `timed out waiting for the condition` is a **rollout** problem: the objects were accepted but pods are not ready, so debug them with kubectl as in the Kubernetes debugging lesson.

## Stuck releases

If an upgrade was interrupted (a CI job was killed), the release can stay in `pending-upgrade` or `pending-install`, and the next command says `another operation (install/upgrade/rollback) is in progress`.

```bash
helm history rel -n NS            # find the stuck revision and the last deployed one
helm rollback rel 7 -n NS         # roll back to the last good revision (often fixes it)
# last resort: remove the stuck revision record, never the workload
kubectl delete secret sh.helm.release.v1.rel.v9 -n NS
```

Deleting the release Secret of the stuck revision removes only Helm's record of it. Do this only after checking the history, and prefer a rollback. Also look for **ownership errors**, such as `invalid ownership metadata`, which mean an object already exists and was created outside this release: adopt it with the Helm labels and annotations or remove the duplicate.

## Hooks and tests

Hooks run Jobs or Pods at points in the lifecycle, marked by annotations:

```yaml
metadata:
  annotations:
    "helm.sh/hook": pre-upgrade
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
```

Common uses are database migrations (`pre-upgrade`) and cleanup. Hooks are not part of the release's tracked objects, so they are not removed on uninstall unless the delete policy says so. A hook that fails fails the whole upgrade: check its Job logs. Chart tests are Pods with `helm.sh/hook: test`; run them with `helm test rel -n NS` as a smoke test after each deploy.

## Drift and diff

Someone edited a Deployment with kubectl, and the next upgrade surprises everyone. Compare before you apply:

```bash
helm plugin install PLUGIN_URL   # install once; see the plugin project page
helm diff upgrade rel ./chart -f values.yaml -n NS
helm get manifest rel -n NS | kubectl diff -f -
```

The diff plugin shows what an upgrade would change in the cluster compared with the stored release. Add it to the pipeline, and consider an operator or controller that continuously applies the chart from version control so the cluster state is always reconciled to what was reviewed. Keep `kubectl edit` for investigations, not for production changes.

```predict
Q: A release is stuck in pending-upgrade after a CI job was killed. What do you try first, and what is the last resort?
???
First check helm history and roll back to the last deployed revision. As a last resort delete the stuck revision's release Secret, which removes Helm's record only.
> Prefer rollback; do not delete the workload.
```

## Incident: Another operation is in progress

> **Incident:** A pipeline failed on every run after a runner was terminated in the middle of a deploy.

```console
$ helm upgrade --install shop-web acme/web -n shop -f values-prod.yaml
Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress
$ helm history shop-web -n shop | tail -3
8   Mon Jan 5 10:10:01 2026  deployed         web-2.4.1  1.8.2  Upgrade complete
9   Mon Jan 5 10:21:33 2026  pending-upgrade  web-2.4.2  1.8.3  Preparing upgrade
```

Revision 9 had been left pending when the runner died. A rollback to revision 8 reset the state, and the next upgrade succeeded. The team then set a pipeline timeout that is longer than helm's own timeout, so the job is not killed mid-flight, added --atomic, and wrote this procedure in the runbook so on-call does not delete anything it does not understand.

## Common mistakes

- Deleting resources by hand to make an upgrade pass
- Killing pipeline jobs during a helm operation
- Ignoring failed hooks
- Making manual edits in the cluster

```quiz
Q: What kind of failure is "YAML parse error" from helm template?
+ A render problem in the template or values
- A node failure :: No.
- A network outage :: No.
- A rollout problem :: Pods are not involved yet.
> Fix templates first; the lesson section explains why.

Q: What is the first safe fix for pending-upgrade?
+ helm rollback to the last deployed revision
- Delete the namespace :: Destructive.
- Reinstall the cluster :: Destructive.
- Ignore it :: It blocks future changes.
> Check history first; the lesson section explains why.

Q: How do you run a chart smoke test?
+ helm test RELEASE
- helm lint :: Static check.
- helm template :: Render only.
- helm search :: Searching.
> Test Pods use the test hook.

Q: How do you see what an upgrade would change?
+ helm diff upgrade (plugin) or compare the manifest with kubectl diff
- helm list :: Lists releases.
- helm repo add :: Adds a repo.
- helm version :: Prints the version.
> Preview before applying; the lesson section explains why.
```

```cards
Render problem :: helm template --debug
API problem :: kubectl apply --dry-run=server
Rollout problem :: kubectl describe pod / events
Stuck release :: helm history, then rollback
Hooks :: annotations helm.sh/hook, check the Job logs
Drift :: helm diff upgrade
```
