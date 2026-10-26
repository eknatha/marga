---
title: RED, USE and the golden signals in practice
minutes: 13
summary: Pick the right small set of metrics for every service and resource using the RED method, the USE method and the four golden signals, and build dashboards that answer questions fast.
---

A dashboard with eighty graphs tells you nothing during an incident. Experienced teams start with a short, standard set of signals for every service, so that anyone can open any dashboard and know where to look. Three frameworks give you that set. They look similar, but each fits a different kind of thing.

## What you will learn

- The RED method for request-driven services
- The USE method for resources
- Google's four golden signals
- Writing the queries and choosing percentiles
- Dashboard layout for fast diagnosis

## RED: for services

For every service that handles requests, track:

- **Rate:** requests per second
- **Errors:** failed requests per second, or the error ratio
- **Duration:** how long requests take, as percentiles (p50, p95, p99), never only the average

```promql
sum(rate(http_requests_total{service="checkout"}[5m]))
sum(rate(http_requests_total{service="checkout",status=~"5.."}[5m]))
  / sum(rate(http_requests_total{service="checkout"}[5m]))
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{service="checkout"}[5m])))
```

## USE: for resources

For every resource (CPU, memory, disks, network links, connection pools, queues), track:

- **Utilisation:** the share of time or capacity in use
- **Saturation:** extra work waiting (run queue length, swap, queue depth)
- **Errors:** error counts (disk errors, dropped packets)

Saturation is the signal people forget: a disk may be 60 percent utilised and yet have a long queue; a thread pool may be fine on average yet have requests waiting for a free thread.

## The four golden signals

The SRE book's version combines both: **latency** (separate successful from failed requests, since fast errors hide slow problems), **traffic**, **errors**, and **saturation**. If you can only monitor four things about a user-facing system, monitor these.

| Framework | Applies to | Core question |
|-----------|-----------|---------------|
| RED | Services | Are users getting fast, correct answers? |
| USE | Resources | Is something running out? |
| Golden signals | Whole systems | Is the system healthy and how close to its limit? |

## Percentiles, not averages

If 1 percent of requests take ten seconds, the average barely moves but one user in a hundred has a bad experience, and with many requests per page, most users will meet a slow one. Use histograms to compute percentiles, and be careful: you cannot average percentiles across instances. Aggregate the histogram buckets first, then take the quantile.

## A dashboard that works

Put the user-facing view at the top: RED for the service, with the objective line drawn. Below it, the dependencies (RED for each downstream service), then resources (USE) for the hosts or Pods. Add deploy markers and annotations so changes line up with the graphs. Link each panel to the underlying query, logs and traces. The same layout for every service means an on-call person who has never seen this service can still find the problem.

```predict
Q: A queue shows 30 percent utilisation but messages wait ten minutes. Which signal reveals the problem?
???
Saturation: queue depth and waiting time, not utilisation.
> USE exists because utilisation alone hides queues.
```

## Incident: the green dashboard and the slow checkout

> **Incident:** Customers complain about slow checkout while the dashboard shows CPU at 35 percent and average latency of 220 ms.

```promql
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket{service="checkout"}[5m])))
```

The p99 was 9 seconds. The service's database connection pool was saturated: requests waited for a free connection, but CPU stayed low and the average hid the tail. The team added p95/p99 panels, a pool saturation panel (in-use versus size and wait time), and an alert on p99 against the SLO.

## Common mistakes

- Averages for latency
- Only utilisation, no saturation
- Averaging percentiles across instances
- Different dashboard layouts for each service

```quiz
Q: What do the letters in RED stand for?
- Reads, Errors, Disk :: Not the method.
+ Rate, Errors, Duration
- Requests, Events, Delays :: Not the method.
- Restart, Error, Deploy :: Not the method.
> RED describes request-driven services.

Q: Which signal does the USE method add that people often forget?
- Colour :: Unrelated.
+ Saturation
- Cost :: Unrelated.
- Version :: Unrelated.
> Queues and waiting work show saturation.

Q: Why use percentiles for latency?
+ Averages hide the slow tail that real users feel
- They are smaller numbers :: Not the point.
- They need no storage :: Unrelated.
- They avoid histograms :: They use histograms.
> The p99 shows the worst common experience.

Q: How do you compute a fleet-wide p99 correctly?
- Average the p99 of each instance :: This is wrong.
+ Sum the histogram buckets across instances, then compute the quantile
- Take the maximum average :: Wrong.
- Use only one instance :: Not fleet-wide.
> Aggregate buckets first.
```

```cards
RED? :: Rate, Errors, Duration
USE? :: Utilisation, Saturation, Errors
Four golden signals? :: Latency, traffic, errors, saturation
Why not average latency? :: It hides the slow tail
Where does saturation show? :: Queues, waits, run queue length
```
