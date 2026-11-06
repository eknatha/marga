---
title: Database observability and capacity planning
minutes: 12
summary: Choose the database metrics that matter, build useful dashboards and alerts, and forecast storage, connections and I/O before they run out.
---

Databases hold the state of everything else, so their failures are the most costly. A small, consistent set of metrics and alerts catches most problems before users do.

## What you will learn

- The metrics that matter for a database
- Symptom alerts versus cause alerts
- Forecasting disk, connections and I/O
- Dashboards for on-call

## What to collect

- **Latency and throughput:** queries per second and slow query rate.
- **Errors:** failed statements, deadlocks and timeouts.
- **Saturation:** connections used versus maximum, CPU, memory and disk I/O wait.
- **Locks and long transactions:** waiting sessions and the oldest transaction age.
- **Replication:** lag in seconds and bytes.
- **Storage:** data size, WAL or log size, free disk and growth rate.
- **Cache:** hit ratio, which shows if memory is too small.

```promql
# connection saturation
pg_stat_activity_count / pg_settings_max_connections > 0.8

# replication lag
pg_replication_lag_seconds > 30

# disk full in less than 7 days
predict_linear(node_filesystem_avail_bytes{mountpoint="/var/lib/postgresql"}[6h], 7*24*3600) < 0
```

## Alert design

Alert on **symptoms** that matter to users, such as error rate or latency, and use cause metrics, such as lock waits or connection counts, for diagnosis and for early warnings that go to tickets. Page only when action is needed now. Add a link to the runbook in each alert.

## Capacity

Record daily peaks and growth for storage, connections and I/O. Forecast with trend and seasonality, and compare the result with lead times for resizing, which on some platforms means a maintenance window. Review the numbers each month and before known peak events.

## Dashboard

For on-call, build one page: traffic, latency, errors, connections, locks, replication, disk and the top queries by total time. Keep the layout the same for every database.

## Incident: Out of connections on the busiest day

> **Incident:** Connections reached the limit during peak traffic.

```console
FATAL: sorry, too many clients already
connections: 500 of 500
trend: +6% per month for 14 months
```

Each new service had added connections, and nobody watched the total. The team added a saturation alert at 80 percent, introduced a pooler, set per-service limits and reviewed the connection budget in capacity planning.

## Common mistakes

- Alerting only when something is already down
- No baseline for normal behavior
- Ignoring connection and lock metrics
- Capacity forecasts that ignore lead time

```quiz
Q: Which metric shows connection saturation?
+ Connections used versus the maximum
- Disk colour :: No.
- Table names :: No.
- Query text :: No.
> Saturation predicts failure.

Q: What is a symptom alert?
+ Alerts on user-visible impact
- Alerts on CPU only :: No.
- Alerts on every query :: No.
- Alerts on names :: No.
> It matters to users.

Q: What does low cache hit ratio suggest?
+ Memory may be too small
- DNS is wrong :: No.
- A bad image :: No.
- Too few indexes only :: No.
> Data is read from disk.

Q: Why include lead time in forecasts?
+ Resizing may take time
- To slow alerts :: No.
- To hide trends :: No.
- To skip reviews :: No.
> Plan ahead. The lesson section above explains why.
```

```cards
Saturation :: How full a resource is
Symptom alert :: Alert based on user-visible impact
Baseline :: Normal behavior for comparison
Cache hit ratio :: Share of reads served from memory
```
