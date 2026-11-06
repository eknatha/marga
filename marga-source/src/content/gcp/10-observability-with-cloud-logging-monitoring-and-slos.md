---
title: Observability: Cloud Logging, Monitoring and SLOs
minutes: 13
summary: Use Cloud Logging, Cloud Monitoring, Trace and Error Reporting to find problems, write alerting policies and define service level objectives.
---

The operations suite is on by default for most services, so the work is to use it well: query logs quickly, make alerts meaningful and measure reliability with an objective.

## What you will learn

- Logs Explorer, sinks and log-based metrics
- Metrics, dashboards and alerting policies
- Traces, errors and uptime checks
- SLOs, error budgets and burn-rate alerts

## Logs

```console
$ gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR AND timestamp>="2026-11-05T09:00:00Z"' --limit=20 --format=json
```

Query fields, not text, where possible. The **log router** sends logs to buckets, **sinks** (BigQuery, Cloud Storage, Pub/Sub) and can **exclude** noisy entries to reduce cost. **Log-based metrics** count matching entries so you can alert on them. Use structured JSON logs with `severity` and a request id.

## Metrics and alerts

Cloud Monitoring stores metrics for Google services; install the **Ops Agent** on VMs, and use **Managed Service for Prometheus** for Kubernetes. An **alerting policy** has a condition, a duration and **notification channels** (email, chat, paging). Add **uptime checks** for external probes.

## Traces and errors

**Cloud Trace** shows where a request spent time across services; **Error Reporting** groups exceptions; **Profiler** finds hot code.

## SLOs

Define a **service level indicator** (good requests divided by all requests), an **objective** (99.9 percent over 30 days) and the **error budget** (0.1 percent). Alert on **burn rate**: a fast burn (budget gone in hours) pages someone; a slow burn creates a ticket.

```diagram
title: From signals to action
node: svc | Services | 0 | 1 | Emit logs, metrics and traces. | Unstructured logs are hard to query.
node: log | Logging | 1 | 0 | Stores, routes and filters log entries. | Unfiltered debug logs raise cost. | observe
node: mon | Monitoring | 1 | 1 | Metrics, dashboards and alerting policies. | CPU-only alerts miss user pain. | observe
node: slo | SLO and burn rate | 2 | 1 | Compares good requests with the objective. | A target nobody agreed on drives bad decisions. | security
node: pg | On-call | 3 | 1 | Gets paged for fast burn only. | Alert noise causes ignored pages.
edge: svc | log
edge: svc | mon
edge: mon | slo
edge: slo | pg
```

## Incident: High CPU, no pager

> **Incident:** A slowdown went unnoticed because the alerts watched CPU while latency tripled.

```console
monitoring: run.googleapis.com/request_latencies p95 = 2.4s
monitoring: cpu utilisation = 41%
alerting policies: cpu > 80% (not firing)
```

The alert was about a cause, not the user's experience. A latency SLO with burn-rate alerts replaced the CPU page, and CPU remained on the dashboard for diagnosis.

## Common mistakes

- Alerting on causes instead of symptoms
- Logging everything at debug in production
- No owner for alert policies
- SLOs without an agreed error budget policy

```quiz
Q: What does a log-based metric do?
+ Counts log entries that match a filter
- Deletes logs :: No.
- Encrypts logs :: No.
- Moves VMs :: No.
> Turn logs into alertable numbers.

Q: What is an error budget?
+ Allowed unreliability under the objective
- A cost limit :: No.
- A server count :: No.
- A region :: No.
> One minus the objective.

Q: What does fast burn mean?
+ The budget is being used up quickly
- The disk is hot :: No.
- A slow query :: No.
- A failed login :: No.
> Page for this. The lesson section above explains why.

Q: Which tool shows time across services?
+ Cloud Trace
- Cloud DNS :: No.
- Filestore :: No.
- Artifact Registry :: No.
> Distributed tracing.
```

```cards
Log sink :: A destination for exported logs
Alerting policy :: A rule that notifies when a metric breaches
SLI :: A measurement of service quality such as good requests
SLO :: A target for an SLI over a period
Burn rate :: How fast an error budget is consumed
```
