---
title: Worked design: a multi-tenant Kubernetes platform
minutes: 17
summary: Share clusters between teams safely: isolation levels, quotas, upgrades, networking, and keeping the platform's own dependencies from becoming the outage.
---

An internal platform offers teams a place to run workloads without each building their own infrastructure. The design questions are isolation (how much can one tenant harm another), operability (how the platform itself is changed safely), and blast radius (how many tenants one mistake reaches).

## What you will learn

- Choose a tenancy model: namespaces, clusters per team, or cells
- Apply quotas, policies and network rules for isolation
- Plan cluster upgrades and add-on changes as staged rollouts
- Identify the platform's shared dependencies

## 1. Clarify

150 teams, 3,000 services, mixed criticality (customer-facing and batch). Teams self-serve namespaces, deployments and ingress. The platform team owns clusters, networking, ingress, DNS, observability agents and policies. Requirements: one team cannot starve or read another; platform upgrades cause no tenant downtime; cluster loss affects a bounded share; SLO for the control plane API 99.9 percent, for tenant workloads set by tenants.

## 2. Estimate

3,000 services at an average of 6 pods is 18,000 pods. A single cluster is practical up to a few thousand nodes and tens of thousands of pods, but limits (API server load, etcd size, DNS, network policies, rate limits) tighten earlier. Design for about 8 clusters of 400 to 600 nodes in 2 regions, not one very large cluster: failure of one cluster affects roughly an eighth of workloads and upgrades can be staged.

## 3. Sketch

Several clusters per region, each with the same platform layer (ingress, DNS, policy engine, observability agents, declarative delivery of platform config). A fleet controller assigns tenants to clusters. A global traffic layer routes by hostname. Shared services (identity, registry, secrets) are outside the clusters.

## 4. Deep-dive

**Tenancy model.** Namespace-per-team in shared clusters is cheap and has weaker isolation; cluster-per-team gives strong isolation at high cost and operational load; a middle path groups tenants into a small number of clusters by risk tier (critical, standard, batch), so a noisy batch tenant cannot share a failure domain with payments.

**Isolation controls.** Resource quotas and limit ranges per namespace; requests and limits on every pod; priority classes so critical workloads preempt batch; pod security standards enforced by admission policy; network policies default deny with explicit allows; separate service accounts with least-privilege RBAC; node pools or taints for sensitive or noisy workloads; per-tenant limits on the number of objects (a tenant that creates a million objects can overload the API server and etcd).

**Platform dependencies.** Cluster DNS, the CNI network plugin, the ingress controller, the policy webhooks, the registry and the identity provider are shared by every tenant in a cluster. A failing admission webhook can block all deployments; a broken CNI breaks all networking. Reddit's 2023 outage came from a Kubernetes upgrade from 1.23 to 1.24 that removed a node label the Calico route reflectors depended on; cluster networking broke and the site was down for about 314 minutes. Zalando's 2019 DNS overload and Preply's 2020 DNS and conntrack problems show the same theme: platform add-ons are single points per cluster. Give each a dependency review, redundancy, resource limits and a rollback.

**Upgrades.** Treat upgrades as staged rollouts: a canary cluster with synthetic and real low-risk tenants, a bake time, then clusters in groups across regions. Read deprecation notes and run checks for removed APIs and labels before each upgrade, and test the add-ons against the new version in a copy of production. Keep the ability to rebuild a cluster from declarative config quickly instead of repairing in place, and keep the previous control plane version rollable where the platform supports it.

**Control plane safety.** Back up etcd (or the managed equivalent) and test restores; protect the API server from unbounded clients; keep admission webhooks fail-safe with timeouts and exclusions for system namespaces.

**Cost and capacity.** Use cluster autoscaling with maximums, per-team showback, and headroom for losing a zone (see the capacity lesson). Spread each service across zones with topology constraints and disruption budgets so node drains during upgrades do not take a service down.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Noisy tenant | neighbours starved | quotas, limits, priority, node pools |
| Admission webhook fails | deployments blocked | timeouts, fail-safe policy, exclusions, redundancy |
| Bad cluster upgrade | cluster-wide outage | canary cluster, checks, staged groups, rebuild path |
| DNS or CNI overload | cluster networking fails | sized replicas, limits, node-local caches, load tests |
| API server overload | control plane unusable | client limits, per-tenant object caps, priority and fairness |
| Registry rate limit or outage | pods cannot start | internal mirror, cached images |
| Cluster loss | up to an eighth of workloads | multi-cluster deployment for critical services |

## 6. Trade-offs

More clusters mean smaller blast radius and more operational work (more upgrades, more config). Shared clusters are efficient and demand strong policy. Strict network policy slows onboarding and prevents lateral movement. A mirror of images costs storage and avoids third-party rate limits (Docker Hub limits pulls by source address). State the tiering you chose.

```predict
Q: A cluster upgrade removes a label that the network plugin's route reflectors need. What would have caught it before production, and what limits the damage?
???
Testing the add-ons against the new version in a copy of production and a canary cluster. Staged rollout across clusters limits the damage to one cluster, and a rebuild path restores it faster.
> Upgrade the platform the way you would ship a risky release.
```

## How it fails

One shared cluster for everything. Add-ons without redundancy or limits. Upgrades done everywhere in a weekend. Admission policies that block recovery actions. Tenants with no quotas.

## Incident: An upgrade that broke networking

> **Incident:** A control plane upgrade changed a label that the network layer depended on, and cluster networking failed.

```console
$ kubectl get nodes -l kubernetes.io/role=control-plane
No resources found
$ calicoctl node status
BGP peers: 0 established, 12 down
```

The console output is a simulated illustration. The real Reddit incident on 14 March 2023 is described in the case file with a sourced timeline: an upgrade of an older cluster from 1.23 to 1.24, a removed node label, broken Calico route reflection, about 314 minutes of downtime. The design answers are pre-upgrade checks for removed labels and APIs, canary clusters, and a faster rebuild.

## Interview question

"Design a multi-tenant Kubernetes platform." Choose tenancy tiers and several clusters per region, apply quotas, policies and network isolation, treat add-ons as single points, stage upgrades, back up and restore, and keep critical services spread across clusters.

## Common mistakes

- One giant shared cluster
- Treating add-ons as invisible
- No tenant quotas or object limits
- Upgrading every cluster at once

```quiz
Q: Why use several clusters rather than one very large one?
+ A fault or upgrade affects a bounded share and limits are easier to stay under
- Kubernetes forbids large clusters :: It does not forbid them.
- It reduces the number of upgrades :: It increases them.
- It removes the need for quotas :: Quotas are still needed.
> Correct: A fault or upgrade affects a bounded share and limits are easier to stay under. Re-read the matching lesson section for the full reasoning.

Q: What can one failing admission webhook do?
+ Block deployments for every tenant in the cluster
- Delete all pods :: Not its effect.
- Reset DNS :: Not its effect.
- Encrypt etcd :: Not its effect.
> Correct: Block deployments for every tenant in the cluster. Re-read the matching lesson section for the full reasoning.

Q: How should cluster upgrades be rolled out?
+ Canary cluster, bake time, then staged groups with pre-checks
- All clusters at once on a weekend :: Maximum blast radius.
- Only in production :: No testing.
- Without reading release notes :: Misses removed APIs.
> Correct: Canary cluster, bake time, then staged groups with pre-checks. Re-read the matching lesson section for the full reasoning.

Q: What protects the API server from one tenant?
+ Per-tenant object limits, client limits and priority and fairness
- A bigger logo :: Irrelevant.
- More dashboards :: Irrelevant.
- No limits :: Opposite.
> Correct: Per-tenant object limits, client limits and priority and fairness. Re-read the matching lesson section for the full reasoning.
```

```cards
tenant :: team or customer sharing the platform
resource quota :: namespace limit on resources and objects
network policy :: rules for which pods may talk
admission webhook :: check run before objects are accepted
canary cluster :: first cluster to receive a platform change
pod disruption budget :: limit on voluntary disruption of a service
```
