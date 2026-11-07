---
title: PKI: short-lived certificates with Vault
minutes: 13
summary: Run a private certificate authority with the PKI engine, design a root and intermediate hierarchy, issue short-lived certificates from roles, and plan for revocation and renewal.
---

Mutual TLS between services needs a steady supply of certificates. Doing that by hand does not scale. A private CA that issues short-lived certificates through an API does.

## What you will learn

- Root and intermediate CAs
- Roles that limit what can be issued
- Issuing and renewing certificates
- Revocation, CRLs and ACME

## Hierarchy

A **root CA** signs only intermediates and should be rarely used, kept offline or in its own protected mount. An **intermediate CA** signs the leaf certificates that services use. If the intermediate is compromised you replace it; the root stays trusted.

```bash
vault secrets enable -path=pki pki
vault secrets tune -max-lease-ttl=87600h pki
vault write pki/root/generate/internal common_name="Example Root" ttl=87600h
vault secrets enable -path=pki_int pki
vault write pki_int/intermediate/generate/internal common_name="Example Intermediate"
```

You then sign the intermediate's request with the root and set the signed certificate back.

## Roles

```bash
vault write pki_int/roles/internal-svc \
  allowed_domains="svc.example.internal" \
  allow_subdomains=true \
  max_ttl=72h
vault write pki_int/issue/internal-svc common_name=api.svc.example.internal ttl=24h
```

A role says which names a caller may request and the longest lifetime. Policies decide who may use a role.

```diagram
title: A private CA with Vault
node: root | Root CA (offline) | 0 | 1 | Signs the intermediate, then stays out of daily use. | A leaked root key means rebuilding all trust. | security
node: int | Intermediate CA in Vault | 1 | 1 | Signs service certificates. | Its key is the one used every day. | security
node: role | PKI role | 2 | 0 | Limits domains, key types and TTL. | A wildcard role can issue for any name. | process
node: svc | Service | 2 | 2 | Requests and renews its certificate. | Missing renewal still causes expiry. | service
node: trust | Trust bundle | 3 | 1 | The root certificate distributed to clients. | Clients that lack it reject the chain. | store
edge: root | int
edge: int | role
edge: role | svc
edge: root | trust
edge: svc | trust
```

## Issuing and renewing

Applications ask for a certificate, or a sidecar or agent does it and writes files for the service. Because lifetimes are short, the agent renews at about two thirds of the lifetime. Cert-manager in Kubernetes can use Vault as an issuer.

## Revocation

With a 24 hour life, waiting for expiry is often enough. For longer lifetimes Vault keeps a CRL and can serve OCSP. Newer Vault versions support ACME, so standard ACME clients can request certificates from your internal CA.

## Incident: The weekend expiry

> **Incident:** An internal API stopped because its certificate had expired.

```console
$ echo | openssl s_client -connect api.internal:443 2>/dev/null | openssl x509 -noout -enddate
notAfter=Nov  2 00:00:00 2026 GMT
$ date -u
Sat Nov  7 08:10:00 UTC 2026
```

The certificate had a one year lifetime and renewal was a manual calendar task nobody owned. The team moved to Vault issued certificates with a 24 hour TTL, renewed by an agent every 16 hours.

## Common mistakes

- Issuing leaf certificates directly from the root
- Roles that allow any domain
- Long lifetimes without a revocation plan
- Not alerting when renewal fails

```quiz
Q: What should sign leaf certificates?
+ An intermediate CA
- The root every time :: No.
- The client :: No.
- DNS :: No.
> The root stays protected.

Q: What does a PKI role limit?
+ Domains and TTLs that can be issued
- Disk size :: No.
- Pods :: No.
- Namespaces :: No.
> It bounds what callers can request.

Q: Why use short lifetimes?
+ Revocation matters less
- Certificates get larger :: No.
- CRLs become unneeded for ever :: No.
- Clients are faster :: No.
> Expiry replaces revocation.

Q: What can request certificates with standard clients?
+ ACME
- SSH :: No.
- FTP :: No.
- SNMP :: No.
> Vault supports ACME in newer versions.
```

```cards
Root CA :: The top certificate authority that signs intermediates
Intermediate CA :: A CA that signs everyday certificates
PKI role :: A template that limits what Vault will issue
CRL :: A list of revoked certificates
ACME :: A protocol for automated certificate issuance
```
