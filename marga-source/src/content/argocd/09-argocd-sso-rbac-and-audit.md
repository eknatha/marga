---
title: Argo CD: SSO, RBAC and audit
minutes: 12
summary: Connect Argo CD to your identity provider, define roles and project permissions and keep an audit trail of who changed what.
---

Argo CD starts with a shared admin account, which is fine for a first test and wrong for a team. Production use needs identity, roles and evidence.

## What you will learn

- OIDC single sign-on and removing local admin
- Writing RBAC policy for roles and groups
- Limiting scope with AppProjects
- Audit trails and monitoring

## SSO

```yaml
# argocd-cm
data:
  url: https://argocd.example.com
  oidc.config: |
    name: Company SSO
    issuer: https://login.example.com
    clientID: argocd
    clientSecret: $oidc.clientSecret
    requestedScopes: ["openid", "profile", "email", "groups"]
  admin.enabled: "false"
```

Store the client secret in the Argo CD secret, not in the config map. After SSO works, disable the local `admin` account.

## RBAC

```csv
# argocd-rbac-cm: policy.csv
p, role:dev, applications, get, shop/*, allow
p, role:dev, applications, sync, shop/*, allow
p, role:release, applications, override, shop/*, allow
g, shop-developers, role:dev
g, platform-oncall, role:admin
```

Policies read as subject, resource, action, object. The object is usually `project/application`. Map identity provider groups to roles, and default to read-only for everyone else with `policy.default: role:readonly`.

## Projects

An **AppProject** limits which Git repositories an application may use, which clusters and namespaces it may deploy to and which Kubernetes kinds it may create. This stops a team from deploying to another team's namespace or creating cluster-wide resources.

```yaml
spec:
  sourceRepos: ["https://git.example.com/shop/*"]
  destinations:
    - {server: https://kubernetes.default.svc, namespace: shop-*}
  clusterResourceWhitelist: []
```

## Audit

Argo CD emits events and API logs for logins, syncs and changes. Ship them to central logging and alert on admin-level actions and manual syncs of production. Git history shows what changed, and Argo logs show who triggered it.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Argo CD: SSO, RBAC and audit fits together
node: n1 | SSO | 0 | 0 | Store the client secret in the Argo CD secret, not in the config map. | Shared admin credentials. | process
node: n2 | RBAC | 1 | 1 | Policies read as subject, resource, action, object. | Giving all developers sync rights in production. | security
node: n3 | Projects | 2 | 0 | An AppProject limits which Git repositories an application may use, which clusters and namespaces it may deploy to and which Kubernetes kinds it may create. | Projects that allow any repository and cluster. | process
node: n4 | Audit | 3 | 1 | Argo CD emits events and API logs for logins, syncs and changes. | No central audit logs. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Who synced production?

> **Incident:** A bad sync happened and no one could say who triggered it.

```console
application: shop-prod
operation: sync initiated by admin
revision: HEAD   health: Degraded
```

Everyone used the shared admin login. The team enabled SSO, disabled admin, gave developers sync rights only on non-production projects and required changes to production to come through reviewed Git commits.

## Common mistakes

- Shared admin credentials
- Projects that allow any repository and cluster
- Giving all developers sync rights in production
- No central audit logs

```quiz
Q: What should you do after SSO works?
+ Disable the local admin
- Share the password :: No.
- Delete projects :: No.
- Turn off logging :: No.
> Remove shared credentials.

Q: What limits where an app can deploy?
+ An AppProject
- A label :: No.
- A node :: No.
- A cache :: No.
> Projects restrict repos and destinations.

Q: What does a RBAC group mapping do?
+ Assigns a role to an identity provider group
- Creates a pod :: No.
- Encrypts Git :: No.
- Changes DNS :: No.
> Roles follow groups.

Q: Where does Git history help in audit?
+ It shows what changed
- It stores secrets :: No.
- It starts pods :: No.
- It scales :: No.
> Combine with Argo logs.
```

```cards
OIDC :: Standard for single sign-on
AppProject :: Argo CD boundary for repos, clusters and namespaces
policy.csv :: File of RBAC rules in Argo CD
Default role :: The role everyone without a mapping gets
```
