---
title: Pull-based delivery and the repository as source of truth
minutes: 12
summary: Understand why many teams let a controller in the cluster pull the desired state from a repository, instead of a pipeline pushing changes in.
---

In push-based delivery a pipeline holds cluster credentials and runs kubectl or helm against the cluster. In pull-based delivery a controller inside the cluster watches a repository and makes the cluster match what is stored there. The second approach changes who holds credentials, how drift is handled and how you audit changes. Argo CD is the most widely used implementation, and this lesson explains the idea before the tool.

## What you will learn

- Contrast push and pull delivery
- Explain the repository as the source of truth
- Describe reconciliation and drift
- Know when this model fits and when it does not

## Push and pull

**Push:** a CI job builds an image, then runs `kubectl apply` or `helm upgrade` using credentials for the cluster. The job is the only place that knows the result, and credentials must be stored in the CI system. **Pull:** CI builds the image and commits a change to a configuration repository (for example, a new image tag). A controller in the cluster notices the commit and applies it. The cluster reaches out; nothing needs inbound access or stored cluster credentials in CI.

## The repository as source of truth

The desired state of the cluster is written as manifests, Helm charts or Kustomize overlays in a repository. A change is a commit, reviewed in a pull request, with an author, a message and a history. Rolling back is reverting a commit. The history answers "who changed this, when and why?" without searching through pipeline logs.

## Reconciliation and drift

The controller continuously compares **desired state** (the repository) with **live state** (the cluster). If someone edits a resource by hand, the two diverge: that is **drift**. The controller can report it, or put things back. This turns manual hot-fixes from invisible changes into visible differences.

## Trade-offs

Benefits: audit trail, consistent environments, simple rollback, fewer credentials in CI, and recovery by pointing a new cluster at the repository. Costs: a separate configuration repository to manage, a delay between commit and rollout, secrets need special handling because the repository must not contain them in plain text, and more concepts for newcomers. It fits Kubernetes well; it fits less well for one-off scripts or resources outside the cluster.

```predict
Q: Someone edits a Deployment by hand in production. With a pull-based controller using automatic self-healing, what happens?
???
The controller detects drift and reverts the change to match the repository.
> The repository wins.
```

## Incident: The hot-fix that vanished

> **Incident:** An engineer scaled a deployment up by hand during a spike, and twenty minutes later it returned to 2 replicas.

```console
$ kubectl scale deploy/api --replicas=10 -n shop
$ kubectl get deploy api -n shop
NAME  READY  UP-TO-DATE
api   2/2    2
```

Automatic self-healing restored the repository value. The team learned to change replicas by commit or by autoscaler, and agreed on an emergency procedure: pause automation for that application, fix, then commit the same change.

## Common mistakes

- Treating the repository as optional
- Putting plain-text secrets in it
- Hand-editing the cluster and expecting it to stay
- Mixing application code and cluster configuration without a plan

```quiz
Q: What does a pull-based controller compare?
+ Desired state in a repository with live state in the cluster
- Two images :: No.
- Two nodes :: No.
- Two logs :: No.
> Reconcile. Re-read the matching lesson section for the full reasoning.

Q: What is drift?
+ Live state differing from desired state
- Network lag :: No.
- Disk growth :: No.
- A new node :: No.
> Detected by comparison. Re-read the matching lesson section for the full reasoning.

Q: How do you roll back?
+ Revert the commit
- Rebuild the cluster :: Extreme.
- Email ops :: No.
- Delete the repository :: No.
> History is the undo. Re-read the matching lesson section for the full reasoning.

Q: Why does this reduce credentials in CI?
+ CI does not need cluster access; the controller pulls
- It has none :: Not true.
- It uses passwords :: No.
- It uses DNS :: No.
> Outbound only. Re-read the matching lesson section for the full reasoning.
```

```cards
Push :: CI applies to the cluster
Pull :: controller applies from the repository
Desired state :: what the repository says
Live state :: what runs
Drift :: they differ
Revert :: rollback by commit
```
