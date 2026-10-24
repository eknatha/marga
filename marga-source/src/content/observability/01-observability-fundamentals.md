---
title: Observability fundamentals
minutes: 13
summary: Learn the difference between monitoring and observability, the three signals of metrics, logs and traces, and the RED and USE methods for deciding what to measure.
---

A customer reports that checkout is slow. You open a dashboard full of graphs, all green. The system is "up" and yet users are suffering. Observability is the ability to ask new questions of a running system and get answers without shipping new code. It goes beyond watching a list of known failure signs.

## What you will learn

- Monitoring versus observability
- Metrics, logs and traces, and what each is good for
- The RED and USE methods
- Choosing what to measure first

## Monitoring versus observability

**Monitoring** watches for failures you anticipated: disk above 90%, process down, error rate above a threshold. **Observability** is a property of the system: it emits enough detailed data that you can investigate failures you did not anticipate. You need both. Monitoring tells you something is wrong; observability helps you find out why.

## The three signals

| Signal | What it is | Strength | Weakness |
|--------|-----------|----------|----------|
| **Metrics** | Numbers sampled over time (requests per second, CPU) | Cheap, fast to query, ideal for alerts and trends | Aggregated, so individual requests are invisible |
| **Logs** | Timestamped records of events | Detailed context for a single event | Expensive at volume, harder to aggregate |
| **Traces** | The path of one request through many services, with timing for each step | Shows where time is spent and which dependency failed | Needs instrumentation across services |

They work together. A metric alert fires on high latency; a trace shows the slow call is to the payment service; the log lines from that service for the same request ID show a timeout to its database.

> **Tip:** Put a **request ID** in every log line and pass it between services. It is the cheapest way to connect the three signals.

## What to measure: RED and USE

Two checklists save you from guessing.

**RED** is for request-driven services (APIs, web apps):

| Letter | Measure |
|--------|---------|
| **R**ate | Requests per second |
| **E**rrors | Failed requests per second, or the error ratio |
| **D**uration | How long requests take, as percentiles (p50, p95, p99) |

**USE** is for resources (CPUs, disks, network interfaces, queues):

| Letter | Measure |
|--------|---------|
| **U**tilization | How busy the resource is |
| **S**aturation | How much work is waiting (queue length, load) |
| **E**rrors | Error counts (disk errors, dropped packets) |

Use **percentiles, not averages**, for latency. An average of 200 ms can hide that 1% of requests take 8 seconds. The slowest users are often your most valuable ones, because they do the most.

## The golden signals

Google's SRE book names four signals that fit nearly any service: latency, traffic, errors and saturation. They are RED plus saturation, and they make a good first dashboard for anything you run.

## Instrumentation and standards

OpenTelemetry is the vendor-neutral standard for generating metrics, logs and traces from applications. Instrument once with it and send the data to whichever backend you choose, such as Prometheus for metrics, a log store, and a tracing system. This avoids rewriting application code if you change tools.

## Incident: all green, users unhappy

> **Incident:** Customers complain about slow pages. The dashboard shows CPU at 30%, memory fine, and an average response time of 180 ms.

The dashboard tracked resource use and an average, so it missed the problem. Re-ask the question with percentiles:

```promql
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
```

This sample query shows the 99th percentile per route. The `/checkout` route is at 6.4 seconds while others are under 300 ms. A trace of one slow checkout request shows 6 seconds spent waiting on a single call to the inventory service, whose database connection pool is exhausted. None of that was visible in averages or CPU. The fix belongs to that service (pool size and a timeout), and the observability fix is to add per-route latency percentiles and a saturation metric for connection pools to the standard dashboard so the next such case is visible in a minute.

## Common mistakes

- Alerting on causes (CPU high) instead of symptoms users feel
- Using averages for latency
- Logging everything with no structure, so nothing can be queried
- Dashboards with 40 graphs and no clear question they answer

```quiz
Q: Which signal is best for knowing where time was spent across several services for one request?
- Metrics
- Logs
+ Traces
- Dashboards
> A trace follows one request through services with timing for each step.

Q: What do the letters in RED stand for?
- Reliability, Errors, Downtime
+ Rate, Errors, Duration
- Requests, Events, Delays
- Response, Efficiency, Demand
> RED measures request-driven services.

Q: Why use p99 latency rather than the average?
- It is easier to compute
+ Averages hide slow requests affecting a small share of users
- Percentiles are always smaller
- Averages cannot be stored
> The tail of the distribution is where users often hurt.

Q: What is the cheapest way to connect logs, metrics and traces?
- Larger disks
+ A request ID included in every log line and passed between services
- More dashboards
- Longer retention
> A shared identifier lets you pivot between signals.
```

```cards
Monitoring vs observability? :: Monitoring watches for known failures; observability lets you investigate unknown ones
RED method? :: Rate, Errors, Duration for request-driven services
USE method? :: Utilization, Saturation, Errors for resources
Four golden signals? :: Latency, traffic, errors, saturation
```
