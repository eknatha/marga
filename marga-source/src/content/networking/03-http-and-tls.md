---
title: HTTP and TLS
minutes: 16
summary: Read HTTP requests and status codes, time each phase of a request with curl, and diagnose certificate failures.
---

At 06:00 the monitoring dashboard turns red and customers report "your connection is not private". Nothing was deployed overnight. A certificate expired, and every client that checks it now refuses to talk to your service. Knowing how HTTP and TLS fit together lets you spot that in seconds and prevent it from recurring.

## What you will learn

- The shape of an HTTP request and response
- Status code families and common headers
- How TLS authenticates a server
- How to inspect certificates and time requests with `curl` and `openssl`

## HTTP in one page

HTTP is a text protocol: the client sends a request, the server sends a response.

```console
$ curl -sv https://shop.example.com/health -o /dev/null 2>&1 | grep -E '^[<>]'
> GET /health HTTP/2
> Host: shop.example.com
> User-Agent: curl/8.5.0
> Accept: */*
< HTTP/2 200
< content-type: application/json
< cache-control: no-store
```

Lines starting with `>` are sent, and lines with `<` are received. This is sample output. The request has a **method** (`GET`), a **path**, and **headers** such as `Host`, which lets one IP address serve many sites.

| Family | Meaning | Examples |
|--------|---------|----------|
| 2xx | Success | `200 OK`, `201 Created`, `204 No Content` |
| 3xx | Redirect | `301` permanent, `302` temporary, `304 Not Modified` |
| 4xx | The client did something wrong | `400`, `401` not authenticated, `403` forbidden, `404`, `429` rate limited |
| 5xx | The server failed | `500`, `502` bad gateway, `503` unavailable, `504` gateway timeout |

For operations, the useful split is 4xx versus 5xx. A rise in 5xx means your service is failing, and a rise in 4xx often means a bad client or a broken release of the client. `502` and `504` come from a proxy or load balancer and mean the upstream behind it failed or was too slow.

## Time every phase with curl

```console
$ curl -s -o /dev/null -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} firstbyte=%{time_starttransfer} total=%{time_total}\n' https://shop.example.com/
dns=0.012 connect=0.031 tls=0.094 firstbyte=0.842 total=0.861
```

The values are cumulative seconds. Here DNS took 12 ms, the TCP connection was ready at 31 ms, and TLS finished at 94 ms. The big jump is from 94 ms to 842 ms: the server spent about 750 ms thinking before sending the first byte. That points at the application, not the network. This one command separates "slow network" from "slow backend".

## What TLS does

TLS gives you three things: **encryption** so others cannot read traffic, **integrity** so it cannot be altered, and **authentication** so you know you reached the real server.

Authentication uses a **certificate**, a signed statement that a public key belongs to a name. During the handshake the server presents its certificate and any intermediate certificates. The client checks that:

1. The name it asked for matches the certificate
2. The certificate is within its validity dates
3. The chain leads to a **certificate authority (CA)** the client trusts

`SNI` (Server Name Indication) is the name the client sends so a server hosting many sites can choose the right certificate. That is why you must pass the name when testing by IP.

```console
$ echo | openssl s_client -connect shop.example.com:443 -servername shop.example.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
subject=CN = shop.example.com
issuer=C = US, O = Let's Encrypt, CN = R11
notBefore=Aug 26 03:14:07 2026 GMT
notAfter=Nov 24 03:14:06 2026 GMT
```

Here the certificate is valid until November 24. Many ACME-issued certificates last about 90 days or less and are renewed automatically, so automation failure is the most common cause of an expiry.

## Incident: every client fails at 06:00

> **Incident:** Health checks and customers all fail with a certificate error at the same moment.

```console
$ curl -sS https://shop.example.com/health
curl: (60) SSL certificate problem: certificate has expired
$ echo | openssl s_client -connect shop.example.com:443 -servername shop.example.com 2>/dev/null | openssl x509 -noout -enddate
notAfter=Oct 24 05:59:59 2026 GMT
```

The certificate expired a minute ago. Work through it in order. First, renew it: run your certificate manager (for example `certbot renew`, or the equivalent for your CA) and reload the web server so it picks up the new files. Then verify from the outside, not from the server's own config files:

```console
$ sudo certbot renew --quiet && sudo systemctl reload nginx
$ echo | openssl s_client -connect shop.example.com:443 -servername shop.example.com 2>/dev/null | openssl x509 -noout -enddate
notAfter=Jan 22 06:01:12 2027 GMT
```

Next, find out *why* automatic renewal did not work. Typical causes are a blocked validation port, an expired API credential for DNS validation, or a renewal timer that was never enabled. Finally, add **monitoring for days until expiry** (alert at 21 and 7 days) so the next failure pages you well before users notice. Renewed files do nothing until the server reloads them, so check the reload step too.

## Common mistakes

- Testing HTTPS by IP address without sending the right SNI name
- Forgetting to reload the server after a certificate is renewed
- Serving the leaf certificate without the intermediate chain
- Relying on email warnings from the CA instead of your own expiry monitoring

```quiz
Q: A load balancer returns 502 Bad Gateway. What does it indicate?
- The client sent an invalid request
+ The proxy could not get a valid response from the upstream server
- The page was permanently moved
- The user is not logged in
> 502 and 504 come from a gateway or proxy when the upstream failed or timed out. A 4xx code points at the request itself.

Q: In the curl timing output, time_connect is 0.031 and time_starttransfer is 0.842. What is the most likely bottleneck?
- DNS lookup
- The TCP connection
+ The server's processing time before it sends the first byte
- The TLS certificate
> The long gap between connecting and the first byte is spent in the server, which points at the application.

Q: What does SNI allow?
- Compressing responses
+ A server hosting many sites to present the certificate for the requested name
- Faster DNS lookups
- Skipping certificate checks
> The client sends the hostname during the handshake so the server can choose the matching certificate.

Q: A certificate was renewed on disk but clients still see the expired one. What step was probably missed?
- Restarting the database
+ Reloading the web server so it loads the new certificate
- Lowering the DNS TTL
- Changing the HTTP method
> Servers read certificate files when they start or reload. Renewing the file alone does not change what a running process serves.
```

```cards
401 vs 403? :: 401 means not authenticated; 403 means authenticated but not allowed
What does a 504 mean? :: The gateway timed out waiting for the upstream
Command to see a server's certificate dates? :: openssl s_client -connect host:443 -servername host | openssl x509 -noout -dates
What three things does TLS provide? :: Encryption, integrity and server authentication
```
