---
title: Prometheus and observability
summary: Metric types, PromQL patterns, scrape and alert configuration, and the RED, USE and golden-signal checklists.
module: observability
---

## What to measure

| Method | For | Signals |
|--------|-----|---------|
| RED | Request-driven services | Rate, Errors, Duration |
| USE | Resources | Utilization, Saturation, Errors |
| Golden signals | Any service | Latency, traffic, errors, saturation |

Use percentiles, not averages, for latency.

## Metric types

| Type | Behaviour | Query with |
|------|-----------|------------|
| Counter | Only increases | `rate()`, `increase()` |
| Gauge | Up and down | Direct, `avg_over_time`, `predict_linear` |
| Histogram | Bucketed observations | `histogram_quantile` over `rate` of buckets |

## PromQL patterns

```promql
# Requests per second by route
sum by (route) (rate(http_requests_total[5m]))

# Error ratio
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# p95 latency per route
histogram_quantile(0.95,
  sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))

# Targets that are down
up == 0

# Node memory used percent
100 * (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)

# Disk will fill within 4 hours
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4 * 3600) < 0

# Pod restarts in the last hour
increase(kube_pod_container_status_restarts_total[1h]) > 3

# Top 5 series by value
topk(5, sum by (pod) (rate(container_cpu_usage_seconds_total[5m])))
```

Rules of thumb:

- Never graph a raw counter; wrap it in `rate()`
- Use a `rate()` window of at least four scrape intervals
- Keep `le` when aggregating histogram buckets
- Do not average percentiles
- Avoid unbounded labels such as user IDs and raw URLs

## Scrape configuration

```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: shop-api
    metrics_path: /metrics
    static_configs:
      - targets: ["shop-api-1:8080", "shop-api-2:8080"]
```

## Recording and alert rules

```yaml
groups:
  - name: shop-api
    rules:
      - record: route:http_requests:rate5m
        expr: sum by (route) (rate(http_requests_total[5m]))
      - alert: ShopApiHighErrorRatio
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
            / sum(rate(http_requests_total[5m])) > 0.02
        for: 10m
        labels:
          severity: page
        annotations:
          summary: "Error ratio above 2% for 10 minutes"
          runbook: "https://runbooks.example.com/shop-api/high-errors"
```

## Alertmanager

```yaml
route:
  receiver: team-chat
  group_by: [alertname, service]
  group_wait: 30s
  repeat_interval: 4h
  routes:
    - matchers: ['severity="page"']
      receiver: on-call-pager
receivers:
  - name: team-chat
  - name: on-call-pager
```

```bash
amtool alert query --active
amtool silence add alertname=ShopApiHighErrorRatio --duration=2h --comment="planned work"
promtool check rules rules.yml
promtool check config prometheus.yml
```

## Alert design

1. Must a human act now?
2. Is it a symptom users feel?
3. Does the page link to a runbook?

Page on symptoms; ticket for slow-burn causes; dashboards for the rest.

## Logs and traces

| Practice | Why |
|----------|-----|
| Structured JSON logs | Fields can be queried |
| Request ID and trace ID in every line | Connects logs, metrics and traces |
| Never log secrets or personal data | Logs are widely copied |
| Tail sampling for traces | Keeps slow and failing requests |
| Log to stdout in containers | The platform collects it |

```text
{app="shop-api"} | json | level="error" | route="/checkout"
```

## Cardinality check

```bash
curl -s localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[0:5]'
```
