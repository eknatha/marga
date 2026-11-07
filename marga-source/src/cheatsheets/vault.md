---
title: Vault
summary: Seal and unseal, auth, policies, KV, dynamic secrets, PKI, transit and an incident response sequence.
module: vault
---
## Start and status

```bash
vault operator init -key-shares=5 -key-threshold=3
vault operator unseal
vault status
vault operator raft list-peers
```

> **Warning:** Dev mode (`vault server -dev`) is in memory with a known token. Never use it for real secrets.

## Auth

```bash
vault auth enable kubernetes
vault auth list
vault login -method=oidc
vault token lookup
vault token create -policy=app-read -ttl=15m
```

> **Warning:** Bind Kubernetes and cloud roles to an exact service account or role. Wildcards let any pod log in.

## Policy

```hcl
path "secret/data/app/*" {
  capabilities = ["read"]
}
path "secret/metadata/app/*" {
  capabilities = ["list"]
}
```

> **Warning:** KV version 2 reads `secret/data/...`. A policy written without `data/` gives no access.

## KV

```bash
vault kv put secret/app/db user=app pass=example
vault kv patch secret/app/db pass=newexample
vault kv get -version=2 secret/app/db
vault kv destroy -versions=1 secret/app/db
```

> **Danger:** `put` replaces the whole secret. Use `patch` for a partial change.

## Dynamic and transit

```bash
vault read database/creds/orders-ro
vault lease revoke -prefix database/creds/orders-ro
vault write database/rotate-root/orders
vault write transit/encrypt/orders plaintext="$(echo -n secret | base64)"
```

## Incident sequence

| Step | Command or action |
|------|-------------------|
| Identify | `vault token lookup -accessor "$ACCESSOR"` |
| Contain | `vault token revoke -accessor "$ACCESSOR"` |
| Sweep | `vault lease revoke -prefix <path>` |
| Investigate | Search the audit log by accessor |
| Rotate | Replace static secrets at the source |

> **Danger:** `vault operator seal` stops every application. Use it only as a last resort.

## Quick health sweep

```bash
vault status
vault operator raft list-peers
vault audit list
vault token lookup
vault list sys/leases/lookup/database/creds/app
```
