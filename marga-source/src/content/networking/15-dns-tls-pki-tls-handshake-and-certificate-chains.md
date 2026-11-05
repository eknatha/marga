---
title: DNS, TLS and PKI: the TLS handshake and certificate chains
minutes: 13
summary: Follow a TLS connection from hello to encrypted data, read a certificate chain with openssl, and diagnose name mismatch, expired and incomplete-chain errors.
---

TLS errors have a reputation for being cryptic, yet a short list of causes explains most of them: the name does not match, the certificate is expired, the chain is incomplete or the client does not trust the issuer. openssl can show you which one in seconds.

## What you will learn

- The main steps of a TLS 1.3 handshake
- Leaf, intermediate and root certificates, and trust stores
- Subject Alternative Names and SNI
- Using `openssl s_client` to find the real error

## The handshake in short

The client sends a hello with the versions and ciphers it supports and the **SNI** (the server name it wants, so one IP can serve many sites). The server answers with its choice, its certificate chain and proof that it holds the private key. Both sides derive session keys, and encrypted data flows. TLS 1.3 completes this in one round trip and removes old, weak options. The client checks that the chain leads to a trusted root, that the dates are valid, that the name matches, and (if configured) that the certificate is not revoked.

## Chains and trust

A server certificate (the **leaf**) is signed by an **intermediate** CA, which is signed by a **root** CA that is in the client's trust store. The server must send the leaf and the intermediates; the root is already trusted by clients and is not sent. If the server leaves out an intermediate, some clients (browsers can fetch missing intermediates) succeed while others (curl, Java, Python, mobile apps) fail with "unable to get local issuer certificate".

```console
$ openssl s_client -connect www.example.com:443 -servername www.example.com -showcerts </dev/null
$ openssl s_client -connect www.example.com:443 -servername www.example.com </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates -ext subjectAltName
$ curl -vI https://www.example.com 2>&1 | grep -i -E 'subject|issuer|expire|verify'
```

Always pass `-servername`, or you may get the default certificate instead of the right one. The output shows the chain (`s_client` lists each certificate with its depth), the validity dates and `Verify return code`. Code 0 means the chain is trusted.

## Names and SANs

Modern clients match the name against the **Subject Alternative Name** list, not the old Common Name. A certificate for `example.com` does not cover `www.example.com`, and a wildcard `*.example.com` covers one label only (`a.example.com`, not `a.b.example.com` and not the bare apex). Name mismatch errors usually mean the wrong certificate is being served for that hostname, often after a load balancer or SNI change.

## Time matters

Certificates have a not-before and a not-after date. A client with a wrong clock reports "not yet valid" or "expired" for a good certificate, so check `date` on the failing machine, especially on appliances and containers without time sync.

```predict
Q: The certificate works in a browser but curl says "unable to get local issuer certificate". What is the likely fault?
???
The server does not send the intermediate certificate. Browsers can fetch it themselves, but curl cannot. Install the full chain on the server.
> Serve leaf plus intermediates.
```

## Incident: Works in Chrome, fails in the payment gateway

> **Incident:** After a certificate renewal, customers could use the website but a partner's server-to-server calls started failing.

```console
$ openssl s_client -connect pay.example.com:443 -servername pay.example.com </dev/null 2>&1 | grep -E 'depth|Verify'
depth=0 CN = pay.example.com
verify error:num=20:unable to get local issuer certificate
Verify return code: 21 (unable to verify the first certificate)
```

The renewal script had installed only the leaf file, not the full chain. Browsers hid the problem by fetching the intermediate, while the partner's Java client could not. The team changed the deployment to use the full-chain file, added a post-deploy check that runs `openssl s_client` with strict verification from outside, and monitored the chain depth.

## Common mistakes

- Installing only the leaf certificate
- Testing with a browser only
- Forgetting SNI when testing with openssl
- Assuming a wildcard covers the apex and deeper subdomains

```quiz
Q: What does SNI tell the server?
+ The hostname the client wants, so it can present the right certificate
- The client's password :: Not sent.
- The encryption key :: Derived later.
- The IP of the server :: The client already knows it.
> One IP can host many names.

Q: Which certificates must a server send?
+ The leaf and the intermediate certificates
- Only the root :: Clients already trust their roots.
- Only the private key :: Never send a private key.
- Nothing :: The client needs a chain.
> Clients rebuild the path to a trusted root.

Q: Does *.example.com match a.b.example.com?
+ No, a wildcard covers one label only
- Yes, all levels :: Wildcards do not cross dots.
- Only on Fridays :: Nonsense.
- Yes, if the root agrees :: Not a rule.
> One label, and not the apex.

Q: A good certificate is reported as expired on one server only. What do you check?
+ The clock on that machine
- The DNS TTL :: Unrelated.
- The disk size :: Unrelated.
- The MTU :: Unrelated.
> Time errors look like certificate errors.
```

```cards
Leaf, intermediate, root :: server cert, signing CA, trusted anchor
SNI :: the server name sent in the client hello
SAN :: list of names a certificate is valid for
openssl s_client :: shows the chain, dates and verify result
Full chain :: leaf plus intermediates in one file
```
