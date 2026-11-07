---
title: DNS, TLS and PKI: mTLS and internal certificate authorities
minutes: 13
summary: Use mutual TLS for service identity, run an internal CA the safe way with cert-manager, and distribute trust bundles and rotation without outages.
---

Inside a company, services still need to know who they are talking to. Mutual TLS (mTLS) gives both sides a certificate, so the server verifies the client as well as the client verifying the server. The hard parts are not the cryptography but trust distribution, short lifetimes and rotation.

## What you will learn

- What mTLS adds to normal TLS and where it is used
- Designing an internal CA hierarchy with an offline root
- Issuing and renewing certificates in Kubernetes with cert-manager
- Rotating trust bundles and CA certificates safely

## Why mTLS

Normal TLS proves the server to the client. With mTLS the server requests a client certificate and checks it against a trusted CA. The certificate subject or SAN (often a service name or a SPIFFE ID such as `spiffe://prod/ns/shop/sa/checkout`) becomes the **identity** used in authorization rules. Service meshes use it for encryption and identity between pods, and some APIs and databases require it for clients.

## A sensible CA design

Keep the **root CA key offline** (or in an HSM) and use it only to sign a few **intermediate** CAs. Issuing intermediates sign day-to-day certificates and can be replaced or revoked without replacing the root. Use short lifetimes (days or hours for workloads) so that revocation is rarely needed. Separate intermediates by environment so a problem in staging cannot sign production identities.

```console
$ openssl x509 -in client.crt -noout -subject -issuer -dates -ext subjectAltName
$ openssl verify -CAfile ca-bundle.pem client.crt
$ curl --cert client.crt --key client.key --cacert ca-bundle.pem https://internal-api.prod.svc:8443/health
```

## cert-manager in Kubernetes

cert-manager watches `Certificate` objects, asks an **Issuer** (a CA, Vault, ACME or a cloud service) to sign them, stores the result in a Secret and renews before expiry.

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: checkout-mtls
  namespace: shop
spec:
  secretName: checkout-tls
  duration: 24h
  renewBefore: 8h
  commonName: checkout.shop.svc
  dnsNames:
    - checkout.shop.svc
    - checkout.shop.svc.cluster.local
  issuerRef:
    name: internal-ca
    kind: ClusterIssuer
  usages:
    - server auth
    - client auth
```

Applications must reload the changed Secret (watch the files or restart through a controller). A 24-hour certificate that is never reloaded becomes an outage every day.

## Trust bundles and rotation

Clients need the CA certificates they should trust, the **trust bundle**. To rotate a CA safely, first distribute the *new* CA certificate to every client (bundle contains old and new), then start issuing from the new CA, then wait until all old certificates have expired, and finally remove the old CA. Doing it in this order means there is no moment when a valid certificate is untrusted. CA certificates have expiry dates too, so put them on the same calendar and alerts as leaf certificates.

```predict
Q: You must replace an internal CA that expires next month. What is the safest order?
???
Add the new CA to every trust bundle first, then issue new certificates from it, wait for old ones to expire, and remove the old CA last.
> Trust before you issue.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How DNS, TLS and PKI: mTLS and internal certificate... fits together
node: n1 | Why mTLS | 0 | 0 | Normal TLS proves the server to the client. | Keeping the root CA key online on a shared server. | security
node: n2 | A sensible CA design | 1 | 1 | Keep the root CA key offline (or in an HSM) and use it only to sign a few intermediate CAs. | Replacing a CA without a trust bundle overlap. | process
node: n3 | cert-manager in Kubernetes | 2 | 0 | cert-manager watches Certificate objects, asks an Issuer (a CA, Vault, ACME or a cloud service) to sign them, stores the result in a Secret and renews before expiry. | Forgetting that the CA certificate itself expires. | process
node: n4 | Trust bundles and rotation | 3 | 1 | Clients need the CA certificates they should trust, the trust bundle. | Issuing long-lived workload certificates. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The CA that expired on a Sunday

> **Incident:** At 03:00 on a Sunday all service-to-service calls failed with "certificate has expired", although every leaf certificate had been renewed that day.

```console
$ openssl x509 -in /etc/pki/internal-ca.crt -noout -enddate
notAfter=Jun 14 03:00:00 2026 GMT
```

The intermediate CA certificate, created years earlier with a long but finite lifetime, had expired. The leaf certificates were fine, but their issuer was not. Nobody monitored CA expiry, since renewal automation covered only leaves. The team issued a new intermediate, pushed a trust bundle with both CAs, restarted services in waves, and added CA certificates to the expiry inventory with alerts at 90, 30 and 7 days.

## Common mistakes

- Keeping the root CA key online on a shared server
- Issuing long-lived workload certificates
- Replacing a CA without a trust bundle overlap
- Forgetting that the CA certificate itself expires

```quiz
Q: What does mTLS add compared with normal TLS?
+ The client also presents a certificate that the server verifies
- A faster handshake :: Not its purpose.
- No need for certificates :: It needs more of them.
- Plain text traffic :: Opposite.
> Both sides prove identity.

Q: Why keep the root CA key offline?
+ A stolen root key would let an attacker mint trusted certificates for everything
- It makes the disk smaller :: Unrelated.
- It speeds up issuance :: Offline keys are slower.
- Roots do not have keys :: They do.
> Protect the top of the trust chain.

Q: What is the safe order when rotating an internal CA?
+ Distribute the new CA, issue from it, let old certificates expire, then remove the old CA
- Remove the old CA first :: Breaks existing certificates.
- Issue from the new CA before clients trust it :: Causes failures.
- Restart everything at once :: Risky and unnecessary.
> Overlap the trust.

Q: What must an application do when cert-manager renews its Secret?
+ Reload the new certificate files
- Nothing, ever :: It may keep the old certificate.
- Delete the CA :: Breaks trust.
- Change its port :: Unrelated.
> Renewal needs a reload path.
```

```cards
mTLS :: both client and server present certificates
SPIFFE ID :: a URI naming a workload identity
Offline root :: root key kept off the network, signs intermediates only
Trust bundle :: set of CA certificates a client trusts
CA rotation :: trust new first, issue second, remove old last
```
