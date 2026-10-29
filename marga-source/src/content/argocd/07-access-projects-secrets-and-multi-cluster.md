---
title: Access, projects, secrets and multi-cluster
minutes: 14
summary: Limit who can do what with projects and RBAC, keep secrets out of the repository, and deliver to more than one cluster.
---

Argo CD is powerful: it can create anything in the clusters it manages, so protecting it matters. Three topics decide whether a shared installation is safe: who may do what (projects, RBAC and single sign-on), where secrets live, and how remote clusters are registered.

## What you will learn

- Use projects to limit sources, destinations and kinds
- Configure RBAC and single sign-on
- Handle secrets without storing them in plain text
- Register and secure multiple clusters

## Projects

An **AppProject** limits which repositories an application may use, which clusters and namespaces it may deploy to, and which resource kinds it may create (for example, no cluster roles). Give each team a project. Do not run everything in `default`, which is unrestricted.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-shop
  namespace: argocd
spec:
  sourceRepos: ["https://example.com/platform/shop-config.git"]
  destinations:
    - server: https://kubernetes.default.svc
      namespace: "shop-*"
  clusterResourceWhitelist: []
```

## RBAC and sign-in

Connect single sign-on (OpenID Connect) so people use company identities and MFA, and disable the shared admin account. Map groups to roles in `argocd-rbac-cm`: viewers see, developers sync their project, platform administrators manage projects. Use project roles and tokens for automation with limited scope.

## Secrets

The repository must not hold plain secrets. Common approaches: **sealed or encrypted secrets** committed in encrypted form, **External Secrets Operator** that creates Kubernetes Secrets from a cloud secrets manager, or a **plugin** that injects values at render time. Choose one and standardise it. Remember that Argo CD itself stores cluster credentials and repository credentials as secrets, so protect its namespace.

## Multiple clusters

Register a remote cluster with `argocd cluster add`, which creates a service account in that cluster and stores its token in Argo CD. Prefer a hub model with one control cluster and narrow roles per target, or one Argo CD per environment tier so a compromise of non-production cannot reach production. Limit what the remote service account can do where possible.

```predict
Q: Teams share one Argo CD. How do you stop team A deploying into team B's namespaces?
???
Give each team an AppProject with its own allowed destinations and sources, and bind roles to that project.
> Projects are the boundary.
```

## Incident: Secret in the repository

> **Incident:** A scan found a database password in a values file inside the configuration repository.

```console
$ grep -rn "password:" apps/shop-api/values-prod.yaml
12:  password: "Pr0d-Db-2024!"
$ git log --oneline -- apps/shop-api/values-prod.yaml | wc -l
9
```

The password existed in nine commits. The team rotated it first, since history cannot be trusted to hide it, then replaced the value with a reference to the External Secrets Operator, added secret scanning in pull requests, and restricted access to the repository.

## Common mistakes

- Using the default project for everything
- Shared admin login
- Plain secrets in values files
- One Argo CD with unlimited reach into production

```quiz
Q: What does an AppProject limit?
+ Sources, destinations and resource kinds
- Fonts :: No.
- Disk speed :: No.
- DNS TTL :: No.
> Boundary. Re-read the matching lesson section for the full reasoning.

Q: Where should secrets be stored?
+ Outside the repository or encrypted
- In values files in plain text :: Leaks.
- In issue comments :: Leaks.
- In images :: Leaks.
> Reference them. Re-read the matching lesson section for the full reasoning.

Q: Why use single sign-on?
+ Central identities, MFA and offboarding
- To be slower :: No.
- To hide logs :: No.
- To avoid RBAC :: No.
> Better control. Re-read the matching lesson section for the full reasoning.

Q: What do you do first if a secret was committed?
+ Rotate it
- Delete the commit only :: History persists.
- Ignore :: Risky.
- Rename the file :: Useless.
> Treat as exposed. Re-read the matching lesson section for the full reasoning.
```

```cards
AppProject :: boundary for teams
RBAC :: roles for people and tokens
SSO :: central sign-in
External secrets :: reference, not store
cluster add :: register a target
Hub model :: one control point, narrow roles
```
