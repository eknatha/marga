## Rate on a gauge
level: mid
A graph of requests per second looks wrong.

```text
$ promtool query instant http://prom:9090 'rate(queue_depth[5m])'
{} 0.02
$ promtool query instant http://prom:9090 'queue_depth'
{} 4800
```
? What is wrong with the query?
+ rate is meant for counters; use the gauge itself or deriv
- Wrap it in sum
- Increase the range to one hour
why: rate computes per second growth of a counter and hides a gauge that is high but steady.

## Alert flaps every few minutes
level: mid
A CPU alert fires and resolves repeatedly.

```text
$ cat alert.yml | grep -E "expr|for"
expr: cpu_usage > 0.9
for: 0m
```
? What change reduces the noise?
+ Add a for duration or alert on a burn rate of a user facing symptom
- Raise the severity
- Send it to more people
why: A short for duration and a symptom based condition stop transient spikes from paging.

## Prometheus out of memory
level: senior
Memory rises after a deployment adds a label.

```text
$ curl -s prom:9090/api/v1/status/tsdb | jq ".data.headStats.numSeries"
8200000
$ curl -s prom:9090/api/v1/label/user_id/values | jq ".data | length"
1900000
```
? What is the cause?
+ A high cardinality label such as user_id created millions of series
- Too few CPUs
- Disk is slow
why: Each unique label value makes a new series, so remove the label and aggregate.

## Loki queries time out
level: mid
Searching logs for one day takes minutes.

```text
$ logcli series --analyze-labels '{app="web"}'
request_id 4,100,000 values
```
? What should change?
+ Remove request_id from labels and filter on it in the query
- Add more labels
- Keep all and add RAM
why: High cardinality labels create too many streams, so keep labels few and filter by text.

## A trace is missing its error
level: junior
Engineers cannot find the failed request in tracing.

```text
$ grep sampling otel.yaml
probability: 1
sampler: head
```
? Why is the trace absent?
+ Head sampling keeps one percent before knowing if it will fail, so use tail sampling for errors
- The network is down
- Spans are too small
why: A decision before the outcome is known drops many failures.

## Dashboards disappear after restart
level: junior
Dashboards edited in the UI are gone after redeploy.

```text
$ kubectl get cm -n monitoring | grep dashboards
(no resources found)
```
? What is the fix?
+ Provision dashboards from files in git
- Back them up by hand
- Disable restarts
why: Observability as code makes dashboards reviewable and reproducible.
