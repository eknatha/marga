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

## Alert fires for every pod restart
level: mid
The on-call engineer gets 40 pages a night. Each one is a single pod restart that recovers by itself.

```text
Alert: KubePodRestarted  severity=page
Condition: increase(kube_pod_container_status_restarts_total[5m]) > 0
Last 7 days: 280 pages, 3 customer-visible incidents
```
? What is the best change?
+ Page on symptoms such as the error rate or latency against the SLO, and send restart counts to a ticket or dashboard
- Raise the number of people on call
- Mute the alert permanently
- Lower the threshold to catch more restarts
why: A page should mean that a human must act now because users are affected. A recovering restart does not meet that bar. Alerting on user-facing symptoms and burn rate catches the real incidents. Cause-level signals stay as lower-severity notifications that help with diagnosis.

## High cardinality blows up metrics storage
level: senior
The metrics server runs out of memory after a deploy. A new metric was added.

```text
http_requests_total{path="/users/48213", user_id="48213", method="GET"}
Active series: 1.2M before, 38M after
```
? What is the cause and fix?
+ User ID and raw path values create a new series for each user. Use the route template as a label, and keep identifiers in logs or traces
- The scrape interval is too long
- The server needs a faster disk only
- Counters must be changed to gauges
why: Each unique combination of label values is a separate time series that costs memory. Unbounded values such as user IDs make the count grow without limit. Label by the route pattern (for example /users/:id), status class and method, and put the detail into logs or traces where it is searchable.

## Dashboard shows healthy but users complain
level: mid
The average latency graph is flat, yet users report slow pages.

```text
Dashboard: avg latency 180 ms (flat)
Histogram: p50 90 ms, p95 400 ms, p99 6200 ms
Share of requests above 5 s: 1.8%
```
? What is the lesson?
+ Averages hide slow tails. Alert and report on percentiles such as p95 and p99, and on the share of requests that miss the objective
- Users are mistaken
- Latency must be measured in seconds only
- The graph is correct, so no action is needed
why: A small share of very slow requests barely moves the mean, but it is the experience of real users. Percentiles from histograms show the tail. Tie alerts to an SLO such as 99 percent of requests under one second.

## Logs are missing during an incident
level: mid
The team cannot find the logs for a failing pod after it restarted.

```text
$ kubectl logs api-7c9 -n shop
Error from server (BadRequest): container "api" is waiting to start
$ kubectl logs api-7c9 -n shop --previous
unable to retrieve container logs for containerd://3f2a...
Node: ip-10-0-4-22 (replaced by autoscaler 40 minutes ago)
```
? What should the team put in place?
+ Ship logs off the node to a central store as they are written, so they outlive pods and nodes
- Keep nodes forever
- Log less
- Check logs by SSH only
why: Local container logs go away with the pod or node. A log agent that streams to central storage keeps them searchable during and after an incident. Add retention and access control, and index fields such as trace ID to find related events.
