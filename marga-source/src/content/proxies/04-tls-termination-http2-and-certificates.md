---
title: TLS termination, HTTP/2 and certificates
minutes: 13
summary: Terminate TLS at the proxy with sound protocols, redirects, HSTS, OCSP stapling and automated certificate renewal.
---

The proxy is where users meet TLS. A good setup is short: a valid chain, modern versions, a redirect from plain HTTP and renewal that nobody has to remember. A bad one fails on a date you cannot see.

## What you will learn

- A minimal HTTPS server block
- Protocols, ciphers and HTTP/2
- HSTS, redirects and OCSP stapling
- Automated renewal and re-encryption to backends

## A minimal HTTPS server

```nginx
server { listen 80; server_name shop.example.com; return 301 https://$host$request_uri; }
server {
    listen 443 ssl;
    http2 on;
    server_name shop.example.com;
    ssl_certificate     /etc/ssl/shop/fullchain.pem;
    ssl_certificate_key /etc/ssl/shop/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    add_header Strict-Transport-Security "max-age=31536000" always;
    location / { proxy_pass http://app_backend; }
}
```

Use the **full chain** (your certificate plus intermediates). A missing intermediate works in some browsers and fails in others and in `curl`. Keep the private key readable only by root.

## Modern settings

TLS 1.2 and 1.3 are enough; older versions are retired. HTTP/2 multiplexes many requests over one connection and is enabled with `http2 on`. **HSTS** tells browsers to use HTTPS only for a period, so start with a short value before committing to a year. **OCSP stapling** lets the server include proof that the certificate is not revoked, which speeds up connections.

## Renewal

Most public certificates come from an ACME service. A client such as certbot or acme.sh proves control of the domain, fetches a certificate and runs a hook to reload the proxy. Test renewal with a dry run, alert at 21 days to expiry, and monitor the certificate the proxy actually serves, not just the file on disk.

```diagram
title: Certificate renewal that does not depend on a person
node: acme | ACME client | 0 | 0 | Requests and renews certificates automatically. | If the job fails silently, expiry arrives unnoticed.
node: cert | Certificate files | 1 | 0 | fullchain.pem and a protected private key on the proxy. | A wrong chain order breaks non-browser clients. | security
node: proxy | Proxy reload | 2 | 0 | A deploy hook reloads nginx so it serves the new file. | Renewed on disk but not reloaded still serves the old one.
node: users | Users | 3 | 0 | Browsers and clients see the live certificate. | An expired certificate blocks access completely.
node: mon | Expiry monitor | 2 | 1 | Checks the served certificate and alerts early. | No monitor means the first alert is a customer. | observe
edge: acme | cert
edge: cert | proxy
edge: proxy | users
edge: mon | proxy
```

## Re-encrypting to backends

If the network between proxy and app is not fully trusted, use `proxy_pass https://...` and verify the backend certificate with `proxy_ssl_verify on`. Otherwise plain HTTP inside a private network is common, but the choice should be conscious and written down.

## Incident: The certificate that renewed but did not reload

> **Incident:** A renewal ran on schedule but the proxy kept serving the old certificate until it expired.

```console
$ echo | openssl s_client -connect shop.example.com:443 2>/dev/null | openssl x509 -noout -enddate
notAfter=Nov  2 03:00:00 2026 GMT
$ ls -l /etc/ssl/shop/fullchain.pem
-rw-r--r-- 1 root root 5412 Oct 28 03:00 fullchain.pem
```

The file on disk was new but nginx had never reloaded. The team added a post-renewal hook that runs nginx -t and reload, and a monitor that checks the live certificate's expiry.

## Common mistakes

- Serving the leaf certificate without the intermediates
- Checking only the file on disk, not the served certificate
- Setting a one-year HSTS before the site is fully on HTTPS
- Leaving old TLS versions enabled for no reason

```quiz
Q: What should ssl_certificate point to?
+ The full chain file
- Only the private key :: No.
- The CSR :: No.
- The root CA only :: No.
> Clients need the intermediates.

Q: What does HSTS do?
+ Tells browsers to use HTTPS only
- Compresses responses :: No.
- Blocks bots :: No.
- Renews certificates :: No.
> It prevents downgrade to HTTP.

Q: What must happen after a certificate is renewed on disk?
+ The proxy must reload to serve it
- Nothing :: No.
- Delete DNS :: No.
- Reboot users :: No.
> Reload loads the new file.

Q: What is best to monitor?
+ The certificate the proxy actually serves
- Only the renewal log :: No.
- The CSR :: No.
- The key length :: No.
> Monitor what users see.
```

```cards
ACME :: A protocol for automatic certificate issuance and renewal
Full chain :: Your certificate plus the intermediate certificates
HSTS :: A header that makes browsers use HTTPS only
OCSP stapling :: Including proof of non-revocation in the TLS handshake
http2 :: A protocol that multiplexes many requests over one connection
```
