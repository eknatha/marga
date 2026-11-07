---
title: Monitoring the control plane and setting SLOs
minutes: 12
summary: Watch API server latency, errors, etcd health and controller queues, and define service levels for the cluster itself.
---

When the control plane is unhealthy, every workload suffers, yet many teams only watch the nodes. A small set of control plane metrics gives early warning and a target to manage against.

## What you will learn

- The key API server, etcd and controller metrics
- Spotting abusive clients and expensive requests
- Certificates and other expiry risks
- Platform SLOs and alerts

## Key signals

```promql
# API server request latency, 99th percentile (non-watch)
histogram_quantile(0.99, sum by (le, verb) (rate(apiserver_request_duration_seconds_bucket{verb!~"WATCH|CONNECT"}[5m])))

# API server error ratio
sum(rate(apiserver_request_total{code=~"5.."}[5m])) / sum(rate(apiserver_request_total[5m]))

# etcd disk sync latency
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# etcd database size
etcd_mvcc_db_total_size_in_bytes
```

Slow `fsync` usually means slow disks for etcd. A growing database size means too many objects or no compaction. Also watch scheduler queue depth and controller work queue depth and retries.

## Find heavy clients

Large list calls without pagination, aggressive polling and controllers in restart loops can overload the API server. API Priority and Fairness provides metrics by flow.

```bash
kubectl get --raw /metrics | grep -E "apiserver_flowcontrol_rejected_requests_total" | head
kubectl get --raw /metrics | grep apiserver_request_total | sort -t' ' -k2 -nr | head
```

Identify the user agent or service account making the most requests, and fix the client.

## Expiry

```promql
apiserver_client_certificate_expiration_seconds_count
min(apiserver_client_certificate_expiration_seconds_bucket) 
```

Alert well before certificates expire, and rehearse renewal. Also track the API server's own serving certificate and tokens used by controllers.

## SLOs

Define platform objectives such as 99.9 percent of API reads under 1 second, and pod scheduling within 30 seconds at the 95th percentile. Alert on **burn rate** and review the numbers monthly with platform users.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Monitoring the control plane and setting SLOs fits together
node: n1 | Key signals | 0 | 0 | Slow fsync usually means slow disks for etcd. | Ignoring request volume by client. | process
node: n2 | Find heavy clients | 1 | 1 | Large list calls without pagination, aggressive polling and controllers in restart loops can overload the API server. | Find heavy clients Large list calls without pagination, aggressive polling and controllers in restart loops can overload the API server. | client
node: n3 | Expiry | 2 | 0 | Alert well before certificates expire, and rehearse renewal. | Missing certificate expiry alerts. | process
node: n4 | SLOs | 3 | 1 | Define platform objectives such as 99.9 percent of API reads under 1 second, and pod scheduling within 30 seconds at the 95th percentile. | No SLO for the platform. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The controller that listed everything

> **Incident:** One controller's polling slowed the whole API.

```console
verb=LIST resource=pods user-agent=custom-reconciler/0.3
4800 requests/min
API p99 latency: 3.8s
```

A team's controller listed every pod in the cluster every few seconds. API latency rose for all tenants. After finding it from request metrics, the team switched it to a watch with an informer cache and added a rule to catch similar clients.

## Common mistakes

- Monitoring only nodes and pods
- Ignoring request volume by client
- Missing certificate expiry alerts
- No SLO for the platform

```quiz
Q: What does slow etcd fsync suggest?
+ Slow disk
- A DNS issue :: No.
- A label problem :: No.
- Too many namespaces :: No.
> etcd depends on disk latency.

Q: How find a heavy API client?
+ Request metrics by user agent or account
- Node CPU :: No.
- Disk size :: No.
- Image tags :: No.
> Identify the source.

Q: Why alert early on certificate expiry?
+ Expired certificates break the control plane
- They are optional :: No.
- They are cosmetic :: No.
- They hide logs :: No.
> Plan renewal. The lesson section above explains why.

Q: What is a platform SLO example?
+ API reads under 1 second 99.9 percent of the time
- Pods have long names :: No.
- Nodes are blue :: No.
- Files are small :: No.
> A user-facing target.
```

```cards
API Priority and Fairness :: API server request queueing and limits
Informer :: Client cache fed by a watch
Work queue :: Queue of items a controller must process
Burn rate :: Speed of consuming an error budget
```
