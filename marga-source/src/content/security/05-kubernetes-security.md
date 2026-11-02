---
title: Kubernetes security
minutes: 18
summary: Control who can do what with RBAC, restrict pod behaviour with security standards and policies, isolate traffic with network policies, and protect secrets and the control plane.
---

A Kubernetes cluster is a shared system with a powerful API. By default, pods can talk to every other pod, a pod can often reach the API server with a token, and nothing stops a deployment from asking for root or for the host network. Securing a cluster means narrowing each of those defaults, one layer at a time.

## What you will learn

- RBAC and service accounts
- Pod security standards and admission policies
- Network policies and default deny
- Protecting secrets and the control plane
- Runtime detection and audit logs

## Identity: RBAC and service accounts

Role-based access control decides which verbs (get, list, create, delete) a subject may use on which resources in which namespace. Grant roles to groups, not individuals, prefer namespaced `Role` over `ClusterRole`, and avoid wildcards.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deploy-reader
  namespace: shop
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
```

Every pod runs as a service account. Create a dedicated one per workload, and set `automountServiceAccountToken: false` for pods that never call the API. Check access with `kubectl auth can-i`:

```console
$ kubectl auth can-i delete pods -n shop --as system:serviceaccount:shop:web
no
```

## Pod security

The built-in Pod Security Standards define three levels: privileged, baseline and restricted. Enforce at least baseline everywhere, and restricted for application namespaces, by labelling the namespace. The restricted level requires non-root, no privilege escalation, dropped capabilities and a safe seccomp profile.

```yaml
securityContext:
  runAsNonRoot: true
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop: ["ALL"]
  seccompProfile:
    type: RuntimeDefault
```

For rules beyond the standards, such as "images must come from our registry" or "every workload needs resource limits", use an admission policy engine such as Kyverno or OPA Gatekeeper, or the built-in validating admission policies. Start in audit mode, fix the findings, and then enforce.

## Network policies

A NetworkPolicy is a firewall rule for pods. Start with a default deny for ingress in each namespace, then allow only the flows you intend. This needs a network plugin that enforces policies.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny, namespace: shop }
spec:
  podSelector: {}
  policyTypes: ["Ingress"]
```

```diagram
title: What an attacker can reach after taking over one pod
node: pod | Compromised pod | 0 | 1 | A web pod that an attacker has gained a shell in. | The starting point. Its permissions decide how far the attacker gets.
node: api | API server | 1 | 0 | The control plane entry point. It accepts calls with the pod service account token. | If the token has broad rights, the attacker can read secrets or start new pods. Narrow RBAC and no auto-mounted token stop this.
node: db | Database pod | 1 | 2 | Holds customer data and listens inside the cluster. | With no network policy, any pod can connect. A default deny policy blocks the connection.
node: node | Worker node | 2 | 1 | The host that runs the pod. | A privileged pod or a mounted host path can reach the node and every other pod on it.
edge: pod | api
edge: pod | db
edge: pod | node
```

## Secrets and the control plane

- Turn on **encryption at rest** for Secrets in etcd, and restrict who can read them. A Secret is base64 text, not protection.
- Prefer an external secrets store or a CSI driver that mounts secrets on demand.
- Never expose the API server or the kubelet to the whole internet. Restrict by network and require authentication.
- Keep Kubernetes and node images updated, and enable audit logging for the API.

> **Warning:** Granting a user the right to create pods in a namespace can be equal to granting access to every secret in it. Review such roles with care.

## Runtime detection

Admission controls stop bad configuration. They do not see an attacker who uses a legitimate pod. A runtime tool, such as Falco or eBPF-based agents, watches system calls and alerts on events such as a shell starting in a container, a write to a sensitive path, or an unexpected outbound connection.

## Incident: one pod, whole namespace

> **Incident:** A vulnerable web pod is exploited. Within minutes the attacker lists secrets in the namespace and connects to the database pod directly.

Two default behaviours made it easy: the pod had a service account token with broad rights, and nothing blocked traffic between pods.

```console
$ kubectl auth can-i list secrets -n shop --as system:serviceaccount:shop:web
yes
$ kubectl get networkpolicy -n shop
No resources found in shop namespace.
```

After containment, give each workload its own narrow service account, stop mounting tokens where they are not needed, add a default deny policy with explicit allows, and enforce the restricted pod security level.

## Common mistakes

- Binding `cluster-admin` to a service account or to every developer
- Leaving the default service account token mounted in all pods
- Running with no network policies, so that a flat network exists
- Enforcing a policy engine before auditing what it would block

```quiz
Q: What does a default deny NetworkPolicy do?
- Blocks the API server
+ Blocks all ingress to the selected pods until other policies allow specific traffic
- Encrypts traffic
- Deletes pods
> A default deny turns a flat network into an allow list, so a compromised pod cannot freely reach others.

Q: Which setting prevents a pod from getting extra privileges through setuid programs?
- hostNetwork: true
+ allowPrivilegeEscalation: false
- privileged: true
- runAsUser: 0
> It sets no-new-privileges for the container process.

Q: Why set automountServiceAccountToken to false for many pods?
- It speeds up scheduling
+ A pod that never calls the API does not need a credential that an attacker could steal
- It removes the service account
- It improves DNS
> Unused credentials are pure risk. Mount a token only where it is needed.

Q: Are Kubernetes Secrets encrypted by default in etcd?
+ No, they are base64 encoded unless you enable encryption at rest
- Yes, with AES by default
- Only in production
- Only if they are small
> Enable encryption at rest and keep access to Secrets tight with RBAC.
```

```cards
What do Pod Security Standards define? :: Three levels, privileged, baseline and restricted, for allowed pod settings
Command to test permissions? :: kubectl auth can-i VERB RESOURCE --as USER
What is a default deny policy? :: A NetworkPolicy that selects all pods and allows no ingress until others add allows
What do admission policies do? :: Validate or change objects when they are created, such as blocking images from unknown registries
What does Falco do? :: Watches runtime events and alerts on suspicious behaviour in containers
```
