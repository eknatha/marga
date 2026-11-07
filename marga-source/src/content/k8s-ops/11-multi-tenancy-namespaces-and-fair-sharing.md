---
title: Multi-tenancy, namespaces and fair sharing
minutes: 12
summary: Share a cluster between teams with namespaces, quotas, network policy, RBAC and admission rules, and know when to use separate clusters.
---

A single large cluster is cheaper to run than many small ones, but tenants can affect each other. Good tenancy design limits resources, access and network reach per team.

## What you will learn

- Namespaces as the unit of isolation
- Quotas, limit ranges and priority
- RBAC, network policy and policy controls
- When separate clusters are the better choice

## A tenant namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-payments
  labels: {team: payments, cost-center: cc-204}
---
apiVersion: v1
kind: ResourceQuota
metadata: {name: compute, namespace: team-payments}
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 160Gi
    limits.memory: 200Gi
    pods: "200"
---
apiVersion: v1
kind: LimitRange
metadata: {name: defaults, namespace: team-payments}
spec:
  limits:
    - type: Container
      default: {cpu: 500m, memory: 512Mi}
      defaultRequest: {cpu: 100m, memory: 128Mi}
```

A **ResourceQuota** caps the total a namespace may request. A **LimitRange** sets defaults and bounds per container, so pods without requests still get sensible ones.

## Access and network

Use RBAC roles bound to team groups in their own namespaces. Add a default-deny **NetworkPolicy** and allow only needed flows. Enforce Pod Security Standards and admission policies, so tenants cannot run privileged pods or use host networking.

## Fair scheduling

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata: {name: platform-critical}
value: 100000
```

Priority classes decide who is evicted first under pressure. Reserve high priority for platform components. Use node pools or taints to separate workloads such as batch and latency-sensitive services.

## Limits of sharing

Namespaces do not isolate the kernel or control plane. If tenants are untrusted or have different compliance needs, use separate clusters or sandboxed runtimes. Track usage per team with labels and review quotas quarterly.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Multi-tenancy, namespaces and fair sharing fits together
node: n1 | A tenant namespace | 0 | 0 | A ResourceQuota caps the total a namespace may request. | No default requests and limits. | process
node: n2 | Access and network | 1 | 1 | Use RBAC roles bound to team groups in their own namespaces. | Namespaces with no quotas. | security
node: n3 | Fair scheduling | 2 | 0 | Priority classes decide who is evicted first under pressure. | Check the Common mistakes list below this diagram for what usually goes wrong here. | queue
node: n4 | Limits of sharing | 3 | 1 | Namespaces do not isolate the kernel or control plane. | Assuming namespaces isolate the kernel. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The batch job that ate the nodes

> **Incident:** A team's job consumed all memory and evicted others.

```console
node memory pressure: True
Evicted: 31 pods from 6 namespaces
namespace team-batch has no ResourceQuota
```

A new batch namespace had no quota or limits. A job requested no memory and then grew until nodes were under pressure. Admission now rejects namespaces without a quota, and batch work runs on a separate node pool with lower priority.

## Common mistakes

- Namespaces with no quotas
- No default requests and limits
- Assuming namespaces isolate the kernel
- Mixed trust tenants in one cluster

```quiz
Q: What does a ResourceQuota do?
+ Caps total resources in a namespace
- Names pods :: No.
- Encrypts data :: No.
- Creates nodes :: No.
> It limits consumption.

Q: What does a LimitRange do?
+ Sets defaults and bounds per container
- Deletes pods :: No.
- Creates volumes :: No.
- Changes DNS :: No.
> Defaults help. The lesson section above explains why.

Q: When use separate clusters?
+ When isolation needs are strict
- Never :: No.
- Only for logs :: No.
- Always :: No.
> Namespaces share the control plane and kernel.

Q: What decides who is evicted first?
+ Priority classes and QoS
- Names :: No.
- Colours :: No.
- Namespace age :: No.
> Priority guides eviction.
```

```cards
ResourceQuota :: Namespace-level resource cap
LimitRange :: Default and bounds for containers
PriorityClass :: Relative importance for scheduling
Tenant :: A team or customer sharing the cluster
```
