---
title: Telemetry cost, cardinality and retention
minutes: 13
summary: Keep monitoring affordable and fast by controlling metric cardinality, log volume, trace sampling and retention, and by tracking the cost of observability as a budget.
---

Observability data grows faster than the systems it describes. Without control, the monitoring bill rivals the infrastructure bill, dashboards time out, and teams start turning things off, usually the wrong things. Good teams treat telemetry as a product with a budget, owners and design rules.

## What you will learn

- Why metric cardinality is the main cost driver
- Finding and fixing high-cardinality labels
- Log volume control: levels, sampling, drop rules and tiering
- Trace sampling strategies
- Retention, downsampling and cost attribution

## Cardinality

Each unique combination of label values creates a separate time series. A metric with labels `service` (50 values), `endpoint` (40), `status` (10) and `region` (5) can create 100,000 series. Add a `user_id` label with a million values and you create billions. Memory, query time and cost grow with series count, not with samples.

Rules:

- Allowed labels have a small, bounded set of values: service, region, status class, method.
- Never put unbounded values in labels: user ids, request ids, email addresses, full URLs with ids, timestamps.
- Normalise paths: `/users/{id}`, not `/users/12345`.
- Put unique details in logs and traces, which are designed for them.

```promql
topk(10, count by (__name__) ({__name__=~".+"}))          # which metrics have the most series
count(count by (endpoint) (http_requests_total))          # how many endpoint values exist
```

Most systems also provide a cardinality explorer, and a way to limit series per target at scrape time.

## Logs

Logs are usually the largest volume. Ways to control them:

- Keep the default level at info; debug only temporarily, per service.
- Do not log inside tight loops or full request bodies.
- Drop known noise (health check requests) in the collector.
- Sample repetitive messages, keeping the first and a count.
- Tier storage: recent logs on fast storage for a week or two, older logs on cheap object storage, searchable on demand.
- Mask secrets and personal data before storage; this is a security rule and a cost rule.

## Traces

Tracing every request in a busy system is expensive. **Head sampling** decides at the start (for example keep 5 percent) and is cheap but may miss the rare slow or failed request. **Tail sampling** decides after the trace is complete in a collector, keeping all errors and all slow traces and a small sample of the rest, but it needs the collector to hold traces in memory for a time.

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - { name: errors,  type: status_code, status_code: { status_codes: [ERROR] } }
      - { name: slow,    type: latency,     latency: { threshold_ms: 1000 } }
      - { name: sample,  type: probabilistic, probabilistic: { sampling_percentage: 5 } }
```

## Retention and downsampling

Keep raw metrics at full resolution for days or weeks, then downsample (for example to five-minute averages) for months, because old data is read for trends, not detail. Decide retention per data type from real needs: incident analysis, capacity planning, audits and legal rules.

## Cost as a managed budget

Attribute volume and cost to teams (by label or by index), show them their usage, and set alerts on growth. Review the top ten series, log sources and trace producers each month. A sudden jump is often a deploy that added a bad label or a debug log.

```predict
Q: A developer adds a label `request_id` to a request counter. What happens?
???
Every request creates a new time series, so series count and memory explode, queries slow down and the bill rises.
> Put request ids in logs and traces, not metric labels.
```

## Incident: the monitoring system that fell over

> **Incident:** Prometheus runs out of memory and restarts every few minutes, and alerts stop for two hours.

```console
$ curl -s localhost:9090/api/v1/status/tsdb | jq '.data.seriesCountByMetricName[0:2]'
[{"name":"http_requests_total","value":4180233},{"name":"cart_item_latency_bucket","value":912004}]
```

A release added `customer_id` as a label on the request metric. The team removed the label, dropped the series with relabel rules, set a per-target series limit, added an alert on series growth and put label review in code review.

## Common mistakes

- Unbounded label values
- Keeping debug logs on forever
- Head-sampling away the failures
- No owner for the telemetry bill

```quiz
Q: What mainly determines the cost and memory use of metrics?
- The number of samples per second only :: Series count matters more.
+ The number of unique time series, from label combinations
- The colour of dashboards :: Unrelated.
- The length of metric names :: Minor.
> Cardinality drives cost.

Q: Which is a safe metric label?
- user_id :: Unbounded.
+ status class such as 2xx, 4xx, 5xx
- request_id :: Unbounded.
- email :: Unbounded and personal.
> Use small, bounded sets.

Q: What does tail sampling let you do?
+ Keep all error and slow traces while sampling the rest
- Avoid collectors :: It needs a collector.
- Decide before the request :: That is head sampling.
- Remove logs :: Unrelated.
> Decisions use the whole trace.

Q: Why downsample old metrics?
+ Old data is used for trends, so lower resolution saves storage and query time
- It improves accuracy :: It reduces detail.
- It removes alerts :: Unrelated.
- It encrypts data :: Unrelated.
> Detail matters most for recent data.
```

```cards
What is cardinality? :: Number of unique label combinations, i.e. time series
Where do unique ids belong? :: Logs and traces, not metric labels
Head versus tail sampling? :: Decide at start versus after the trace completes
How to cut log cost? :: Levels, drop noise, sample, tier storage
What to review monthly? :: Top series, log sources and trace producers
```
