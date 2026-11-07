---
title: What Vault is and the secrets problem
minutes: 12
summary: Understand why static secrets in files and variables are risky and how Vault centralises secrets, access control, leases and audit.
---

Secrets sprawl is one of the commonest security weaknesses. The goal of a secrets manager is simple: no long-lived secret in a place a person or a repository can copy, and a record of every access.

## What you will learn

- The problems with static secrets
- Core Vault ideas: engines, auth, policies and leases
- What Vault can and cannot protect
- Vault and its alternatives

## The problem

A static secret has four weaknesses: it is copied (files, chat, wikis), it is shared (many people and services use one password), it is long-lived (rarely rotated), and it is untraceable (nobody knows who used it). Vault attacks each: one store, per-identity access, short leases, and an audit trail.

## Core concepts

| Concept | Meaning |
|---------|---------|
| **Secrets engine** | A plugin that stores or generates secrets (KV, database, PKI, transit) |
| **Auth method** | How a caller proves who it is (token, OIDC, Kubernetes, AppRole) |
| **Policy** | Rules that say which paths a caller may read or write |
| **Token** | The credential Vault gives after login, with a time to live |
| **Lease** | A time limit on a secret; Vault revokes it when it expires |
| **Audit device** | A log of every request and response (with secrets hashed) |

```diagram
title: A request to Vault
node: app | Application | 0 | 1 | Needs a secret to do its job. | Keeping the secret in a file defeats the point. | client
node: auth | Auth method | 1 | 0 | Verifies the caller's identity and issues a token. | A weak login becomes the new weak point. | security
node: pol | Policy check | 2 | 0 | Allows or denies the requested path. | Wide policies give far too much access. | security
node: eng | Secrets engine | 3 | 1 | Returns or generates the secret, with a lease. | An engine misconfigured with a root account is risky. | store
node: aud | Audit log | 2 | 2 | Records the request, the caller and the result. | If it cannot write, Vault stops answering. | observe
edge: app | auth
edge: auth | pol
edge: pol | eng
edge: eng | app
edge: pol | aud
```

## What it protects

Vault limits who can read a secret and for how long. It cannot stop an application that has a legitimate secret from misusing it or logging it. Combine it with least privilege, network controls, and short lifetimes.

## Alternatives

Cloud secret managers (AWS Secrets Manager, Azure Key Vault, Google Secret Manager) are simpler when you live in one cloud. Vault shines across clouds and on premises, and with dynamic secrets and PKI. OpenBao is an open source fork of Vault. Kubernetes Secrets alone are only base64 encoded unless you add encryption at rest.

## Incident: The password in six repositories

> **Incident:** A departed contractor still knew a live password.

```console
$ git grep -l "DB_PASSWORD=" -- '*.env' '*.yaml'
billing/.env
reports/config.yaml
ops/docker-compose.yaml
... 6 matches in 4 repositories
```

The same database password had been copied into config files over three years. Rotating it meant finding every copy. The team moved to Vault dynamic credentials, so each service received its own short-lived login.

## Common mistakes

- Treating Vault as a nicer place to keep the same shared password
- Giving every application the same broad policy
- Skipping the audit device
- Storing the Vault root token in a file

```quiz
Q: What is a lease?
+ A time limit on a secret
- A firewall rule :: No.
- A policy :: No.
- A VM :: No.
> Vault revokes the secret when it ends.

Q: What decides what a token may do?
+ Policies
- The image tag :: No.
- DNS :: No.
- The namespace name only :: No.
> Policies are path based rules.

Q: What does an audit device record?
+ Every request to Vault
- Only errors :: No.
- Only logins :: No.
- Disk usage :: No.
> Secrets are hashed in the log.

Q: What is a secrets engine?
+ A plugin that stores or creates secrets
- A database server :: No.
- A load balancer :: No.
- A text editor :: No.
> KV, database and PKI are engines.
```

```cards
Vault :: A system for storing, creating and controlling access to secrets
Secrets engine :: A plugin that stores or generates secrets
Lease :: A time limit attached to a secret or token
Audit device :: A destination for the log of every Vault request
Token :: The credential Vault issues after authentication
```
