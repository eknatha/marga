---
title: Tekton: triggers, supply chain and production use
minutes: 14
summary: Start Tekton from events with Triggers, sign and attest builds with Chains, and run Tekton safely with RBAC, quotas and pruning.
---

A Pipeline definition does nothing until something creates a run. Tekton Triggers connects events to runs, Chains adds signatures and provenance, and a few production practices keep a CI system that lives inside your cluster from harming it.

## What you will learn

- How Triggers turns a webhook into a PipelineRun
- What Chains signs and attests
- RBAC, namespaces and quotas for CI
- Pruning, metrics and upgrades

## Triggers

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: push-binding
spec:
  params:
    - name: revision
      value: $(body.after)
    - name: repo
      value: $(body.repository.clone_url)
---
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: ci-template
spec:
  params:
    - name: revision
    - name: repo
  resourcetemplates:
    - apiVersion: tekton.dev/v1
      kind: PipelineRun
      metadata:
        generateName: ci-run-
      spec:
        pipelineRef:
          name: ci
        params:
          - name: revision
            value: $(tt.params.revision)
```

An **EventListener** is a service that receives webhooks. A **TriggerBinding** picks fields from the payload, and a **TriggerTemplate** creates the resources. Add an interceptor to verify the webhook secret and filter events, so only valid, wanted pushes start builds.

## Chains

**Tekton Chains** watches completed TaskRuns, signs images and results and stores **provenance** that records what built what. It uses keys from a KMS or keyless signing and gives you evidence that an image came from your pipeline, which later admission policies can verify.

## Production practices

- Run each team's pipelines in its own namespace with a dedicated service account and the least RBAC it needs.
- Set resource requests, limits and a ResourceQuota so a build cannot starve the cluster.
- Pin step images by digest and use trusted bundles or a catalog with review.
- Prune finished runs on a schedule, and export controller metrics to your monitoring.
- Upgrade the controllers on a plan, because custom resources and APIs evolve.

```bash
kubectl get pipelineruns -n ci --sort-by=.metadata.creationTimestamp | tail
tkn pipelinerun delete --keep 50 -n ci -f
```

## Incident: Ten thousand finished runs

> **Incident:** Old runs piled up in the cluster and slowed the API server.

```console
$ kubectl get taskruns -A | wc -l
10482
apiserver: etcd request took 2.1s
```

Nobody had set a retention policy, so every run stayed as objects in the cluster. Listing them was slow and the control plane suffered. The team enabled automatic pruning, shipped logs and results to external storage and added a quota on the CI namespace.

## Common mistakes

- No pruning of old runs
- One shared service account with broad rights
- Webhook endpoints with no secret validation
- Mutable step images such as latest

```quiz
Q: What receives webhooks in Tekton Triggers?
+ An EventListener
- A Task :: No.
- A Workspace :: No.
- A Node :: No.
> It exposes an endpoint.

Q: What does Tekton Chains produce?
+ Signatures and provenance for builds
- Webhooks :: No.
- Volumes :: No.
- Namespaces :: No.
> It adds supply chain evidence.

Q: How limit CI resource use?
+ Quotas, requests and limits in a namespace
- Larger nodes only :: No.
- No limits :: No.
- More triggers :: No.
> Budgets prevent runaway builds.

Q: Why pin step images by digest?
+ A tag can change to different content
- Digests are shorter :: No.
- It speeds pulls :: No.
- It hides logs :: No.
> A digest is immutable.
```

```cards
EventListener :: Service that receives events for Triggers
TriggerTemplate :: Defines the resources created for an event
Chains :: Tekton component that signs and records provenance
Provenance :: A record of how and where an artifact was built
Pruning :: Removing old finished runs to keep the cluster healthy
```
