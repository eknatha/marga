---
title: Azure: Entra ID, RBAC and managed identities
minutes: 12
summary: Understand how Azure separates the directory from resource permissions, assign roles at the right scope, and use managed identities.
---

Azure splits identity from access to resources. Microsoft Entra ID is the directory that holds users, groups and applications. Azure role-based access control decides what those identities can do to subscriptions, resource groups and resources. Learning to keep the two ideas apart makes most Azure access questions easy to answer.

## What you will learn

- Explain Entra ID and Azure RBAC
- Choose the right scope for a role assignment
- Use managed identities instead of secrets
- Use conditional access and privileged access sensibly

## Directory and resources

Entra ID authenticates people and applications and issues tokens. It also has directory roles, such as managing users, which are separate from Azure resource roles. Azure RBAC governs resources: a **role definition** lists allowed actions, a **scope** says where it applies, and a **role assignment** ties a principal to a role at a scope.

## Scopes and inheritance

Scopes form a hierarchy: management group, subscription, resource group, resource. An assignment at a higher scope is inherited by everything below it. Assign roles at the lowest scope that works. Giving Contributor on a subscription to fix one resource group problem grants access to everything in it.

## Built-in roles

Start with built-in roles such as Reader, Contributor and Owner, and narrower ones like Storage Blob Data Reader. Owner can also assign roles, so reserve it. Note that control-plane roles and data-plane roles differ: being Contributor on a storage account does not automatically allow reading blob data.

## Managed identities

A **managed identity** is an identity that Azure creates for a resource, such as a virtual machine, app service or function, and manages for you. The application requests a token from a local endpoint and uses it to reach other services, with no secret to store or rotate. A system-assigned identity lives and dies with its resource; a user-assigned identity is created separately and can be shared.

## Protecting sign-ins

Conditional access policies require MFA, compliant devices or trusted locations. Privileged Identity Management gives administrators just-in-time, time-limited elevation with approval and logs, instead of standing permanent rights.

```predict
Q: An app needs to read secrets from a key vault. Which pattern avoids storing a credential?
???
Give the app a managed identity and assign it a narrow role on that key vault.
> The platform supplies the token.
```

## Incident: Contributor at the subscription

> **Incident:** A contractor needed to restart one web app and was made Contributor on the whole subscription.

```console
$ az role assignment list --assignee contractor@example.com --all -o table
Role         Scope
Contributor  /subscriptions/0000-1111
```

The contractor could change every resource, including production databases. The team removed the assignment, created a custom role allowing only restart on that app, assigned it at the resource scope, and enabled time-limited elevation for similar needs.

## Common mistakes

- Assigning roles at the subscription level by default
- Confusing directory roles with resource roles
- Storing client secrets when a managed identity works
- Leaving permanent Owner rights

```quiz
Q: What does Entra ID provide?
+ Identities and sign-in for users and applications
- Disk storage :: No.
- Container images :: No.
- DNS :: No.
> The directory. Re-read the matching lesson section for the full reasoning.

Q: What is a role assignment made of?
+ Principal, role definition and scope
- Name, size, price :: No.
- Key, value, tag :: No.
- Port, host, path :: No.
> Who, what, where. Re-read the matching lesson section for the full reasoning.

Q: Why use a managed identity?
+ No secret to store or rotate
- It is slower :: False.
- It needs a password :: False.
- It works only offline :: False.
> Platform-issued tokens. Re-read the matching lesson section for the full reasoning.

Q: Where should you assign a role?
+ At the lowest scope that works
- Always at the subscription :: Too broad.
- Never :: Nothing works.
- At the management group :: Usually too broad.
> Least privilege. Re-read the matching lesson section for the full reasoning.
```

```cards
Entra ID :: directory and sign-in
RBAC :: role definition + scope + principal
Scope :: management group, subscription, resource group, resource
Managed identity :: Azure-managed identity for a resource
PIM :: just-in-time privileged access
Conditional access :: rules for sign-in
```
