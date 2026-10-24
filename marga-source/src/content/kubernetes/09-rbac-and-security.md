---
title: RBAC and workload security
minutes: 17
summary: Grant least-privilege access with Roles and ServiceAccounts, test it with kubectl auth can-i, and harden Pods with securityContext.
---

By default, an administrator can do anything in a cluster and so can any careless script that borrows their credentials. Role-based access control (RBAC) limits what each person and workload may do, and Pod security settings limit what a compromised container can do. These are the two layers that most security reviews and the CKS exam focus on.

## What you will learn

- Roles, ClusterRoles and bindings
- ServiceAccounts for workloads
- How to test permissions with `kubectl auth can-i`
- A securityContext that follows least privilege

## RBAC building blocks

| Object | Scope | Purpose |
|--------|-------|---------|
| **Role** | One namespace | A set of allowed verbs on resources |
| **ClusterRole** | Whole cluster | Same, for cluster-wide or non-namespaced resources |
| **RoleBinding** | One namespace | Grants a Role (or ClusterRole) to users, groups or ServiceAccounts there |
| **ClusterRoleBinding** | Whole cluster | Grants a ClusterRole everywhere |

RBAC is **additive**: there are no deny rules. A subject can do something only if some binding allows it.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployer
  namespace: shop
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: shop
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: deployer-can-manage-deployments
  namespace: shop
subjects:
  - kind: ServiceAccount
    name: deployer
    namespace: shop
roleRef:
  kind: Role
  name: deployment-manager
  apiGroup: rbac.authorization.k8s.io
```

Test rather than assume:

```console
$ kubectl auth can-i update deployments -n shop --as=system:serviceaccount:shop:deployer
yes
$ kubectl auth can-i delete secrets -n shop --as=system:serviceaccount:shop:deployer
no
$ kubectl auth can-i --list -n shop --as=system:serviceaccount:shop:deployer
```

> **Warning:** Avoid granting `cluster-admin`, wildcard verbs (`*`), or the ability to read Secrets or create Pods broadly. The right to create Pods can usually be turned into the right to read any Secret in the namespace.

## ServiceAccounts for Pods

Every Pod runs as a ServiceAccount, and its token lets it call the API. Most applications never need to call the API, so turn the token off:

```yaml
spec:
  serviceAccountName: shop-api
  automountServiceAccountToken: false
```

## securityContext

```yaml
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: api
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
```

These mirror the container hardening you met in the Docker module. **Pod Security Admission** can enforce them per namespace by labelling it, for example `pod-security.kubernetes.io/enforce=restricted`, so non-compliant Pods are rejected at creation.

## Incident: a CI job fails with "forbidden"

> **Incident:** The deploy job reports `deployments.apps "shop-api" is forbidden: User "system:serviceaccount:shop:deployer" cannot patch resource "deployments" in API group "apps" in the namespace "shop"`.

The message names the user, the verb, the resource and the namespace. Check the effective permissions:

```console
$ kubectl auth can-i patch deployments -n shop --as=system:serviceaccount:shop:deployer
no
$ kubectl get rolebinding -n shop -o wide
$ kubectl describe role deployment-manager -n shop
```

Typical causes are a missing verb in the Role, a binding in a different namespace, a typo in the ServiceAccount name, or a Role bound to the wrong subject. Add only the missing verb (`patch` here), apply, and re-run `auth can-i`. Resist the urge to bind `cluster-admin` "to make it work". The error message gave you exactly what the account was missing.

## Common mistakes

- Granting cluster-admin to pipelines and humans for convenience
- Leaving the default ServiceAccount token mounted in every Pod
- Running containers as root with a writable filesystem
- Believing a Role denies things; RBAC only allows

```quiz
Q: Which pair grants a ServiceAccount permissions inside one namespace?
- ClusterRole and ClusterRoleBinding
+ Role and RoleBinding
- PodSecurityPolicy and Secret
- NetworkPolicy and Role
> A Role defines permissions in a namespace; a RoleBinding attaches it to subjects.

Q: Can RBAC explicitly deny an action?
- Yes, with deny rules
+ No, RBAC is purely additive; anything not allowed is denied
- Only for ClusterRoles
- Only for ServiceAccounts
> Permissions only accumulate from bindings.

Q: Which command tests whether a ServiceAccount can delete Secrets?
- kubectl get secrets --as=sa
+ kubectl auth can-i delete secrets -n shop --as=system:serviceaccount:shop:deployer
- kubectl describe sa deployer
- kubectl rbac check
> auth can-i with --as impersonates the subject and answers yes or no.

Q: Which securityContext setting prevents a process from gaining more privileges than its parent?
- runAsUser: 0
+ allowPrivilegeEscalation: false
- readOnlyRootFilesystem: false
- hostNetwork: true
> It sets no_new_privs on the process, blocking setuid-style escalation.
```

```cards
Role vs ClusterRole? :: A Role is namespaced; a ClusterRole is cluster-wide or can be reused across namespaces
How do you check a permission? :: kubectl auth can-i VERB RESOURCE --as=SUBJECT
Why disable automountServiceAccountToken? :: Most apps never call the API, so the token is unneeded attack surface
What enforces securityContext rules per namespace? :: Pod Security Admission via namespace labels
```
