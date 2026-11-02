---
title: Observability by design
minutes: 14
summary: Decide what a system must tell you before it fails: SLIs in the design, golden signals, tracing, and monitoring that survives the outage.
---

Observability is not a tool you add after launch. It is a property you design in: can an on-call engineer, at 3 a.m., tell what is wrong, how many users are affected and where to look, using only what the system emits? The design question is what to emit, where to keep it, and what happens to your view when the system is down.

## What you will learn

- Put SLIs and SLOs into the design, not after it
- Choose signals: golden signals, RED and USE, and which to alert on
- Design traces, logs and metrics so they connect
- Keep monitoring independent and cost under control

## Start with the SLI

For each user journey, pick a small number of service level indicators measured as close to the user as practical: the share of requests that succeed and are fast enough, the freshness of data, the share of jobs finished on time. An SLI measured at the load balancer sees more than one measured inside the service, because a crashed service reports nothing. Write the SLO next to the design and make sure the design can measure it.

## The signals

- **Golden signals:** latency, traffic, errors, saturation.
- **RED** for services: rate, errors, duration.
- **USE** for resources: utilisation, saturation, errors.

Alert on symptoms users feel (error rate and latency against the SLO, with burn-rate alerts), not on every cause. Use cause metrics (CPU, queue age, connection pool use, replica lag, cache hit rate) for dashboards and diagnosis. Saturation signals that predict trouble are the most valuable: queue age, thread pool use, disk and file descriptor use, distance to a hard limit.

## Metrics, logs and traces together

Metrics are cheap and aggregate: use them to detect and to size the problem. Logs are detailed and expensive: use structured fields (request id, tenant, version) so they can be searched. Traces follow one request across services: use them to find where time or errors come from. Connect them by a shared request or trace id in all three, so you can move from a spike on a graph to an example trace to the log lines.

Control cardinality: a label with millions of values (user id, full URL) can overwhelm a metrics system. Put high-cardinality detail in logs and traces, and sample traces sensibly, keeping all errors and slow requests.

## Design for the blast radius

Label metrics by cell, region, version and tenant tier so you can see whether a fault is bounded, and compare canary against baseline. A rollout without a per-version error rate cannot be halted automatically. Include change events (deploys, config pushes, flag flips) on the same timeline, because most incidents begin with a change.

## Monitoring that survives

Do not run your only monitoring on the platform it watches. When the platform degrades you lose your view exactly when you need it. Keep a small, simple, independent path for the core signals: external probes from outside your network, a separate metrics store for critical alerts, a separate paging path, and a status page on independent infrastructure. In 2021 Roblox's monitoring depended on the same Consul cluster that was struggling, which made diagnosis harder; in November 2023 a power failure at the primary site for Cloudflare's control plane and analytics meant customers could not change settings and logs were lost for about two days. See the case files.

## Alert quality

Every page should be urgent, actionable and linked to a runbook. Review pages weekly and fix or delete noisy alerts. Test alerts: simulate the failure and confirm that the right person is paged in the expected time. An alert that has never fired is untested.

## Cost of telemetry

Telemetry can cost as much as the service. Set retention by value: high-resolution metrics for days, downsampled for months, logs hot for days and cold for compliance. Sample traces, drop debug logs by default, and watch the growth in ingestion volume as a signal in itself.

```predict
Q: Your error-rate alert is calculated from application logs. The application crashes at start-up and writes no logs. What does the alert show?
???
Nothing: no logs means no errors counted, so the alert stays green during a total outage. Measure at the edge or with an external probe, and alert on absence of traffic as well as on error rate.
> A crashed service cannot report its own failure.
```

## How it fails

Dashboards with fifty graphs and no SLO. Alerts on causes that do not matter. Traces without ids in the logs. Telemetry on the failing platform. A label that explodes cardinality and takes the metrics store down during the incident.

## Incident: Blind during the outage

> **Incident:** Engineers could not see the state of the platform because the monitoring system ran on it.

```console
$ curl -s -m 5 https://grafana.internal/api/health
curl: (28) Operation timed out after 5001 milliseconds
$ curl -s -m 5 https://probe.example-external.net/check?target=api
{"target":"api","status":"fail","from":"external"}
```

This is a simulated illustration. The external probe still answers when internal monitoring does not, which is the point of an independent path. The Roblox 73-hour case file describes monitoring that shared the struggling cluster; the design response is a small, independent set of probes and alerts for the core signals.

## Interview question

"What do you instrument in a new service before launch?" SLIs at the edge with an SLO, golden signals per route, per-version and per-cell labels, trace and request ids across logs, saturation signals for each limit, change events, and an external probe, plus a dashboard and runbook for each alert.

## Common mistakes

- Measuring only from inside the service
- Alerting on causes instead of symptoms
- High-cardinality metric labels
- Monitoring that depends on the monitored platform

```quiz
Q: Which signals are the golden signals?
+ Latency, traffic, errors and saturation
- CPU, RAM, disk and network only :: Those are resource metrics.
- Logs, metrics and traces :: Those are data types.
- Uptime, cost, users and revenue :: Not the golden signals.
> Correct: Latency, traffic, errors and saturation. Re-read the matching lesson section for the full reasoning.

Q: Why measure an SLI at the load balancer or edge?
+ It sees failures of services that cannot report on themselves
- It is cheaper in every case :: Not the reason.
- It replaces logging :: No.
- It avoids needing an SLO :: No.
> Correct: It sees failures of services that cannot report on themselves. Re-read the matching lesson section for the full reasoning.

Q: What problem does a high-cardinality metric label cause?
+ It can overwhelm the metrics system with too many series
- It hides errors :: Not the issue.
- It breaks tracing :: Not the issue.
- It slows DNS :: Unrelated.
> Correct: It can overwhelm the metrics system with too many series. Re-read the matching lesson section for the full reasoning.

Q: Why keep an independent monitoring path?
+ The primary monitoring may fail with the platform it watches
- To double the dashboards :: Not the aim.
- To avoid alerts :: Opposite.
- To save storage :: Not the aim.
> Correct: The primary monitoring may fail with the platform it watches. Re-read the matching lesson section for the full reasoning.
```

```cards
SLI :: measured indicator of user experience
burn rate :: speed of spending the error budget
golden signals :: latency, traffic, errors, saturation
cardinality :: number of distinct label values
trace id :: shared id linking logs, metrics and traces
external probe :: check from outside your own network
```
