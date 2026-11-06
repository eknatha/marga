---
title: Timeouts, retries, keepalive and connection limits
minutes: 13
summary: Set proxy timeouts that match real behaviour, tune keepalive, and understand how retries and limits cause or prevent outages.
---

Most proxy outages are not crashes but timers: a read timeout shorter than a slow query, a retry storm against a struggling backend, or a keepalive that exhausts connections. Learning the timers and how they combine is the quickest way to stop guessing.

## What you will learn

- The timeouts on each leg of a request
- Keepalive to backends and to clients
- Retries and why they can make things worse
- Connection and file-descriptor limits

## The timers

```nginx
proxy_connect_timeout 3s;     # time to open a connection to the backend
proxy_send_timeout    30s;    # gap between writes to the backend
proxy_read_timeout    30s;    # gap between reads from the backend
keepalive_timeout     65s;    # idle client connection
client_body_timeout   15s;    # slow upload protection
```

`proxy_read_timeout` is not the total time of a request; it is the maximum gap between two reads. A backend that sends nothing for 30 seconds is cut off even if the whole answer would have arrived at 31.

## Keepalive

Opening a new TCP (and TLS) connection per request is wasteful. Reuse backend connections:

```nginx
upstream app_backend { server 10.0.1.11:8080; keepalive 32; }
location / { proxy_pass http://app_backend; proxy_http_version 1.1; proxy_set_header Connection ""; }
```

## Retries

`proxy_next_upstream error timeout;` retries another server on those failures. Every retry multiplies load: with 3 attempts, a struggling cluster sees up to three times the requests exactly when it can least cope. Keep retries few, limit them to safe methods and add a total time budget (`proxy_next_upstream_timeout`).

```diagram
title: Timeouts must nest
node: user | User or client | 0 | 0 | Waits up to its own timeout, for example 60 seconds. | If it times out first, the proxy keeps working for nobody.
node: proxy | Proxy | 1 | 0 | Has connect and read timeouts, for example 3 and 30 seconds. | A read timeout below the real response time cuts good requests.
node: app | Application | 2 | 0 | Calls a database with a 5 second timeout. | No timeout means a stuck thread holds a connection forever.
node: db | Database | 3 | 0 | Answers or fails within its own limit. | A slow query at the bottom becomes a 504 at the top. | store
node: retry | Retries | 1 | 1 | Send a failed request to another backend. | Unbounded retries turn a slowdown into an outage.
edge: user | proxy
edge: proxy | app
edge: app | db
edge: proxy | retry
```

## Limits

Each connection uses a file descriptor. `worker_connections` times the number of workers caps concurrency, and each proxied request uses two connections (client and backend). Raise `worker_rlimit_nofile` and the OS limit together, and watch for "worker_connections are not enough" in the error log.

## Incident: The report that always timed out

> **Incident:** A report endpoint finished in 70 seconds but users always got a 504.

```console
$ curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://shop.example.com/reports/monthly
504 60.003
error.log: upstream timed out (110: Connection timed out) while reading response header from upstream
```

The proxy gave up at 60 seconds while the app was still working. A longer timeout would hide a design problem, so the team made the report asynchronous: a request creates a job and the page polls for the result.

## Common mistakes

- Treating read timeout as the whole request time
- Setting the proxy timeout higher than the user's
- Retrying without a limit or a budget
- Raising worker_connections without raising the OS file limit

```quiz
Q: What does proxy_read_timeout measure?
+ The gap between two reads from the backend
- The whole request time :: No.
- TLS time :: No.
- DNS time :: No.
> It is per read, not total.

Q: Why can retries cause outages?
+ They multiply load on a struggling backend
- They disable health checks :: No.
- They break TLS :: No.
- They fill the log :: No.
> Extra attempts add traffic.

Q: What does keepalive to the backend save?
+ New connection setup for every request
- Disk :: No.
- DNS records :: No.
- Certificates :: No.
> Connections are reused.

Q: What should timeouts do as you go up the stack?
+ Grow, so callers wait longer than services they call
- Shrink :: No.
- Stay at zero :: No.
- Be random :: No.
> An outer timeout must exceed inner ones.
```

```cards
Read timeout :: Maximum silence while waiting for the backend
Keepalive :: Reusing a connection for several requests
Retry budget :: A cap on how much retrying is allowed
Gateway Timeout :: HTTP 504, the upstream did not answer in time
worker_connections :: Maximum connections each nginx worker can hold
```
