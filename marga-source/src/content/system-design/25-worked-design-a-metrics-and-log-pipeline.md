---
title: Worked design: a metrics and log pipeline
minutes: 16
summary: Ingest, store and query telemetry at scale without letting the pipeline become the outage, with cardinality, backpressure and retention.
---

Observability data is a high-volume, write-heavy workload with a special property: you need it most when everything else is failing, which is when it is hardest to keep running. The design must handle load spikes, bound cost and keep a path for the core signals alive.

## What you will learn

- Estimate ingest rates and storage for metrics and logs
- Design a pipeline with buffering, backpressure and sampling
- Control cardinality and retention
- Keep alerting working when the platform is not

## 1. Clarify

Collect metrics (numbers over time), logs (events) and traces from 2,000 services across several clusters. Dashboards for engineers, alerts to on-call, long-term retention for audits. Alerts on core service health must fire within 1 minute of a problem. Dashboards may lag by seconds. Losing some debug logs is acceptable; losing the alerts is not. Cost is a major constraint.

## 2. Estimate

Metrics: 2,000 services times 50 instances times 500 series each is 50 million active series. At a 15 second scrape interval that is about 3.3 million samples per second. At roughly 2 bytes per sample after compression, that is about 6.6 MB per second, 570 GB per day, before replication and indexes. Logs: 100,000 lines per second at 300 bytes is 30 MB per second, 2.6 TB a day. Logs cost far more than metrics, so retention and sampling decide the bill.

## 3. Sketch

Agents or collectors on each node, a regional buffer (a log or queue), ingest workers that write to a time-series store for metrics, an indexed store for recent logs and cheap object storage for old logs, a query layer, an alert evaluator, and a notification path. Separate, small, independent path for core alerts.

## 4. Deep-dive

**Buffering and backpressure.** Put a durable buffer between collectors and storage so a slow store does not drop data or push back into applications. Bound the buffer; when it fills, drop the least valuable data first (debug logs, high-volume low-priority metrics), never application traffic. Collectors must never block the service they observe.

**Cardinality control.** The number of distinct series is the main cost and failure driver. One label with millions of values (user id, request id, full URL) can multiply series and take the store down. Enforce limits per team and per metric, reject or aggregate offending labels at ingest, alert on series growth, and keep high-cardinality detail in logs and traces. Allocate quotas per tenant so one team cannot starve others (a noisy-neighbour bulkhead).

**Sampling and tiering.** Keep all error traces and slow traces, sample the rest. Downsample metrics (raw for 15 days, 5 minute for 13 months). Keep logs hot for a few days, warm for weeks, and cold in object storage with lifecycle rules. Sampling decisions should be consistent so a trace is complete.

**Partitioning.** Shard series by a hash of the series key across ingest nodes with replicas for durability; shard logs by time and tenant. Plan compaction and index maintenance (see the storage engine lesson): an ingest surge can build compaction debt that slows queries.

**Alerting path.** The alert evaluator should read from a fast, replicated store and be redundant across zones. Provide a minimal independent path: external probes against the user-facing endpoints, a separate small metrics store for a handful of core SLIs, a separate paging provider. Dead-man's-switch alerts (an alert that fires if the pipeline stops sending its heartbeat) catch silent failure of the monitoring itself. In November 2023 a power failure at the primary site for Cloudflare's control plane and analytics meant logs were lost for about two days and customers could not change settings; see the case file for the sourced account.

**Multi-region.** Collect locally and ship upward, so a region keeps its own view if the central site is unreachable. Replicate the core alerting data to a second region.

## 5. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Ingest surge | buffers fill | bounded buffer, drop low priority, auto scale |
| Cardinality explosion | store overload | per-tenant limits, reject at ingest, alert on growth |
| Storage node loss | gaps or slow queries | replicas, quorum writes, repair |
| Query of death | store overloaded | query limits, timeouts, per-user quotas |
| Pipeline silently stops | blind on-call | dead-man's switch, external probes |
| Region loss | no central view | regional stores, replicated core alerts |
| Cost overrun | budget cut leads to data loss | quotas, retention tiers, ingestion alerts |

## 6. Trade-offs

Dropping debug logs under pressure saves the pipeline and loses detail. Long raw retention is costly; downsampling loses spikes. Central storage is easy to query and a single point; regional storage is resilient and harder to query globally. Independent core alerting is another system to run. State the choices.

```predict
Q: A developer adds a metric label containing the user id. What happens to a store that holds 50 million series, and what should prevent it?
???
Series count can multiply by millions, memory and index size explode, and ingest or queries fail for everyone. Enforce cardinality limits at ingest, reject or aggregate the label, and move user-level detail to logs or traces.
> Cardinality is the multiplier on everything else.
```

## How it fails

The monitoring platform on the same cluster as the workload. Alerts that depend on the store that is overloaded. No alert for missing data. Logs ingested without limits. Dashboards that run expensive queries on every refresh.

## Incident: Logs lost with the site

> **Incident:** The primary data centre for a control plane and analytics system lost power, and logs were lost for days.

```console
$ logctl status --region primary
primary:   unreachable
secondary: standby (not receiving)
last_replicated_event: 2023-11-02T08:41:12Z
```

The console output is a simulated illustration. In the real incident on 2 November 2023, a power failure at a Flexential data centre in Portland took down the primary site of Cloudflare's control plane and analytics; customers could not change settings and logs were lost for about two days. See the case file. Design responses are standby capacity that actually receives data, regular failover tests, and keeping the customer data path independent of the control plane.

## Interview question

"Design a metrics system for 2,000 services." Estimate series and samples, buffer and shed, control cardinality, tier retention, keep an independent core alert path with a dead-man's switch, and discuss multi-region.

## Common mistakes

- No cardinality limits
- Monitoring that shares the failing platform
- Unbounded buffers
- No alert for missing data

```quiz
Q: What is the main driver of metric store cost and failure?
+ The number of distinct series (cardinality)
- The colour of dashboards :: Irrelevant.
- The number of alerts :: Secondary.
- The retention of source code :: Unrelated.
> Correct: The number of distinct series (cardinality). Re-read the matching lesson section for the full reasoning.

Q: What should a collector do if storage is slow?
+ Never block the service; buffer and drop low-value data if needed
- Block the application until storage recovers :: Spreads the fault.
- Retry forever without limit :: Fills memory.
- Stop collecting :: Loses everything.
> Correct: Never block the service; buffer and drop low-value data if needed. Re-read the matching lesson section for the full reasoning.

Q: What does a dead-man's switch alert detect?
+ The monitoring pipeline going silent
- High CPU :: Not its purpose.
- Slow queries :: Not its purpose.
- Full disks :: Not its purpose.
> Correct: The monitoring pipeline going silent. Re-read the matching lesson section for the full reasoning.

Q: Why keep high-cardinality detail in logs and traces?
+ Metrics series multiply with each distinct label value
- Logs are faster :: Not the reason.
- Traces are cheaper than metrics always :: Not always.
- Metrics cannot store numbers :: They can.
> Correct: Metrics series multiply with each distinct label value. Re-read the matching lesson section for the full reasoning.
```

```cards
cardinality :: count of distinct label combinations
sampling :: keeping a fraction of data
downsampling :: storing lower resolution for older data
dead-man's switch :: alert that fires when expected data stops
noisy neighbour :: tenant using shared capacity unfairly
buffer :: durable store between collectors and storage
```
