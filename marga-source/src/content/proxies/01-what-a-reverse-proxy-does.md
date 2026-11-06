---
title: What a reverse proxy does
minutes: 12
summary: Learn what sits between users and your services, the jobs a reverse proxy does and how it differs from a forward proxy and a load balancer.
---

Almost every production web service sits behind a proxy. It is the front door: it decides which backend gets each request and enforces rules before the traffic reaches your code. Understanding its jobs makes every later topic, from TLS to timeouts, easier.

## What you will learn

- The difference between forward proxies, reverse proxies and load balancers
- The jobs a reverse proxy does
- Layer 4 and layer 7 proxying
- Where the proxy sits in an architecture

## Forward, reverse and load balancer

A **forward proxy** sits on the client side and sends requests out for users (for example a company web filter). A **reverse proxy** sits on the server side and receives requests for your services. A **load balancer** is a reverse proxy whose main job is to spread requests across several backends. In practice one program, such as nginx, HAProxy or Envoy, often does all three roles.

## Jobs of a reverse proxy

- **Routing:** send `api.example.com` to one service and `/static/` to another.
- **TLS termination:** handle certificates and encryption once, speak plain or re-encrypted traffic inside.
- **Load balancing and health checks:** share requests and stop sending to failed backends.
- **Protection:** rate limits, size limits, request filtering and hiding backend details.
- **Performance:** compression, connection reuse and caching of responses.
- **Observability:** one place to log every request.

## Layer 4 and layer 7

A **layer 4** proxy forwards TCP or UDP streams without reading them, which is fast and works for any protocol. A **layer 7** proxy understands HTTP, so it can route by host, path, header or cookie and can rewrite requests. Choose layer 4 for databases and raw TLS passthrough, layer 7 for web traffic.

```diagram
title: A reverse proxy in front of services
node: user | Users | 0 | 0 | Browsers and apps that connect to one public address. | If the address changes without DNS updates, users cannot reach you.
node: proxy | Reverse proxy | 1 | 0 | Terminates TLS, applies rules and picks a backend. | A single proxy is a single point of failure; run at least two.
node: web | Web service | 2 | 0 | Serves pages for the main host. | If it fails, the proxy should stop routing to it.
node: api | API service | 2 | 1 | Serves API paths on private addresses. | Exposed directly, it skips the proxy's protections. | service
node: log | Access logs | 1 | 1 | Every request is recorded at the front door. | Without logs you cannot tell users from attackers. | observe
edge: user | proxy
edge: proxy | web
edge: proxy | api
edge: proxy | log
```

## What a proxy changes

Backends now see the proxy's address, not the user's. The proxy passes the original address in headers such as `X-Forwarded-For`, and the application must trust that header only from the proxy. The proxy is also now a place where timeouts, buffer sizes and limits can break otherwise healthy requests, which later lessons cover.

## Incident: Three ports, three certificates

> **Incident:** A team exposed each app on its own public port and one certificate expired unnoticed.

```console
$ curl -I https://shop.example.com:8443
curl: (60) SSL certificate problem: certificate has expired
$ ss -ltn | grep -c LISTEN
11
```

They moved to one proxy on port 443 with automatic certificate renewal, closed the app ports and gained one access log. Expiry alerts moved from three places to one.

## Common mistakes

- Exposing backends directly as well as through the proxy
- Trusting X-Forwarded-For from the whole internet
- Running a single proxy with no standby
- Using layer 7 rules for a protocol the proxy does not understand

```quiz
Q: What is a reverse proxy?
+ A server that receives requests on behalf of backends
- A client-side filter :: No.
- A database :: No.
- A DNS record :: No.
> It is the front door for services.

Q: Which proxy type reads HTTP and routes by path?
+ Layer 7
- Layer 4 :: No.
- A forward proxy only :: No.
- A hub :: No.
> Layer 7 understands the application protocol.

Q: Why does a backend see the proxy's address?
+ The proxy opens its own connection to the backend
- DNS is broken :: No.
- TLS hides it :: No.
- The firewall rewrites it :: No.
> The original address travels in headers.

Q: Why run two proxies?
+ To avoid a single point of failure
- To double speed :: No.
- To remove TLS :: No.
- To skip logs :: No.
> One front door is a risk.
```

```cards
Reverse proxy :: A server that receives requests for backends and forwards them
Forward proxy :: A proxy used by clients for outgoing requests
Layer 7 :: Proxying that understands HTTP
TLS termination :: Ending the encrypted connection at the proxy
X-Forwarded-For :: A header carrying the original client address
```
