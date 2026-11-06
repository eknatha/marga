---
title: Load balancing: algorithms and health checks
minutes: 13
summary: Spread traffic across backends with round robin, least connections and hashing, and remove failed backends using passive and active health checks.
---

Spreading requests is easy. Doing it well means choosing a method that fits your traffic and, more importantly, knowing when a backend is sick and taking it out of rotation quickly and safely.

## What you will learn

- Round robin, weighted, least connections and hashing
- Session stickiness and when to avoid it
- Passive and active health checks
- Draining, slow start and retries

## Algorithms

```nginx
upstream app_backend {
    least_conn;
    server 10.0.1.11:8080 weight=2 max_fails=3 fail_timeout=15s;
    server 10.0.1.12:8080;
    server 10.0.1.13:8080 backup;
}
```

| Method | Good for |
|---|---|
| Round robin | Equal servers and short, similar requests |
| Weighted | Servers of different size |
| Least connections | Long or uneven requests |
| Hash on a key (`hash $request_uri consistent`) | Caches, where the same key should reach the same server |
| `ip_hash` | Simple stickiness by client address |

## Stickiness

Sending a user to the same backend helps when sessions live in server memory, but it spreads load unevenly and a failed server loses its users' sessions. Prefer to keep session data in a shared store and balance freely.

## Health checks

**Passive** checks watch real traffic: after `max_fails` errors within a time, the server is skipped for `fail_timeout`. **Active** checks (HAProxy's `check`, nginx Plus or an external checker) probe an endpoint such as `/healthz` on a schedule. A good health endpoint checks the things the service needs (database, queue) but is cheap and does not fail because of a slow optional dependency.

```diagram
title: Balancing with health checks
node: lb | Load balancer | 0 | 0 | Chooses a backend using the algorithm. | A bad algorithm for the traffic loads one server heavily.
node: a | Backend A | 1 | 0 | Healthy and in rotation. | If it fails, passive checks find out only after users see errors.
node: b | Backend B | 1 | 1 | Hung but listening; its health check fails. | A port-only check keeps sending it traffic.
node: hc | Health check | 2 | 0 | Probes a health endpoint on a schedule. | A shallow check says healthy when the service is broken. | observe
node: drain | Drain | 2 | 1 | Stops new requests, lets current ones finish. | Killing a server mid-request drops user requests.
edge: lb | a
edge: lb | b
edge: hc | b
edge: lb | drain
```

## Changing servers safely

Before updating a backend, **drain** it: stop new requests and wait for current ones to finish. When adding a server, **slow start** ramps its share up so a cold cache does not get a full load at once. Limit retries to idempotent requests so a retry does not charge a card twice.

## Incident: One in four requests failed

> **Incident:** A hung backend kept passing a TCP check and received a quarter of the traffic.

```console
$ for i in $(seq 20); do curl -s -o /dev/null -m 3 -w '%{http_code} ' https://lb.example.com/api; done
200 200 504 200 200 200 504 200 200 504 200 200 ...
backend B: tcp check ok, /healthz timeout
```

The load balancer only checked that port 8080 accepted a connection. Switching to an HTTP check of /healthz removed the hung server within seconds, and an alert now fires when any backend leaves rotation.

## Common mistakes

- Health checks that only test the TCP port
- Sticky sessions to hide state kept in memory
- Retrying non-idempotent requests
- Removing a server without draining it

```quiz
Q: Which method suits long, uneven requests?
+ Least connections
- Round robin :: No.
- Random with no checks :: No.
- A fixed single server :: No.
> It balances by active load.

Q: What does a passive health check use?
+ Real traffic errors
- A scheduled probe :: No.
- A DNS query :: No.
- A certificate :: No.
> It reacts to failures that users cause.

Q: What is draining?
+ Finishing current requests before removing a server
- Deleting logs :: No.
- Restarting DNS :: No.
- Adding a server :: No.
> It avoids dropped requests.

Q: Why avoid retries for non-idempotent requests?
+ A retry could repeat the action
- Retries are slow :: No.
- They disable TLS :: No.
- They fill the cache :: No.
> A duplicate POST can charge twice.
```

```cards
Upstream :: A group of backend servers behind a proxy
Least connections :: Send to the server with the fewest active requests
Active health check :: A scheduled probe of a backend
Draining :: Letting existing requests finish before removing a server
Sticky session :: Sending a user to the same backend each time
```
