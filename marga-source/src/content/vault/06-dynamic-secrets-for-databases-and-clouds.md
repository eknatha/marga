---
title: Dynamic secrets for databases and clouds
minutes: 13
summary: Generate short-lived database and cloud credentials on demand with Vault, understand leases and revocation, and rotate the root credential Vault uses.
---

Dynamic secrets are Vault's best idea. Nothing to store, nothing to rotate by hand, nothing shared. Each service gets its own login that expires.

## What you will learn

- How dynamic secrets work
- Configuring the database engine
- Leases, renewal and revocation
- Cloud credentials and rotating the root user

## The idea

The application asks Vault for credentials. Vault creates a user in the database with a random password and a limited set of grants, returns it with a lease, and removes it when the lease expires or is revoked. Each request gets a different user, so the audit log can name the caller.

## Configuring a database

```bash
vault secrets enable database
vault write database/config/orders \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@db.internal:5432/orders" \
  allowed_roles="orders-ro" \
  username="vault_admin" password="change-me"
vault write database/roles/orders-ro \
  db_name=orders \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl=1h max_ttl=24h
vault read database/creds/orders-ro
```

```diagram
title: A dynamic database credential
node: app | Application | 0 | 1 | Requests credentials at startup or before expiry. | Caching them forever defeats the lease. | client
node: vault | Vault database engine | 1 | 1 | Runs the creation SQL with its admin account. | The admin account is a high value target. | security
node: db | Database | 2 | 0 | Holds the new temporary user. | Users left behind show a failed revoke. | store
node: lease | Lease with TTL | 2 | 2 | Tracks the credential until it expires. | Renewing beyond max TTL is refused. | process
node: rev | Revocation | 3 | 1 | Drops the user at expiry or on demand. | Revoke by prefix after a breach. | process
edge: app | vault
edge: vault | db
edge: vault | lease
edge: lease | rev
edge: rev | db
```

## Leases

Each credential has a lease ID. The application renews it before it expires, up to the max TTL, then asks for new ones. `vault lease revoke <id>` deletes one user. `vault lease revoke -prefix database/creds/orders-ro` deletes all of them, a strong response to a suspected leak.

## Rotating the root user

Vault needs a privileged database account. Run `vault write -f database/rotate-root/orders` and Vault changes that account's password to one only it knows, so even the person who set it up no longer has it.

## Cloud

The AWS engine can create IAM users or, better, issue temporary STS credentials for a role. Azure and Google engines work similarly. Set short TTLs and narrow roles.

## Incident: The credential that died on schedule

> **Incident:** A leaked connection string was already useless.

```console
$ vault read database/creds/orders-ro
Key                Value
lease_duration     1h
username           v-oidc-orders-ro-1m3k9x-1730871442
password           A1b-example-only
$ psql -U v-oidc-orders-ro-1m3k9x-1730871442 -h db.internal orders
FATAL:  role "v-oidc-orders-ro-1m3k9x-1730871442" does not exist
```

A developer pasted a connection string into a public issue tracker. By the time a scanner found it, the TTL had passed and Vault had dropped the database user. The team only needed to confirm in the audit log that nothing used it.

## Common mistakes

- Giving the Vault admin account more rights than it needs
- Long TTLs on dynamic credentials
- Caching credentials past their lease
- Not rotating the root credential

```quiz
Q: What does Vault create for each request?
+ A unique database user with a lease
- A shared password :: No.
- A new database :: No.
- A new policy :: No.
> Each caller gets its own login.

Q: What does revoking a lease do?
+ Deletes the credential
- Renews it :: No.
- Extends the TTL :: No.
- Seals Vault :: No.
> Revocation drops the user.

Q: What does rotate-root do?
+ Changes the admin password to one only Vault knows
- Rotates logs :: No.
- Changes TTLs :: No.
- Seals the engine :: No.
> Humans no longer hold it.

Q: Which AWS credentials are preferred?
+ Temporary STS credentials
- Long-lived IAM keys :: No.
- Root keys :: No.
- Shared keys :: No.
> Temporary credentials expire.
```

```cards
Dynamic secret :: A credential created on demand with a lease
Lease ID :: The handle used to renew or revoke a lease
creation_statements :: SQL that creates the temporary database user
rotate-root :: Changing the admin credential so only Vault knows it
STS :: AWS Security Token Service, which issues temporary credentials
```
