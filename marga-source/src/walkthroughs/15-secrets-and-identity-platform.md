# A secrets and identity platform for workloads
level: Advanced
modules: security, cloud, kubernetes
lessons: security/secrets-management, security/identity-authentication-and-zero-trust, security/encryption-and-key-management
summary: How services prove who they are, receive short-lived credentials and secrets, and how access is logged, rotated and revoked.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Give each workload its own identity, with no shared passwords
- Hand out secrets only to those who need them, for a short time
- Rotate secrets and keys without outages
- Record who accessed what

## The big picture

```diagram
title: Secrets and identity platform reference design
node: wl | Workloads | 0 | 1 | Applications and jobs that need credentials. | Long-lived secrets in files or environment variables leak.
node: idp | Workload identity | 1 | 1 | Issues a signed token that proves which workload is calling. | Without it, services identify by IP address, which is weak.
node: vault | Secrets manager | 2 | 1 | Checks the token and policy, then returns a secret or a short-lived credential. | If it is down, new starts fail.
node: kms | Key management | 3 | 0 | Holds encryption keys and performs encrypt and decrypt operations. | Deleting a key makes data unrecoverable.
node: db | Target systems | 3 | 1 | Databases and APIs that accept the temporary credentials. | Static admin passwords bypass the whole design.
node: audit | Audit log | 3 | 2 | Records every request, allowed or denied. | A log nobody reads misses attacks.
node: human | Engineers | 0 | 2 | Request access through single sign-on with approval. | Standing admin access is a permanent risk.
node: rot | Rotation jobs | 2 | 0 | Replace secrets and keys on a schedule or after a leak. | Rotation that breaks apps teaches teams to avoid it.
edge: wl | idp
edge: idp | vault
edge: vault | kms
edge: vault | db
edge: vault | audit
edge: human | vault
edge: rot | vault
```

## A service gets a database credential, step by step

1. A service starts and asks the platform for its identity token. The platform proves who the service is from where and how it was launched.
2. The service presents the token to the secrets manager and asks for database access.
3. The manager checks policy: this service, in this environment, may request a read-only role.
4. It creates a database user that expires in one hour, returns the credentials and logs the request.
5. The service uses them and asks for new ones before they expire.
6. If the service is compromised, an operator revokes its identity. The credentials expire on their own within the hour.

## Why the design looks like this

- **Workload identity** replaces shared passwords with something that cannot be copied to another place easily.
- **Dynamic, short-lived credentials** make a stolen secret useful for minutes, not months.
- **Central policy** lets you answer "who can reach this" in one place.
- **Envelope encryption** keeps the master key in key management and lets services use data keys.
- **Audit logs** support detection and investigation.

## Scaling decisions

1. Start by moving the most sensitive secrets into a manager and removing them from code and images.
2. Switch services to workload identity, one team at a time.
3. Move databases to dynamic credentials where the engine supports it.
4. Automate rotation, then rehearse it so that it is routine.
5. Add alerts for unusual access, such as a service reading secrets it never read before.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Secrets manager outage | Services cannot start or renew | Caching with short TTLs, high availability, tested break-glass |
| Policy too broad | A compromised service reads many secrets | Per-service policies, regular review of access |
| Leaked token | An attacker uses a stolen identity | Short token lifetime, binding to the workload, fast revoke |
| Rotation breaks an app | Outage after a scheduled change | Overlap old and new values, test in staging, rotate often |
| Key deleted by mistake | Encrypted data is lost | Deletion delay, approvals, backup of key material under strict control |
| Secret in logs | Credentials appear in plain text | Masking, scanning, never logging request headers by default |

## Trade-offs

- Dynamic secrets are safer but add moving parts that must stay up.
- Central control improves safety and creates a critical dependency. Plan for its failure.
- Frequent rotation limits damage but demands automation and good tests.

```predict
Q: A service's database password was copied into a chat message by mistake. With short-lived dynamic credentials, how bad is it?
???
Much less bad. The credential expires within its lifetime, often an hour, and can be revoked at once. With a static password you must change it everywhere and hope nothing breaks.
> Assume secrets will leak and shorten how long they work.
```
