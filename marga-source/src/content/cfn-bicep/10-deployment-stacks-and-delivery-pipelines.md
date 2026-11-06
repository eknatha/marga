---
title: Deployment stacks and delivery pipelines
minutes: 12
summary: Manage resource lifecycles with Azure deployment stacks, and run CloudFormation and Bicep from CI pipelines with least-privilege roles.
---

A template is only as safe as its path to production. Deployment stacks fill a gap in Azure by tracking what a deployment owns, and a good pipeline replaces human keys with short-lived identity.

## What you will learn

- Deployment stacks and deny settings
- Federated identity for pipelines
- Service roles and least privilege
- Environment promotion and approvals

## Deployment stacks

A plain Azure deployment forgets what it created. A **deployment stack** keeps the list, so when a resource is removed from the template you choose whether to **detach** it or **delete** it. **Deny settings** can block changes to managed resources by anyone except the stack itself.

```console
$ az stack group create --name app --resource-group rg-app --template-file main.bicep \
    --action-on-unmanage deleteResources --deny-settings-mode denyDelete
```

## Pipelines without stored keys

Use **OpenID Connect federation**: the pipeline presents a short-lived token from the CI provider, and the cloud exchanges it for a role limited to the repository, branch or environment.

```yaml
# GitHub Actions
permissions:
  id-token: write
  contents: read
steps:
  - uses: azure/login@v2
    with:
      client-id: ${{ vars.CLIENT_ID }}
      tenant-id: ${{ vars.TENANT_ID }}
      subscription-id: ${{ vars.SUB }}
  - run: az deployment group what-if -g rg-app --template-file main.bicep
```

For AWS, the pipeline assumes a role through an OIDC provider. For CloudFormation, pass a **service role** so the stack uses its own permissions rather than the caller's.

## Promotion

Build once, version the template, deploy to dev, run checks, then promote to production behind a manual approval that displays the change set or what-if output. Keep separate identities and subscriptions or accounts per environment.

```diagram
title: A least-privilege pipeline
node: git | Git commit | 0 | 0 | Templates and parameters reviewed. | Unreviewed merges deploy straight to production.
node: ci | Pipeline | 1 | 0 | Lints, previews and deploys. | A stored key in settings can leak. | process
node: oidc | Federated identity | 2 | 0 | Short-lived token exchanged for a narrow role. | A too-broad role undoes the benefit. | security
node: dev | Dev environment | 3 | 0 | First target of every change. | Skipping dev finds problems in production. | store
node: prod | Production | 3 | 1 | Deployed after approval of the preview. | No approval gate means no last check. | store
edge: git | ci
edge: ci | oidc
edge: oidc | dev
edge: oidc | prod
```

## Incident: A key in the log

> **Incident:** A long-lived cloud key stored in pipeline settings was printed by a debugging step.

```console
build.log: echo $AZURE_CLIENT_SECRET
build.log: AZURE_CLIENT_SECRET=Q8x...
security: secret rotated; sign-ins reviewed
```

The key was valid for years and gave wide access. Federated credentials replaced it: nothing is stored, the token lives for minutes and only the main branch's production job can assume the production role.

## Common mistakes

- Long-lived keys in CI settings
- One pipeline identity with owner rights everywhere
- No approval step for production
- Deployment stack deny settings that block the pipeline itself

```quiz
Q: What does a deployment stack track?
+ Resources the deployment created
- Costs :: No.
- Users :: No.
- Logs :: No.
> It can delete or detach unmanaged ones.

Q: What replaces stored cloud keys in a pipeline?
+ Federated OIDC identity
- Longer passwords :: No.
- Shared files :: No.
- Email :: No.
> Short-lived tokens. The lesson section above explains why.

Q: What is a CloudFormation service role?
+ A role the stack uses instead of the caller's
- A user :: No.
- A policy :: No.
- A region :: No.
> Separates stack permissions.

Q: Why promote through environments?
+ Catch problems before production
- Save money :: No.
- Rename stacks :: No.
- Delete logs :: No.
> Dev tests every change first.
```

```cards
Deployment stack :: An Azure object that tracks resources a deployment manages
OIDC federation :: Exchanging a CI token for a cloud role without stored secrets
Service role :: A role a service assumes to act on your behalf
Promotion :: Moving a tested change from one environment to the next
Deny settings :: Rules that block changes to stack-managed resources
```
