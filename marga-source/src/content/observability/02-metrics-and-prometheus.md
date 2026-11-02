---
title: Metrics and Prometheus
minutes: 17
summary: Understand the Prometheus data model, scrape configuration and the PromQL queries you will use daily, including rates, aggregation and histograms.
---

Prometheus is the most widely used open source system for metrics, and its query language, PromQL, is a skill that transfers to many other tools. The model is simple: it **pulls** numeric time series from your services at a regular interval, stores them, and lets you query them.

## What you will learn

- Metric types and labels
- Scrape configuration
- Essential PromQL: rate, sum by, histogram_quantile
- Cardinality, the way Prometheus gets expensive

## Metric types

| Type | Behaviour | Example |
|------|-----------|---------|
| **Counter** | Only goes up (resets on restart) | `http_requests_total` |
| **Gauge** | Goes up and down | `memory_usage_bytes`, `queue_length` |
| **Histogram** | Counts observations in buckets, so you can compute percentiles | `http_request_duration_seconds_bucket` |
| **Summary** | Pre-computed quantiles in the client | Less used; cannot be aggregated across instances |

Each series is identified by a metric name plus **labels**:

```text
http_requests_total{service="shop-api", route="/checkout", status="500"} 1027
```

Labels make a metric slice-able: by service, route, status. A metric exposed by an application appears on an HTTP endpoint (conventionally `/metrics`) in a simple text format.

## Scraping

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: shop-api
    metrics_path: /metrics
    static_configs:
      - targets: ["shop-api-1:8080", "shop-api-2:8080"]

  - job_name: node
    static_configs:
      - targets: ["node-1:9100", "node-2:9100"]
```

In Kubernetes you normally use **service discovery** so Prometheus finds Pods automatically, usually through an operator that adds `ServiceMonitor` objects. Every scraped target gets an automatic `up` metric: `1` if the last scrape worked, `0` if not. Alert on `up == 0`.

## PromQL you will use constantly

```promql
# Requests per second, per route, averaged over the last 5 minutes
sum by (route) (rate(http_requests_total[5m]))

# Error ratio: share of requests that are 5xx
sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
sum(rate(http_requests_total[5m]))

# 95th percentile latency per route
histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))

# Memory used per node as a percentage
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# Disk predicted to fill within 4 hours
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4 * 3600) < 0
```

Key rules:

- **Never graph a raw counter.** Wrap it in `rate()` (per-second increase) or `increase()` (total over the range). A raw counter only climbs.
- Choose a `rate()` window of **at least four times the scrape interval** (so 1m for 15s scrapes, and 5m is a common default).
- `sum by (label)` keeps only the labels you name; `without (label)` removes the ones you name.
- `histogram_quantile` needs the `le` label preserved in the aggregation.
- Average percentiles are meaningless. Aggregate the buckets first, then compute the quantile.

## Recording rules

Expensive queries that you use often can be precomputed:

```yaml
groups:
  - name: shop-api.rules
    rules:
      - record: route:http_requests:rate5m
        expr: sum by (route) (rate(http_requests_total[5m]))
```

Name them `level:metric:operation`, and dashboards and alerts become fast and consistent.

## Cardinality

Each unique combination of label values is a separate time series. Labels with unbounded values, such as `user_id`, `email` or a full URL with IDs, create millions of series and can exhaust memory.

> **Warning:** Never use user IDs, request IDs, IP addresses or raw URLs as metric labels. Those belong in logs and traces. Label values should come from a small, known set.

## Incident: Prometheus runs out of memory

> **Incident:** Prometheus restarts repeatedly with out-of-memory kills, and its dashboards have gaps.

Find what is generating the series:

```promql
topk(10, count by (__name__) ({__name__=~".+"}))
```

```console
$ curl -s localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[0:3]'
[
  { "name": "http_requests_total", "value": 4812377 },
  ...
]
```

Nearly five million series come from `http_requests_total`. A recent release added a `path` label containing the raw URL, including order numbers (`/orders/48213`). Every order created a new series. Remove the label (or normalise it to the route template `/orders/:id`) in the application, drop the label at scrape time with `metric_relabel_configs` as a stop-gap, and restart. Add an alert on `prometheus_tsdb_head_series` growth and a review check for new labels, because the problem arrived with a code change and will return with another.

## Predict the query

```predict
Q: A counter http_requests_total grows by 600 in one minute at a steady rate. What does rate(http_requests_total[1m]) return?
???
About 10 requests per second.
> rate gives the per-second average over the window. 600 divided by 60 is 10.
```

```predict
Q: An application restarts and its request counter drops back to zero. Does rate() report a large negative value?
???
No. Prometheus detects the reset and rate stays correct.
> Prometheus detects the drop and treats it as a reset, so the rate does not go negative.
```

## Common mistakes

- Graphing raw counters
- Averaging percentiles across instances
- High-cardinality labels
- A `rate()` window shorter than two scrapes
- Not alerting on `up == 0`, so a dead target silently stops reporting

```quiz
Q: Which metric type should you wrap in rate() to see requests per second?
- Gauge
+ Counter
- Label
- Alert
> Counters only increase; rate() converts the increase into a per-second value.

Q: Why is a label like user_id dangerous on a metric?
- It breaks PromQL syntax
+ Each distinct value creates a new time series, causing memory exhaustion
- Labels cannot contain numbers
- It slows scraping to one second
> Cardinality is the number of unique series; unbounded labels explode it.

Q: What does the up metric show?
- CPU load
+ Whether the last scrape of the target succeeded
- Uptime in seconds
- The Prometheus version
> up is 1 on a successful scrape and 0 on failure.

Q: To compute a p95 across many instances, what should you do?
- Average each instance's p95
+ Sum the bucket rates by le first, then apply histogram_quantile
- Use the gauge type
- Take the maximum of the averages
> Quantiles cannot be averaged; aggregate the histogram buckets then compute the quantile.
```

```cards
Counter vs gauge? :: A counter only increases (use rate); a gauge goes up and down
What is cardinality? :: The number of unique label combinations, i.e. distinct time series
Recommended rate() window? :: At least four times the scrape interval, commonly 5m
What does histogram_quantile need preserved? :: The le label in the aggregation
```
