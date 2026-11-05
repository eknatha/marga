---
title: DNS, TLS and PKI: certificate lifecycle and automation
minutes: 12
summary: Follow a certificate from key and CSR to issuance, validation, renewal and revocation, and automate it with ACME so expiry never depends on a person remembering.
---

Certificates expire by design. Expiry limits the damage from a leaked key, but it creates a recurring job. Teams that renew by hand eventually forget one. The cure is to treat certificates as short-lived, automated objects and to watch the dates.

## What you will learn

- The steps from private key to trusted certificate
- How ACME challenges prove control of a name
- Renewal, rotation and revocation basics
- How to monitor expiry so nothing is a surprise

## From key to certificate

1. Generate a **private key** and keep it on the server (or in an HSM or key service). It never leaves.
2. Create a **CSR** (certificate signing request) containing the public key and the names.
3. The **CA** verifies you control the names, then signs a certificate.
4. Install the certificate with its chain, and reload the service.

```console
$ openssl req -new -newkey rsa:2048 -nodes -keyout app.key -out app.csr -subj "/CN=app.example.com" -addext "subjectAltName=DNS:app.example.com"
$ openssl req -in app.csr -noout -text | grep -A1 "Subject Alternative"
```

Protect the key with file permissions (`chmod 600`) and ownership. A new key at each renewal limits the time a stolen key is useful.

## ACME and automatic validation

ACME (RFC 8555) is the protocol used by Let's Encrypt and other CAs. The client proves control of a name with a challenge:

- **HTTP-01**: place a token at `/.well-known/acme-challenge/` on port 80 for that name. Simple, but needs public reachability and cannot issue wildcards.
- **DNS-01**: create a TXT record `_acme-challenge.name`. Works for wildcards and for internal servers, and needs API access to your DNS, which should be scoped narrowly.

Clients such as certbot, acme.sh, Caddy and cert-manager renew automatically, typically when about a third of the lifetime remains. Public certificates are valid for a few months at most, and the industry is moving to even shorter lifetimes, so automation is not optional.

## Rotate and revoke

Renewal replaces the certificate; the service must **reload** it, or it keeps serving the old one until restart. Test that reload in staging. **Revocation** tells clients a certificate must not be trusted before it expires (CRL lists and OCSP queries), but client support is uneven, so short lifetimes are the stronger control. If a private key leaks, replace the key, issue a new certificate, revoke the old one and look for how it leaked.

## Watch the dates

Automation fails silently: a DNS credential expires, a firewall blocks port 80, a reload hook breaks. Probe the real endpoints from outside and alert well before expiry.

```yaml
groups:
  - name: certificates
    rules:
      - alert: CertificateExpiresSoon
        expr: probe_ssl_earliest_cert_expiry - time() < 14 * 86400
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "Certificate for {{ $labels.instance }} expires in under 14 days"
```

This alert uses the Prometheus blackbox exporter's probe metric. With renewal at about 30 days remaining, a 14-day warning means the automation has already failed twice.

```predict
Q: certbot renewed the certificate on disk, but users still see the old one. What was missed?
???
The service was not reloaded after renewal. Add a deploy or reload hook and verify with openssl s_client from outside.
> Renewal is not complete until the service serves the new file.
```

## Incident: The forgotten certificate

> **Incident:** An internal tool that every engineer used for deployments stopped working on a Monday morning because its certificate had expired over the weekend.

```console
$ echo | openssl s_client -connect deploy.corp.example:443 -servername deploy.corp.example 2>/dev/null | openssl x509 -noout -enddate
notAfter=Mar  2 06:00:00 2026 GMT
```

The certificate had been created by hand two years earlier by someone who had since left, and it was not in any inventory or monitor. The team issued a new one, then created an inventory from DNS and load balancers, moved every endpoint to automated issuance and added the expiry alert above for all of them.

## Common mistakes

- Manual renewal with a calendar reminder
- Renewing the file but not reloading the service
- Monitoring only public sites and not internal ones
- Reusing the same private key forever

```quiz
Q: What does a CSR contain?
+ The public key and the requested names, signed with the private key
- The private key :: Never shared.
- The CA's root :: Not part of it.
- The user's password :: Unrelated.
> The CA never sees the private key.

Q: Which ACME challenge works for wildcard certificates?
+ DNS-01
- HTTP-01 :: It cannot issue wildcards.
- FTP-01 :: Does not exist.
- Email-01 :: Not in ACME.
> A TXT record proves control of the zone.

Q: Why alert on expiry 14 days ahead when renewal starts earlier?
+ If the alert fires, the automation has already failed and needs a person
- Because certificates last 14 days :: Not the reason.
- To test email :: Not the purpose.
- To avoid monitoring :: Opposite.
> The alert is a safety net for the automation.

Q: What must happen after a certificate file is renewed?
+ The service must reload it
- Nothing, it is automatic :: Many services keep the old one in memory.
- Delete the private key :: Breaks the service.
- Change the DNS TTL :: Unrelated.
> Verify what is actually served.
```

```cards
CSR :: request containing the public key and names
HTTP-01 :: token on port 80, no wildcards
DNS-01 :: TXT record challenge, works for wildcards
Reload hook :: makes the service use the renewed file
Expiry probe :: alert on probe_ssl_earliest_cert_expiry
```
