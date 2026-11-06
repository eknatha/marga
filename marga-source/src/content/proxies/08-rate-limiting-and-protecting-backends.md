---
title: Rate limiting and protecting backends
minutes: 13
summary: Limit request and connection rates at the proxy, return correct status codes and protect backends from bursts and abusive clients.
---

Backends rarely fail from steady load; they fail from bursts and bugs. The proxy is the cheapest place to cap them, before a request costs a database query. A good limit is fair, visible and kind to well-behaved clients.

## What you will learn

- How the leaky bucket, burst and nodelay work
- Choosing the key: address, API key or token
- Returning 429 and Retry-After
- Limiting connections, body size and slow clients

## A request limit

```nginx
limit_req_zone $binary_remote_addr zone=perip:10m rate=10r/s;
limit_req_status 429;

location /api/ {
    limit_req zone=perip burst=20 nodelay;
    proxy_pass http://app_backend;
}
```

`rate=10r/s` fills the bucket at ten requests a second. `burst=20` lets a client go 20 requests over the rate before being refused; `nodelay` serves the burst immediately instead of spacing it out. Requests beyond are refused with 429.

## Who is counted

The key decides fairness. `$binary_remote_addr` counts per client address, which is wrong behind a CDN or NAT (many users, one address, or the CDN's address for everyone). Behind a CDN use the real-client header, validated from trusted proxies only. For APIs, key on an API key or token (`$http_x_api_key`) so each customer has a budget.

## Other limits

```nginx
limit_conn_zone $binary_remote_addr zone=conn:10m;
limit_conn conn 20;           # at most 20 parallel connections per client
client_max_body_size 5m;      # large uploads rejected with 413
client_body_timeout 10s;      # slow uploads closed
```

Tell clients what happened: `429 Too Many Requests` with a `Retry-After` header lets well-written clients back off. Exempt health checks and internal addresses so monitoring does not get limited.

```diagram
title: Where limits protect the backend
node: client | Clients | 0 | 0 | Real users and the occasional buggy or abusive one. | One client in a retry loop can look like an attack.
node: limit | Rate limit | 1 | 0 | Counts per key and refuses with 429 above the budget. | The wrong key limits innocent users sharing an address. | security
node: conn | Connection and body caps | 2 | 0 | Cap parallel connections, upload size and slow senders. | Without them, slow clients tie up workers.
node: app | Backend | 3 | 0 | Sees only the traffic the proxy lets through. | Unprotected, a burst reaches the database.
node: mon | Metrics | 1 | 1 | Count 429s per key and alert on spikes. | Silent limits hide a client bug or an attack. | observe
edge: client | limit
edge: limit | conn
edge: conn | app
edge: limit | mon
```

## Incident: The retry loop

> **Incident:** A new app version retried failures instantly and flooded the API.

```console
access.log: 5200 req/s, 3900 distinct clients
upstream: 502 rate 41 percent
db: connections 100/100
```

The bug amplified every failure into more requests. A per-client limit with burst, 429 with Retry-After, and exponential backoff in the app stopped the loop and let the API recover.

## Common mistakes

- Limiting by address behind a CDN where every request has the CDN's address
- Rate limits with no metrics or alerts
- Limiting health checks and monitors
- No Retry-After so clients retry at once

```quiz
Q: What does burst allow?
+ A short overshoot above the rate
- A larger body :: No.
- A longer timeout :: No.
- A second certificate :: No.
> It absorbs short spikes.

Q: Which status do you return for rate limiting?
+ 429
- 404 :: No.
- 500 :: No.
- 301 :: No.
> 429 means too many requests.

Q: Why is address-based limiting wrong behind a CDN?
+ All users may share the CDN's address
- The CDN blocks it :: No.
- TLS hides it :: No.
- DNS caches it :: No.
> Use the real client address from a trusted header.

Q: What does limit_conn control?
+ Parallel connections per key
- Request rate :: No.
- Cache size :: No.
- Certificate life :: No.
> It caps concurrent connections.
```

```cards
Rate limit :: A cap on requests per time for a key
Burst :: Extra requests allowed above the steady rate
429 :: HTTP status for too many requests
Retry-After :: A header telling the client when to try again
Key :: What a limiter counts per, such as address or API key
```
