---
title: Debugging 502, 504 and other proxy problems
minutes: 14
summary: Diagnose proxy errors in a fixed order using status codes, error logs, upstream timing and direct requests to the backend.
---

Proxy errors feel mysterious because the user, the proxy and the backend each see a different failure. A short method separates them: look at what the proxy logged, repeat the request directly to the backend, and compare.

## What you will learn

- What 502, 503, 504 and 499 each point to
- Logging upstream status and timing
- Repeating the request around the proxy
- Common causes: DNS, ports, timeouts, buffers, limits

## Read the status code

| Code | Meaning | First place to look |
|---|---|---|
| 400 / 413 / 431 | Bad request, body or headers too large | Proxy limits, `client_max_body_size`, header buffers |
| 499 | Client closed the connection | Client timeouts, slow responses |
| 502 | Bad gateway: no valid reply from upstream | Is the backend up, right port, crash, wrong protocol |
| 503 | No upstream available, or overload | Health checks, rate limits, backend capacity |
| 504 | Gateway timeout | Slow backend, timeout settings |

## Log what matters

```nginx
log_format main '$remote_addr "$request" $status '
                'rt=$request_time urt=$upstream_response_time us=$upstream_status ua=$upstream_addr';
access_log /var/log/nginx/access.log main;
```

`urt` is the backend's time, `rt` the total. If `rt` is high but `urt` is low the delay is the client or the proxy; if both are high the backend is slow. `ua` names which server answered.

## Go around the proxy

```console
$ curl -s -o /dev/null -w '%{http_code} %{time_total}\n' http://10.0.1.11:8080/healthz
200 0.004
$ curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://shop.example.com/api/orders
502 0.002
$ tail -2 /var/log/nginx/error.log
connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://10.0.1.12:8080/api/orders"
```

If the direct request works and the proxied one fails, compare ports, hostnames, protocol (http versus https), headers and the upstream address in the error log. A fast 502 usually means connection refused; a slow 504 means the upstream was reached but did not answer.

## Frequent causes

- **Stale DNS:** nginx resolves upstream hostnames at startup. Use a resolver and a variable in proxy_pass, or reload after changes.
- **Wrong scheme or port:** speaking HTTP to an HTTPS backend gives 502 with an SSL error in the log.
- **Backend crash or restart loop:** check its logs and restart count.
- **Header too large:** big cookies cause 400 or 502; raise `large_client_header_buffers` or shrink the cookie.
- **Limits:** file descriptors, worker connections or backend pool exhausted.

```diagram
title: Narrowing a proxy error
node: user | Status seen by the user | 0 | 0 | 502, 503, 504, 499 or 4xx tells which side to suspect. | The same page can be a different cause each time.
node: plog | Proxy logs | 1 | 0 | error.log reason and access.log upstream status and timing. | Missing upstream fields leave you guessing. | observe
node: direct | Request the backend directly | 2 | 0 | Bypass the proxy to test the backend alone. | A direct test from another network may behave differently.
node: cause | Cause | 3 | 0 | DNS, port, protocol, timeout, header size or capacity. | Changing several settings hides which one mattered.
node: fix | Fix and verify | 3 | 1 | Change one thing and repeat the same request. | Without a repeat test the fix is only a guess.
edge: user | plog
edge: plog | direct
edge: direct | cause
edge: cause | fix
```

## Incident: The 502 that appeared after a failover

> **Incident:** A database failover moved a backend to a new IP, and the proxy kept sending to the old address.

```console
error.log: connect() failed (113: No route to host) while connecting to upstream, upstream: "http://10.0.1.12:8080/"
$ dig +short app.internal
10.0.1.30
```

nginx had resolved the name once at startup. A reload fixed it at once, and the long-term fix was to use a resolver with a short valid time and a variable in proxy_pass so the name is looked up again.

## Common mistakes

- Debugging from the browser instead of the proxy log
- Not logging upstream status and timing
- Changing timeouts before knowing which side is slow
- Forgetting that nginx caches upstream DNS names

```quiz
Q: What does a fast 502 with "Connection refused" suggest?
+ Nothing listens on the upstream port
- The upstream is slow :: No.
- TLS expired :: No.
- The client left :: No.
> Refused means no listener.

Q: What does 504 point to?
+ The upstream was reached but too slow
- A closed port :: No.
- A bad certificate :: No.
- A DNS typo :: No.
> Gateway timeout is a slow upstream.

Q: What does status 499 in nginx logs mean?
+ The client closed the connection
- The backend crashed :: No.
- The cache is full :: No.
- The config is wrong :: No.
> It is an nginx-specific client-closed code.

Q: Why log $upstream_response_time?
+ To separate backend time from total time
- To hide errors :: No.
- To encrypt logs :: No.
- To limit rate :: No.
> It shows who is slow.
```

```cards
502 Bad Gateway :: The proxy got no valid response from the upstream
504 Gateway Timeout :: The upstream did not respond in time
$upstream_response_time :: nginx variable with the backend's response time
499 :: nginx status for a client that closed the connection
Resolver :: The DNS server nginx uses to resolve upstream names at run time
```
