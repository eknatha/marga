---
title: Incident response: rotating and revoking secrets
minutes: 13
summary: Respond to a leaked token or secret with revocation, lease and token cleanup, rotation, and a sealed-Vault emergency procedure, then review how it happened.
---

Incidents with secrets are time critical. A short, practised sequence is better than clever improvisation: identify, contain, rotate, investigate and learn.

## What you will learn

- Identify and revoke a leaked token
- Revoke leases by prefix
- Rotate static secrets and downstream systems
- Emergency options and the review

## Contain

You may not know who owns a leaked token. The **accessor** is a safe reference to it: audit logs show accessors, not tokens.

```bash
vault token lookup -accessor "$ACCESSOR"
vault token revoke -accessor "$ACCESSOR"
vault lease revoke -prefix database/creds/orders-ro
vault lease revoke -prefix aws/creds/deploy
```

Revoking a token also revokes child tokens and the leases they hold, which removes dynamic credentials issued to it. Revoking by prefix is a broad sweep when you do not know which lease leaked.

## Rotate

Static secrets in KV that the token could read must be assumed exposed. Replace them at the source (the vendor dashboard, the database), update KV, and restart consumers. Rotate the database root credential if the database engine was reachable. Use `vault write -f transit/keys/<name>/rotate` for transit keys, then rewrap.

```diagram
title: Response to a leaked token
node: det | Detect | 0 | 1 | A scanner, alert or report shows a leaked token. | Slow detection means a wider blast radius. | observe
node: rev | Revoke token and leases | 1 | 0 | Stops further use and drops dynamic credentials. | Revoking the wrong token breaks applications. | process
node: aud | Read the audit log | 2 | 1 | Shows which paths the token touched. | Logs show accessors, not token values. | observe
node: rot | Rotate exposed secrets | 3 | 0 | Replace static secrets at the source. | Missing a downstream copy leaves the leak open. | security
node: rev2 | Review and fix the cause | 3 | 2 | Shorten TTLs, narrow policies, add scanning. | Without it the next leak repeats. | process
edge: det | rev
edge: rev | aud
edge: aud | rot
edge: aud | rev2
```

## Investigate

Search the audit log for the token accessor and the client IP. List the paths it read. For each static secret that was read, treat it as exposed.

## Emergency options

`vault operator seal` makes Vault stop serving all requests at once; it is a last resort because every application loses access, and unsealing needs your key holders or KMS. Rotating the root key (`vault operator rotate`) and re-keying (`vault operator rekey`) change encryption and unseal keys after a suspected compromise of key shares.

## After

Write a short review: how the secret leaked, how long it was valid, what it could reach, and what stops it next time. Common fixes: shorter TTLs, narrower policies, secret scanning in repositories, and dynamic secrets instead of static.

## Incident: The token in the public repository

> **Incident:** A token was found in a public commit.

```console
$ vault token lookup -accessor 7c1a3d6e-example
policies     [ci-read]
ttl          718h
$ vault token revoke -accessor 7c1a3d6e-example
Success! Revoked token (if it existed)
```

The token had a thirty day TTL and the policy ci-read. Revoking it and its leases took two minutes. The audit log showed one read of a test path, so the team rotated one static secret and added secret scanning to the repository.

## Common mistakes

- Revoking blindly without knowing what depends on the token
- Rotating Vault but not the downstream systems
- Sealing Vault first and asking questions later
- Skipping the review

```quiz
Q: What is a token accessor?
+ A safe reference to a token
- The token itself :: No.
- A password :: No.
- A policy :: No.
> It lets you look up and revoke without the token.

Q: What does revoking by prefix do?
+ Revokes all leases under a path
- Seals Vault :: No.
- Creates a token :: No.
- Deletes a policy :: No.
> It sweeps many leases.

Q: Why rotate static secrets after a leak?
+ The token may have read them
- Vault requires it :: No.
- Tokens are secret :: No.
- Logs are small :: No.
> Assume read means exposed.

Q: When is sealing Vault appropriate?
+ As a last resort
- Always first :: No.
- Never :: No.
- Daily :: No.
> It stops every application.
```

```cards
Accessor :: A reference to a token that does not reveal it
Revoke :: Cancel a token or lease immediately
Rotation :: Replacing a secret with a new value
Blast radius :: What an attacker could reach with a stolen secret
Runbook :: Written steps to follow during an incident
```
