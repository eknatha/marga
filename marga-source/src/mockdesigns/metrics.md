# Model answer: a metrics and log pipeline for 2,000 services
prompt: metrics
summary: Agents ship data to a collector tier, a buffer decouples ingestion, and separate stores serve metrics, logs and traces.

## The answer in one minute

Use a local agent on every node, send data to a regional collector with a durable queue, store metrics in a time-series database and logs in an indexed or object-based store, control cardinality and retention, and alert on the pipeline itself.

## The design

```diagram
title: Metrics and logs pipeline design
node: svc | Services and nodes | 0 | 1 | Emit metrics and logs. | Debug logging can flood.
node: agent | Agents | 1 | 1 | Collect, batch, compress and label. | Agent bugs take node memory.
node: coll | Collectors | 2 | 1 | Validate, enrich, route and rate limit. | Overload drops data.
node: buf | Durable queue (Kafka) | 3 | 1 | Absorbs bursts and lets consumers lag. | Full disks stop ingestion.
node: tsdb | Metrics store | 4 | 0 | Time-series database with downsampling. | High cardinality blows memory.
node: logs | Log store | 4 | 2 | Indexed or object storage by day. | Unbounded retention costs a fortune.
node: alert | Alerting and dashboards | 5 | 1 | Rules, routing and views. | Alerts on missing data are often forgotten.
edge: svc | agent
edge: agent | coll
edge: coll | buf
edge: buf | tsdb
edge: buf | logs
edge: tsdb | alert
```

## Every component, explained

### Agent

A small process on each node reads files and scrapes endpoints, adds labels such as service and region, batches and compresses.

Example: The agent sends 5000 log lines as one compressed batch every five seconds.

### Collector tier

Receives data from many agents, rejects malformed data, applies per-tenant limits and routes to queues.

Example: A service that emits 10 times its quota is throttled and its owner is alerted.

### Queue

Kafka topics hold data for hours so stores can slow, restart or be upgraded without loss.

Example: The log store is down for 20 minutes and catches up from the queue afterwards.

### Metrics store

A time-series database keeps numbers by label set. Old data is downsampled to save space.

Example: Raw data is kept 15 days and 5-minute averages for a year.

### Cardinality control

Every unique label combination makes a new series. Limits on labels stop user IDs from becoming labels.

Example: A metric labelled by user_id with 5 million users is rejected at the collector.

## Numbers to say out loud

- 2000 services with 50 metrics and 20 series each is about 2 million series.
- Logs of 2 KB at 500000 lines a second are about 1 GB a second before compression.
- Retention is the main cost: 30 days of hot logs at 80 TB a day compressed needs careful tiering.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Pipeline backlog | Dashboards late | Alert on queue lag, scale consumers |
| Cardinality explosion | Metrics store memory exhausted | Limits at ingestion, review new labels |
| Log flood | Costs and loss | Sampling and per-service quotas |
| Single region store | Blind during outage | Replicate alerts out of band |
| No monitoring of the monitor | Silent gaps | Heartbeat metrics and a dead-man alert |

## Follow-up questions to expect

- How do you keep alerts working when the pipeline is down?
- What do you sample, and what never?
- How do you handle multi-tenant cost?
