---
title: Log pipelines with Loki, Elasticsearch and Fluent Bit
minutes: 15
summary: Collect, parse, enrich and store logs at scale, choose between Loki and Elasticsearch, query with LogQL, and control volume, retention and cost.
---

The earlier lesson explained why structured logs matter. This one covers how logs travel from a container to a place where you can search them at 3 a.m., and how to keep that pipeline from becoming your largest bill.

## What you will learn

- The log pipeline: collect, process, store, query
- Fluent Bit and the Kubernetes log layout
- Loki versus Elasticsearch, and what each is good at
- LogQL queries, retention and cost control

## The pipeline

1. **Produce**: applications write to standard output as JSON
2. **Collect**: an agent on each node reads the log files
3. **Process**: parse, add labels (namespace, Pod, app), filter and redact
4. **Store**: a log backend indexes and keeps the data
5. **Query and alert**: people search, dashboards chart counts, rules alert

In Kubernetes, the container runtime writes each container's output to a file under `/var/log/pods/` on its node. A **DaemonSet** log agent reads these files, so applications need no logging library or agent of their own.

```console
$ kubectl logs deploy/shop-api -n shop --tail=5
$ kubectl exec -n logging ds/fluent-bit -- ls /var/log/containers | head -3
$ kubectl get ds -n logging
```

## Collecting with Fluent Bit

Fluent Bit is a lightweight agent that reads, parses and forwards logs.

```text
[SERVICE]
    Flush        5
    Log_Level    info
    Parsers_File parsers.conf

[INPUT]
    Name         tail
    Path         /var/log/containers/*.log
    Parser       cri
    Tag          kube.*
    Mem_Buf_Limit 20MB

[FILTER]
    Name         kubernetes
    Match        kube.*
    Merge_Log    On
    Keep_Log     Off

[FILTER]
    Name         grep
    Match        kube.*
    Exclude      log healthz

[OUTPUT]
    Name         loki
    Match        kube.*
    Host         loki.logging.svc
    Port         3100
    Labels       job=fluentbit, namespace=$kubernetes['namespace_name'], app=$kubernetes['labels']['app']
```

`Mem_Buf_Limit` stops a slow backend from exhausting the agent's memory. The `kubernetes` filter adds Pod metadata. The `grep` filter drops noisy health-check lines **before** they cost money. Always redact secrets and personal data at this stage if applications might log them.

## Loki or Elasticsearch

| Question | Loki | Elasticsearch / OpenSearch |
|----------|------|----------------------------|
| What is indexed | Only labels; log text is stored compressed | Every word, in an inverted index |
| Storage cost | Low | High |
| Query speed for free text | Slower, scans matching streams | Fast full-text search |
| Operations | Simple, uses object storage | Heavier: shards, heap, upgrades |
| Fits with | Grafana, Prometheus-style labels | Complex search, analytics, security use cases |

Loki follows the Prometheus idea: label by a few low-cardinality dimensions (`namespace`, `app`, `env`) and search within them. **Never** use high-cardinality values such as request IDs or user IDs as labels, because each combination becomes a separate stream and the index explodes. Elasticsearch costs more to run but suits teams who need rich free-text search and aggregations across large volumes.

## Querying with LogQL

```text
{namespace="shop", app="shop-api"} |= "error"
{namespace="shop", app="shop-api"} | json | level="error" | status >= 500
sum by (app) (rate({namespace="shop"} |= "error" [5m]))
topk(5, sum by (route) (count_over_time({app="shop-api"} | json | status >= 500 [1h])))
```

The first part selects streams by label, the pipeline then filters and parses lines, and the metric forms turn logs into numbers you can graph or alert on. Always select by labels first so the system reads less data.

```console
$ logcli query '{namespace="shop"} |= "timeout"' --since=30m --limit=20
$ logcli labels namespace
```

## Retention, volume and cost

- Set retention per environment and per importance, for example 7 days for debug, 30 for application logs, a year for audit
- Drop or sample debug logs in production
- Keep a **log volume dashboard** by namespace and alert on sudden growth
- Send long-term copies to object storage with lifecycle rules
- Use rate limits per tenant so a noisy service cannot take down the log system

## Incident: logs stop when the disk fills

> **Incident:** An outage investigation begins, and the search backend returns nothing newer than two hours ago. The logging stack's disk filled during a spike when a service started printing stack traces in a tight loop, then the indexer stopped.

Check each stage, starting from the end:

```console
$ kubectl get pods -n logging
$ kubectl logs sts/loki -n logging --tail=20 | grep -iE "error|no space"
$ kubectl exec -n logging sts/loki -- df -h /data
$ kubectl top pods -n shop --sort-by=memory | head -3
```

Free space (delete the oldest data or expand the volume), restart the writer, and find the noisy source. For the future: enforce per-tenant ingestion limits, alert when log storage passes 70 percent, add retention, and keep a fallback of `kubectl logs` and node files for the moments when the log system itself is down.

## Common mistakes

- Using high-cardinality labels in Loki
- Shipping every debug line from production
- No parsing, so everything is one unsearchable text blob
- No monitoring of the logging system itself
- Logging secrets, tokens or personal data

```quiz
Q: What does Loki index?
- Every word in each log line
+ Only the labels attached to log streams
- Only timestamps
- Nothing
> This keeps Loki cheap, but queries must start from labels.

Q: Why avoid putting a request ID in a Loki label?
- Labels must be numbers
+ Each unique value creates a new stream and causes cardinality problems
- Request IDs are secret
- It is slower to type
> High-cardinality labels bloat the index and slow queries.

Q: Why run the log agent as a DaemonSet?
+ One agent per node can read all container log files on that node
- DaemonSets are cheaper
- It avoids using the network
- It encrypts logs
> Container logs are files on each node's disk.

Q: Where is the best place to drop noisy health-check logs?
- In the dashboard
+ In the collection pipeline, before they are stored
- After one year
- In the application code only
> Filtering early saves storage and query cost.
```

```cards
Pipeline stages? :: Produce, collect, process, store, query
Loki query selector syntax? :: {label="value"} then filters such as |= "error"
Why monitor the log system? :: If it fails during an incident you lose the data you need
Where do Kubernetes container logs live on a node? :: /var/log/pods and /var/log/containers
```
