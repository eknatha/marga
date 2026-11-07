---
title: Policies and least privilege access
minutes: 12
summary: Write path-based Vault policies, understand capabilities and the KV version 2 paths, use templated policies for self-service, and test what a token can do.
---

Authentication says who you are. Policies say what you may do. Most real Vault incidents come from policies that are too broad, not from broken cryptography.

## What you will learn

- Path based policies and capabilities
- KV version 2 data and metadata paths
- Templated policies
- Testing and reviewing policies

## A policy

```hcl
path "secret/data/billing/*" {
  capabilities = ["read"]
}
path "secret/metadata/billing/*" {
  capabilities = ["list"]
}
path "database/creds/billing-ro" {
  capabilities = ["read"]
}
```

Capabilities: `create`, `read`, `update`, `delete`, `list`, `sudo` (for protected paths) and `deny` (overrides everything). A path ending in `*` matches any suffix. If no policy mentions a path, access is denied.

## KV v2 paths

With KV version 2, the API path differs from the CLI path. `vault kv get secret/billing/db` reads `secret/data/billing/db` underneath. Listing uses `secret/metadata/...`. A policy that names the CLI path without `data/` silently gives no access, a common first-day mistake.

```diagram
title: Policy decision for one request
node: req | Request path + token | 0 | 1 | A read of secret/data/billing/db. | The token's policies are all that count. | client
node: p1 | Policy billing-read | 1 | 0 | Allows read under secret/data/billing/*. | Too wide a glob adds access by accident. | security
node: p2 | Policy default | 1 | 2 | Basic self-service paths. | The default policy applies to every token. | security
node: dec | Allow or deny | 2 | 1 | Union of capabilities, with deny winning. | No match means denied. | process
node: aud | Audit log | 3 | 1 | Records the decision and the caller. | Review denied requests for misconfigurations. | observe
edge: req | p1
edge: req | p2
edge: p1 | dec
edge: p2 | dec
edge: dec | aud
```

## Templated policies

```hcl
path "secret/data/{{identity.entity.aliases.auth_kubernetes_abc.metadata.service_account_namespace}}/*" {
  capabilities = ["read"]
}
```

Templating pulls values from the caller's identity, so one policy gives each namespace its own area without a separate policy per team.

## Testing

```bash
vault policy write billing-read billing-read.hcl
vault token create -policy=billing-read -ttl=15m
VAULT_TOKEN=<new token> vault kv get secret/billing/db
vault token capabilities secret/data/payments/db
```

Create a short-lived token with only the new policy and try allowed and forbidden paths. Review policies in version control like code.

## Incident: Read on everything

> **Incident:** A breached service read other teams' secrets.

```console
$ vault policy read app
path "secret/*" {
  capabilities = ["read", "list"]
}
$ vault token capabilities secret/data/payments/db
list, read
```

The shared policy was written in a hurry and attached to every service. When one service was compromised, the attacker could read all paths. The team created one policy per application, limited to its own prefix.

## Common mistakes

- One broad policy for every application
- Forgetting the data prefix in KV version 2
- Granting sudo or write where read is enough
- Not putting policies in version control

```quiz
Q: What does deny do?
+ Overrides other capabilities
- Adds read :: No.
- Creates a token :: No.
- Seals Vault :: No.
> Deny always wins. The lesson section above explains why.

Q: What path does vault kv get secret/app read in KV v2?
+ secret/data/app
- secret/app only :: No.
- secret/metadata/app :: No.
- sys/app :: No.
> The data prefix is added.

Q: What happens if no policy matches a path?
+ Access is denied
- Access is allowed :: No.
- Vault seals :: No.
- A new policy appears :: No.
> Default is deny. The lesson section above explains why.

Q: Why use templated policies?
+ One policy can serve many teams
- They remove audit :: No.
- They skip login :: No.
- They encrypt data :: No.
> Identity values fill the path.
```

```cards
Policy :: Rules that allow or deny paths for a token
Capability :: An action such as read, create or deny on a path
Glob :: A path pattern ending with * that matches any suffix
Templated policy :: A policy that uses identity values in paths
Default policy :: The basic policy attached to every token
```
