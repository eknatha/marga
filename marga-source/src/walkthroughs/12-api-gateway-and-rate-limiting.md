# An API gateway with authentication and rate limits
level: Intermediate
modules: networking, security, sre
lessons: networking/http-and-tls, security/application-security-for-devops, sre/reliability-patterns
summary: How a gateway sits in front of many backend services to handle TLS, authentication, rate limits and routing, and what happens when it fails.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Give clients one entry point to many services
- Authenticate callers and apply limits fairly
- Protect backends from overload and abuse
- Add visibility without slowing every call

## The big picture

```diagram
title: API gateway reference design
node: client | API clients | 0 | 1 | Apps and partners that call the API with a key or token. | One misbehaving client can ruin it for all.
node: waf | Edge protection | 1 | 1 | Blocks known bad traffic and floods before the gateway. | Rules that are too strict block real customers.
node: gw | API gateway | 2 | 1 | Terminates TLS, checks identity, enforces limits and routes. | Every request passes here, so it is a single point of failure.
node: auth | Identity service | 2 | 0 | Issues and validates tokens and keys. | If it is down, nobody can log in or call the API.
node: limit | Rate-limit counters | 3 | 0 | A fast shared store counting requests per client. | A slow counter store slows every request.
node: svc | Backend services | 3 | 1 | Do the real work behind the gateway. | Services that trust the network let anything inside through.
node: log | Logs and metrics | 4 | 1 | Record each call with client, route, status and time. | Missing client identity makes abuse hard to trace.
node: dev | Developer portal | 1 | 2 | Documents the API and issues keys. | Out-of-date docs create support load.
edge: client | waf
edge: waf | gw
edge: gw | auth
edge: gw | limit
edge: gw | svc
edge: gw | log
edge: dev | auth
```

## One API call, step by step

1. A client sends an HTTPS request with a token. The edge layer drops obvious attacks and passes the rest.
2. The gateway terminates TLS and validates the token, either by checking its signature locally or by asking the identity service.
3. The gateway reads the client's plan and checks the rate-limit counter. If the client is over its limit it answers 429 with a Retry-After header.
4. It routes the request to the right backend based on path and version, adds a request identifier and sets a timeout.
5. The backend answers. The gateway records the call and returns the response.
6. If the backend is slow or failing, the gateway stops sending it traffic for a short time (circuit breaker) and returns a clear error.

## Why the design looks like this

- **One front door** means TLS, authentication and logging are done once and consistently.
- **Local token validation** is fast and does not depend on the identity service for every call.
- **Per-client limits** protect everyone from one noisy client. Limits that depend on the plan make the rules fair.
- **Timeouts and circuit breakers** stop a slow backend from tying up the gateway.
- A **request identifier** passed to every hop lets you follow one call through many services.

## Scaling decisions

1. Start with one gateway pair behind a load balancer and simple fixed limits.
2. Add per-plan limits and a burst allowance once real customers use the API.
3. Put counters in a shared fast store so all gateway instances see the same totals.
4. Add caching for safe read requests.
5. Split gateways by audience (public, partner, internal) when their needs differ.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Gateway outage | Every API call fails | Several instances across zones, health checks, tested rollback |
| Counter store slow or down | All requests slow down or are all blocked | Fail open or closed by design, local fallback limits, short timeouts |
| Expired signing key | Valid tokens are rejected | Key rotation with overlap, alerts on validation failures |
| Retry storm from clients | A small error grows into overload | Retry-After, backoff guidance, limits on retries |
| Shared limit for NAT users | Many users behind one address are blocked together | Limit by token or key, not only by address |
| Backend trusts the gateway blindly | A direct call bypasses all checks | Backends verify identity too, network rules allow only the gateway |

## Trade-offs

- A central gateway is easy to govern but can become a bottleneck for change. Keep its logic small and put business rules in services.
- Failing open keeps the service up when the limiter breaks but allows abuse. Failing closed is safe but causes an outage. Choose per route.
- Strict limits protect backends and annoy customers. Burst allowances and clear error messages soften that.

```predict
Q: The rate-limit store becomes slow. Should the gateway block everything or let everything through, and what is the better design?
???
Neither extreme. Use a short timeout on the counter, then fall back to a rough local limit per instance, and alert. That keeps most protection without making the limiter a cause of outages.
> A protection layer must not be a new way to fail.
```
