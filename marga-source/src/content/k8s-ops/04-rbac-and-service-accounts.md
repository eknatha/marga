---
title: RBAC and service accounts
minutes: 13
summary: Grant people and workloads only the Kubernetes API access they need, and audit who can do what.
---

Role-based access control decides what each identity may do with the Kubernetes API. Pods use service accounts to call that API as well. Poor RBAC is a common cause of both outages (a controller cannot do its job) and breaches (everyone is cluster-admin). The model is simple once you see its four objects.

## What you will learn

- Write Roles, ClusterRoles and bindings
- Choose namespace-wide or cluster-wide scope
- Use service accounts for workloads
- Audit permissions with kubectl auth can-i

## Four objects

A **Role** lists allowed verbs on resources inside one namespace. A **ClusterRole** does the same cluster-wide or for non-namespaced resources like nodes. A **RoleBinding** gives a Role (or ClusterRole) to subjects in one namespace. A **ClusterRoleBinding** gives a ClusterRole to subjects everywhere. RBAC only adds permissions; there is no deny.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: shop
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
```

## Subjects

Subjects are users, groups and service accounts. Kubernetes does not store users: they come from your authentication method (certificates, OpenID Connect through a company identity provider). Bind groups rather than individuals so access follows team membership.

## Service accounts

Each pod runs as a **service account**, whose short-lived token is mounted into the pod so the application can call the API. The default service account in a namespace should have no extra rights, and pods that never call the API should not mount a token (`automountServiceAccountToken: false`). Give each application its own service account with only the verbs it needs.

## Avoid broad rights

Be careful with wildcards (`*`), the `cluster-admin` role, and powerful verbs such as `create` on pods, `escalate`, `bind`, `impersonate`, and reading Secrets cluster-wide: each can be used to gain more access. Review ClusterRoleBindings regularly.

## Checking access

Ask the cluster: `kubectl auth can-i delete pods -n shop --as=jane` and `kubectl auth can-i --list -n shop --as=system:serviceaccount:shop:web`. These answer questions without trial and error.

```predict
Q: A pod needs to list pods in its own namespace only. What should you create?
???
A service account, a Role allowing get/list/watch on pods, and a RoleBinding in that namespace.
> Smallest scope.
```

## Incident: Forbidden for the controller

> **Incident:** A custom controller crashed after deployment with permission errors.

```console
$ kubectl logs deploy/cert-sync | tail -2
Error from server (Forbidden): secrets is forbidden: User "system:serviceaccount:ops:cert-sync" cannot list resource "secrets" in API group "" in the namespace "shop"
$ kubectl auth can-i list secrets -n shop --as=system:serviceaccount:ops:cert-sync
no
```

The error named the exact subject, verb and resource. The team added a Role for that one verb in that one namespace and a binding, and did not use cluster-admin. They then checked the other namespaces with can-i --list.

## Common mistakes

- Binding cluster-admin to fix errors
- Using the default service account for everything
- Granting wildcards
- Never reviewing bindings

```quiz
Q: Does RBAC support deny rules?
+ No, it only grants
- Yes :: False.
- Only for Roles :: False.
- Only for nodes :: False.
> Additive. Re-read the matching lesson section for the full reasoning.

Q: What binds a Role to a user in one namespace?
+ A RoleBinding
- A Service :: No.
- An Ingress :: No.
- A ConfigMap :: No.
> Namespace scope. Re-read the matching lesson section for the full reasoning.

Q: How do you test access?
+ kubectl auth can-i
- ping :: No.
- kubectl top :: No.
- df :: No.
> Ask the API. Re-read the matching lesson section for the full reasoning.

Q: Where should pods that never call the API get tokens?
+ They should not mount one
- Always mount :: Unneeded.
- Mount cluster-admin :: Dangerous.
- Share one token :: Bad.
> Reduce exposure. Re-read the matching lesson section for the full reasoning.
```

```cards
Role :: namespace permissions
ClusterRole :: cluster-wide permissions
RoleBinding :: grants within a namespace
Service account :: pod identity
can-i :: test permissions
No cluster-admin habit :: grant narrowly
```
