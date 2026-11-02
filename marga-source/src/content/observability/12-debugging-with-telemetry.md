---
title: Debugging with metrics, logs and traces
minutes: 15
summary: Use metrics to find that something is wrong, traces to find where, and logs to find why, and learn to debug the monitoring itself when data is missing.
---

Monitoring exists so you can find a cause faster. The three signals answer different questions: metrics tell you that something changed, traces show where time or errors accumulate, and logs explain what happened at that point. Used in this order they shorten an investigation from hours to minutes.

## What you will learn

- A path from alert to cause using all three signals
- Slicing metrics by labels to find the affected part
- Following a trace and jumping to the matching logs
- Debugging missing data, gaps and high cardinality

## From symptom to cause

1. **Metrics**: which service, endpoint or region is affected? When did it start? Compare with a deploy marker.
2. **Traces**: pick a slow or failed request and see which span takes the time or returns the error.
3. **Logs**: open the logs for that trace id and read the message at the failing span.

```promql
sum by (route) (rate(http_requests_total{status=~"5.."}[5m]))
histogram_quantile(0.99, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))
sum by (version) (rate(http_requests_total{status=~"5.."}[5m]))
```

The last query splits errors by version and often shows that only the new release is failing.

## Link signals with a trace id

```json
{"ts":"2026-10-12T09:14:03Z","level":"error","trace_id":"4bf92f35","route":"/checkout","msg":"payment timeout","upstream":"payments","ms":5003}
```

A trace id in every log line lets you jump from a slow span to the exact log lines. Without it you search by time and guess.

## When the data itself is missing

| Symptom | Likely cause | Check |
|---------|--------------|-------|
| Gap in a graph | Scrape failed or the target restarted | `up` metric, target page |
| Flat line at zero | Counter reset or the label changed | Rename or relabel in the last release |
| Dashboard empty | Wrong time range, data source or variable | Query in the explorer first |
| Monitoring slow or expensive | High-cardinality labels (user id, request id) | Series count by metric |
| No alert fired | Rule never evaluated, or notification route missing | Rule state, alert manager routing |

Alert on the monitoring itself: the `up` metric, the age of the newest log line, and a regular test alert (a "dead man's switch") that must always fire.

```predict
Q: The p99 latency of /checkout rises but the average does not. What does that tell you?
???
A small share of requests is very slow, so look at traces of the slowest requests rather than at averages.
> Averages hide tails. Percentiles and traces of outliers show the cause, such as one slow dependency or a lock.
```

```diagram
title: From alert to cause
node: alert | Alert fires | 0 | 1 | A symptom alert on errors or latency starts the investigation. | Cause-based alerts with no user impact waste attention.
node: metric | Metrics: what and when | 1 | 0 | Split by route, version and region to find the affected slice. | Looking at overall averages hides small broken parts.
node: trace | Traces: where | 2 | 1 | Find the slow or failing span in one request. | Missing context propagation breaks traces at service borders.
node: log | Logs: why | 3 | 1 | The trace id leads to the log line with the error text. | Logs without ids force time-based guessing.
node: fix | Act and verify | 4 | 1 | Roll back or fix, and watch the same metric recover. | No verification leaves doubt that the issue is closed.
edge: alert | metric
edge: metric | trace
edge: trace | log
edge: log | fix
```

## Incident: the dashboard that said everything was fine

> **Incident:** Customers report failed checkouts for 40 minutes while every dashboard stays green.

```console
$ curl -s localhost:9090/api/v1/query --data-urlencode 'query=up{job="checkout"}' | jq '.data.result | length'
0
```

A relabelling change removed the `job="checkout"` target, so the metrics stopped, and a rule based on "error rate above 2 percent" saw no data and stayed quiet. The team added an alert for missing data, an alert on the number of targets up, and a synthetic checkout probe from outside.

## Common mistakes

- Alerting only on causes such as CPU
- Using averages for latency
- Putting user or request ids in metric labels
- Trusting an empty graph to mean "no errors"

```quiz
Q: Which signal best tells you where in a request path the time is spent?
- A counter :: It counts events, not time per step.
+ A distributed trace
- A disk graph :: It shows storage only.
- A DNS record :: It stores names.
> Spans show each step's duration and errors.

Q: What does a trace id in log lines allow?
+ Jumping from a span to the exact related log entries
- Faster disks :: It does not change hardware.
- Encrypted logs :: It is not encryption.
- Fewer alerts :: It does not change alert rules.
> It links the signals so you do not need to guess by timestamp.

Q: A graph shows no data and no alert fired. What should you suspect?
- Everything is healthy :: Missing data is not proof of health.
+ The target or pipeline is broken, so alert on missing data
- The graph colours :: They do not change data.
- The browser :: It rarely hides all series.
> Silence can mean a broken scrape; alert on the monitor itself.

Q: Why are request ids bad as metric labels?
- They are too short :: Length is not the problem.
+ Each value creates a new series, causing very high cardinality and cost
- They contain spaces :: Not a reason.
- They are encrypted :: Not related.
> Keep unique values in logs and traces, not in metric labels.
```

```cards
What do metrics, traces and logs answer? :: That, where and why
Why alert on missing data? :: Silence can mean the monitoring broke
What links a trace to logs? :: A trace id in every log line
Why avoid averages for latency? :: They hide slow tails; use percentiles
What is a dead man's switch alert? :: An alert that must always fire, proving the pipeline works
```
