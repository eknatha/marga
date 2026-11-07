---
title: Audit logging, monitoring and hardening Vault
minutes: 13
summary: Enable audit devices, monitor Vault health and metrics, and apply production hardening: TLS, least privilege, no root tokens, memory and host protection.
---

A secrets manager is a high value target. The same properties that make it useful, central access to many secrets, make careful logging, monitoring and hardening essential.

## What you will learn

- Audit devices and what they record
- Metrics and alerts
- Production hardening checklist
- Operating without root tokens

## Audit

```bash
vault audit enable file file_path=/var/log/vault/audit.log
vault audit enable syslog tag=vault
vault audit list
```

Each request and response is logged as JSON with sensitive values HMAC hashed. You can search for who read a path and when, without storing the secrets in the log. If every audit device fails to write, Vault blocks requests rather than operate without a record, so enable two and monitor disk space. Ship logs to central storage that Vault admins cannot edit.

## Monitoring

Enable Prometheus telemetry and alert on: Vault sealed, no leader or frequent leader changes, high request error rates, rising token or lease counts, slow storage (Raft apply time), and certificate expiry of the Vault listener.

```diagram
title: What to watch and why
node: seal | Sealed state | 0 | 1 | Vault cannot serve when sealed. | A silent seal looks like a network outage. | observe
node: lead | Leader and quorum | 1 | 0 | A stable leader means writes work. | Flapping leaders point to network or disk issues. | observe
node: aud | Audit device health | 1 | 2 | If it fails, requests are blocked. | A full disk is the usual cause. | observe
node: lease | Leases and tokens | 2 | 1 | Counts show leaks and runaway clients. | Millions of leases slow Vault. | observe
node: sec | Hardening | 3 | 1 | Limits what an attacker gets from a node. | Skipped controls mean a bigger breach. | security
edge: seal | lead
edge: lead | lease
edge: aud | lease
edge: lease | sec
```

## Hardening checklist

- TLS everywhere, with a certificate from your CA.
- No root token in daily use; revoke after setup, and generate one only for emergencies.
- Run Vault as a dedicated non-root user, with core dumps and swap disabled, and `mlock` enabled.
- Firewall the API and cluster ports to known clients.
- Auto-unseal with a KMS key that has tight access.
- Separate policies for operators and applications, with `sudo` rare.
- Enable namespaces (Enterprise) or separate mounts per team.
- Keep Vault updated.

## Without root tokens

If you need privileged work, create a short-lived token with the required policy, or use `vault operator generate-root` with a quorum of key holders for emergencies. Record who did it and why.

## Incident: The audit disk filled

> **Incident:** Vault stopped answering after a long weekend.

```console
$ vault read sys/health
Error reading sys/health: 500 internal server error
$ df -h /var/log/vault
/dev/sda3  20G  20G  0  100% /var/log/vault
$ journalctl -u vault | tail -n 1
audit: no audit devices are available to write to
```

The audit log grew until the disk was full. With no working audit device Vault refused all requests. The team added a second audit device, log rotation and shipping, and a disk space alert.

## Common mistakes

- Only one audit device
- Leaving audit logs on the same disk as storage
- Using root tokens for daily work
- Alerting only on process up, not on sealed state

```quiz
Q: What happens when all audit devices fail?
+ Vault blocks requests
- Vault ignores it :: No.
- Secrets are deleted :: No.
- Policies reset :: No.
> It will not operate unaudited.

Q: What does Vault do to secrets in audit logs?
+ HMAC hashes them
- Writes them in clear :: No.
- Drops the log :: No.
- Encrypts the disk :: No.
> You can match values without seeing them.

Q: Which alert is essential?
+ Vault sealed
- Image tag changed :: No.
- CPU temperature only :: No.
- New namespace :: No.
> A sealed Vault serves nothing.

Q: How should a root token be used?
+ Rarely, for emergencies
- Daily :: No.
- By all admins :: No.
- In CI :: No.
> Prefer named identities.
```

```cards
Audit log :: A record of every request to Vault
HMAC :: A keyed hash used to hide sensitive values in logs
Telemetry :: Metrics Vault exposes for monitoring
Hardening :: Reducing the damage an attacker can cause
generate-root :: A quorum process to create an emergency root token
```
