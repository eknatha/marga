# Model answer: a multi-tenant Kubernetes platform for 150 teams
prompt: k8s-platform
summary: Few large clusters with namespaces, quotas, policy and a paved path, so teams ship without touching cluster internals.

## The answer in one minute

Give each team a namespace with quotas, RBAC and network policy, enforce standards with admission policy, deliver through a config repository and sync controller, and run several clusters by environment and region. The platform team owns the cluster and add-ons, and teams own their workloads.

## The design

```diagram
title: Multi-tenant Kubernetes platform design
node: team | Teams | 0 | 1 | Push code and manifests to the repository. | Direct kubectl bypasses review.
node: git | Config repository and sync controller | 1 | 1 | Reconciles cluster state from Git. | A bad merge rolls out everywhere.
node: adm | Admission policy | 2 | 0 | Rejects unsafe or unlabelled workloads. | Policy bugs block deploys.
node: ns | Namespaces, quotas, RBAC | 2 | 2 | Boundaries per team. | Missing quotas let one team starve others.
node: net | Network policy and ingress | 3 | 1 | Default deny and shared gateways. | Open networking spreads incidents.
node: nodes | Node pools | 4 | 0 | General, high-memory and GPU pools. | Mixed pools cause noisy neighbours.
node: obs | Observability and cost | 4 | 2 | Metrics, logs, cost per namespace. | Unowned cost creates arguments.
edge: team | git
edge: git | adm
edge: adm | ns
edge: ns | net
edge: net | nodes
edge: nodes | obs
```

## Every component, explained

### Namespace per team

A namespace groups a team workloads and holds their quotas, roles and policies.

Example: Team payments gets namespace payments with 40 CPU, 200 GiB memory and 50 pods.

### Quotas and limit ranges

Resource quotas cap totals and limit ranges set defaults, so every pod has requests and limits.

Example: A pod with no memory limit gets a default of 512 MiB.

### Admission policy

Policies check each object on creation: images from the approved registry, no privileged pods, required labels.

Example: A deployment using :latest from Docker Hub is rejected with a message.

### Network policy

Default deny between namespaces, with explicit allows for needed paths.

Example: Only the ingress gateway and the payments namespace may reach the payments database service.

### Declarative delivery

A controller applies what is in the config repository and shows drift. Rollback is a revert.

Example: A bad change is reverted in the repository and the cluster follows within a minute.

## Numbers to say out loud

- 150 teams with 20 pods each is 3000 pods; with 4 pods per node that is about 750 nodes before headroom.
- Split into clusters of 250 to 500 nodes for blast radius and upgrade speed.
- Reserve 10 to 20 percent for failures and upgrades.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Noisy neighbour | Latency for others | Requests, limits, quotas and separate pools |
| Cluster upgrade failure | Outage for many teams | Canary cluster and staged upgrades |
| Policy mistake | Deploys blocked | Audit mode first, tests, staged rollout |
| Control plane overload | API slow | Limit controllers and watch API server load |
| Secret exposure | Data leak | External secrets, least-privilege RBAC |

## Follow-up questions to expect

- When would you use a cluster per team instead?
- How do you handle upgrades?
- How do you charge teams?
