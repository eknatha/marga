## The alert that nobody trusts
level: junior
The on-call engineer is paged about 40 times a week for the same alert and has stopped looking at it.

```text
alert: HighCPU
expr: avg by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m])) > 0.8
for: 2m

Last 4 weeks: 162 pages, 0 user-facing incidents
```
? What is the best improvement?
+ Alert on what users feel, such as error rate or latency against an SLO, and keep CPU as a dashboard or ticket signal
- Lower the threshold to 0.6
- Send the alert to a channel that nobody reads
- Remove all alerts
why: A good page is urgent, actionable and tied to user impact. High CPU is a cause that often does no harm. Symptom-based alerts such as an error-budget burn rate catch real problems and ignore harmless spikes. Review noisy alerts every week and delete or downgrade them.

## Prometheus memory keeps climbing
level: mid
Prometheus ran fine until a release added a new label to a metric. Now it restarts with out-of-memory errors.

```text
$ promtool tsdb analyze /prometheus | head
Block ID: 01J8...
Highest cardinality metric names:
  4813920 http_request_duration_seconds_bucket
Highest cardinality labels:
  3211004 user_id
```
? What is the cause and the fix?
+ The user_id label creates millions of series, so remove it from the metric and put user detail in logs or traces
- Prometheus needs a longer scrape interval only
- The histogram buckets should be doubled
- Disk compaction is turned off
why: Each unique combination of label values is a separate time series that costs memory. An unbounded label such as user ID creates a series per user per bucket. Keep labels to a small bounded set such as route, method and status class, and use logs or traces for per-user detail. You can also drop the label with `metric_relabel_configs`.

## Gaps in a dashboard
level: mid
A graph for one service shows gaps every few minutes. Other services look fine.

```text
up{job="payments"} == 0   (flapping)

Target: http://10.1.4.22:9102/metrics
Last error: context deadline exceeded
Scrape duration: 10.0s    scrape_timeout: 10s
```
? What should you check first?
+ Why the metrics endpoint takes about 10 seconds to respond, and whether the scrape timeout and the endpoint's work are sensible
- Whether the dashboard theme is dark
- Whether Alertmanager is running
- Whether the Grafana version is the latest
why: Gaps appear when scrapes fail. The error "context deadline exceeded" and a scrape duration equal to the timeout show the endpoint is too slow. Look for a metrics handler that does expensive work on each request, a busy application, or network trouble. Fix the cause. Raising the timeout is only a temporary measure and must stay below the scrape interval.
