# A metrics and logging platform
level: Intermediate
modules: observability, kubernetes, cloud
lessons: observability/telemetry-cost-and-cardinality, observability/red-use-and-golden-signals, kubernetes/probes-metrics-and-logging
summary: How telemetry flows from applications through collectors to stores, dashboards and alerts, and how cost and cardinality shape the design.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Collect metrics, logs and traces from hundreds of services
- Answer "is it broken?" in seconds and "why?" in minutes
- Page the right person for real problems, and only those
- Keep cost predictable as the company grows

## The big picture

```diagram
title: Telemetry platform reference design
node: app | Applications | 0 | 1 | Emit metrics, structured logs and trace spans. | Unbounded labels or noisy logs create huge cost.
node: agent | Collectors and agents | 1 | 1 | Run on each node, batch, filter and add metadata. | If an agent crashes or backs up, data is dropped silently.
node: queue | Buffer or stream | 2 | 1 | Absorbs bursts before the stores. | Without buffering, a spike overloads storage.
node: tsdb | Metrics store | 3 | 0 | Keeps time series with limited retention and downsampling. | High cardinality exhausts memory.
node: logs | Log store | 3 | 1 | Indexes or stores logs for search. | Indexing everything is expensive.
node: trace | Trace store | 3 | 2 | Holds sampled traces. | Sampling away rare errors hides the bug you need.
node: dash | Dashboards | 4 | 0 | Show golden signals per service. | Dashboards nobody reads are clutter.
node: alert | Alert manager | 4 | 1 | Routes alerts to on-call by service and severity. | Noisy alerts train people to ignore pages.
edge: app | agent
edge: agent | queue
edge: queue | tsdb
edge: queue | logs
edge: queue | trace
edge: tsdb | dash
edge: tsdb | alert
edge: logs | dash
edge: trace | dash
```

## A request, from signal to page

1. A service increments a request counter and a latency histogram, writes a structured log line with a trace id, and records a span.
2. The collector on the node batches the data, adds labels such as cluster, namespace and version, and forwards it.
3. The buffer smooths bursts, and writers store metrics, logs and traces in separate systems built for each.
4. An alert rule evaluates error ratio and latency against the service's objective. When it burns the error budget too fast, the alert manager pages the owning team.
5. The engineer opens the dashboard, finds the failing endpoint, jumps from a slow trace to the matching logs by trace id, and finds the cause.

## Why the design looks like this

- **Three signals, three stores**: metrics are cheap and fast for alerting, logs give detail, traces connect services. One store rarely fits all three.
- **Collectors** standardise labels and remove noise at the edge, which is cheaper than doing it later.
- **Buffers** protect storage during spikes and incidents, which is exactly when telemetry volume rises.
- **Alerts on symptoms** (user-visible errors and latency) rather than causes (CPU) keep pages meaningful.

## Cost and cardinality

- Every unique label combination is a separate time series. A label like user id or request id can create millions.
- Log volume grows with traffic and with debug logging left on. Sample or drop noisy lines, keep errors, and set short retention for verbose levels.
- Sample traces, but keep all errors and slow requests.
- Downsample old metrics: keep detailed data for days, summaries for months.
- Track the platform's own cost per service, and show it to the owning team.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Cardinality explosion | Metrics store runs out of memory | Label limits, review of new metrics |
| Telemetry outage during incident | You are blind when you most need it | Monitor the monitor from outside, separate failure domain |
| Alert storms | On-call ignores pages | Group, deduplicate, alert on symptoms |
| Log volume spike | Costs and delays rise | Rate limits, sampling, retention tiers |
| Clock skew | Traces and logs misaligned | Time sync on all nodes |
| Sensitive data in logs | Privacy breach | Redaction at the collector, log review |

## Trade-offs

- Full-fidelity data costs more, while sampling saves money and can hide rare events.
- A managed vendor reduces operations work and can become the largest line on the bill. Self-hosting is cheaper per unit and needs people.
- Standardising on one instrumentation format keeps teams consistent and slows experiments.

```predict
Q: A developer adds a metric label containing the customer's user id. What is the likely effect on the metrics store?
???
The number of time series grows with the number of users, perhaps millions, causing high memory use, slow queries and cost. Use a bounded label (such as plan or region) and put per-user detail in logs or traces.
> Labels are for groups, not for identifiers.
```
