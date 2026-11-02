## What is pull-based delivery?
level: junior
A controller in the cluster watches a repository and makes the cluster match the desired state stored there. Compared with push, CI does not need cluster credentials, every change is a reviewed commit with history, and drift from manual edits is visible and can be corrected.

## What are an Application's source and destination?
level: junior
The source names the repository, revision and path or chart that holds the manifests. The destination names the cluster and namespace to deliver them to. The project groups applications and limits which sources, destinations and resource kinds they may use.

## What do Synced and Healthy mean?
level: junior
Synced means live state matches the repository. Healthy means the resources actually work. They are independent, so an application can be Synced but Degraded when the right manifests produce crashing pods, or OutOfSync but Healthy after a hand edit.

## What do prune and self-heal do and when are they risky?
level: mid
Prune deletes resources that are removed from the source. Self-heal reverts changes made directly in the cluster. A wrong path or empty render can make prune delete everything, so I roll them out in non-production first and protect stateful resources with Prune=false.

## How does Argo CD work with Helm?
level: mid
It renders the chart with helm template and applies the manifests itself, so there is no Helm release record. I keep values in files in the repository, pin chart versions, and render locally to compare before merging. UI overrides are avoided because they are not reviewed.

## How do you manage many environments and clusters?
level: mid
Overlays per environment for shared bases, an app-of-apps parent to bootstrap, and ApplicationSets with list, cluster or directory generators to avoid copy-pasted files. Promotion is a reviewed commit that copies a tested version, and generator changes get extra review because of their blast radius.

## How do you handle secrets in this model?
level: senior
The repository never holds plain secrets. I use encrypted secrets or the External Secrets Operator that creates Kubernetes Secrets from a cloud secrets manager. Argo CD itself stores cluster and repository credentials, so its namespace is protected, access uses single sign-on, and committed secrets are rotated immediately.

## An application is stuck and will not sync. How do you debug?
level: senior
I walk four stages: fetch, render, apply and health. app get shows the failing condition, I reproduce the render locally with helm template or kustomize build, use a dry-run and diff to see what would be applied, and check permissions and project rules. Endless OutOfSync usually means another controller owns a field.
