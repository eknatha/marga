---
title: Authentication methods and tokens
minutes: 12
summary: Compare Vault auth methods for people and machines, understand token types, TTLs and renewal, and choose methods that avoid long-lived credentials.
---

Every Vault request needs a token. How a caller gets one decides how strong the whole system is. The ideal is a login that does not require a secret you must store.

## What you will learn

- Methods for people and for machines
- Tokens, TTLs and renewal
- AppRole and the secret-zero problem
- Identity based methods

## Methods

| Method | For | How it proves identity |
|--------|-----|------------------------|
| **OIDC / LDAP** | People | Single sign-on through the company identity provider |
| **Kubernetes** | Pods | The pod's service account token |
| **AWS / Azure / GCP** | Cloud workloads | The cloud's signed identity |
| **AppRole** | Pipelines and other machines | A role ID plus a secret ID |
| **Token / userpass** | Bootstrap and tests | A direct credential |

Enable and use a method:

```bash
vault auth enable oidc
vault auth enable kubernetes
vault auth list
vault login -method=oidc
```

## Tokens

A login returns a **token** with policies and a **TTL**. A service token can be renewed until its max TTL. A periodic token renews forever as long as it renews in time. A batch token is lightweight with no storage. Child tokens are revoked when their parent is, unless created as orphans. Set short TTLs so a leaked token expires quickly.

```diagram
title: From login to secret
node: who | Person or workload | 0 | 1 | Presents proof of identity. | A stolen proof lets someone log in. | client
node: method | Auth method | 1 | 1 | Checks the proof against the identity source. | A loose binding accepts the wrong caller. | security
node: tok | Token with policies and TTL | 2 | 0 | Short lived and renewable up to a maximum. | Long TTLs turn a leak into a long breach. | security
node: ident | Identity provider | 1 | 2 | OIDC, Kubernetes or cloud IAM. | Its own security sets the ceiling. | external
node: use | Request to a secrets engine | 3 | 1 | The token is sent with each call. | Tokens in logs are credentials. | service
edge: who | method
edge: method | ident
edge: method | tok
edge: tok | use
```

## AppRole and secret zero

AppRole splits login into a role ID (not secret, lives with the app) and a secret ID (delivered by the pipeline, single use, short lived). That reduces risk but still needs a trusted way to deliver the secret ID. Platform identity methods avoid this "secret zero" problem entirely.

## Binding

Bind roles tightly: a Kubernetes role should name the exact service account and namespace, and a cloud role should name the exact IAM role, not a wildcard.

## Incident: Any pod could log in

> **Incident:** A test pod read production secrets.

```console
$ vault read auth/kubernetes/role/app
Key                                 Value
bound_service_account_names         [*]
bound_service_account_namespaces    [*]
policies                            [prod-db]
```

The role accepted every service account in every namespace, so a pod in a test namespace could obtain the production policy. The role was bound to one service account in the production namespace.

## Common mistakes

- Wildcard bindings on Kubernetes or cloud roles
- Very long token TTLs
- Shared AppRole secret IDs
- Using the root token for applications

```quiz
Q: Which method suits a pod?
+ Kubernetes auth
- OIDC with a person login :: No.
- userpass :: No.
- Root token :: No.
> The service account proves identity.

Q: What does a TTL do?
+ Limits how long a token is valid
- Encrypts it :: No.
- Names it :: No.
- Deletes the policy :: No.
> Short TTLs shorten a breach.

Q: What is secret zero?
+ The first secret needed to get other secrets
- The last secret :: No.
- An unused key :: No.
- The root key :: No.
> Platform identity avoids it.

Q: What should a role binding name?
+ The exact service account and namespace
- A wildcard :: No.
- The image :: No.
- The cluster name only :: No.
> Tight binding limits who can log in.
```

```cards
Auth method :: A way for callers to prove identity to Vault
TTL :: Time to live, how long a token or lease is valid
AppRole :: A machine auth method using a role ID and secret ID
Periodic token :: A token that can renew indefinitely if renewed on time
Secret zero :: The first credential needed to start getting others
```
