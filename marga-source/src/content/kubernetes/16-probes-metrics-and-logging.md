---
title: Probes, metrics and logging on Kubernetes
minutes: 15
summary: Configure liveness, readiness and startup probes correctly, collect resource and application metrics, and ship logs so a running cluster explains itself.
---

Kubernetes restarts failed containers and removes unready Pods from Services, but only if you tell it what "failed" and "ready" mean. It can also show a lot about what is going on, if you set up metrics and logs. Probes, metrics and logs are the sensory system of a cluster, and wrong settings here cause some of the most confusing outages.

## What you will learn

- The three probes and what each should check
- Probe settings that avoid restart storms
- Resource metrics, the metrics server and what autoscaling uses
- Application metrics and Prometheus scraping
- Logging patterns and what to collect

## The three probes

| Probe | Question | On failure |
|-------|----------|------------|
| Startup | Has the app finished starting? | Keeps other probes off; restarts if it never succeeds |
| Readiness | Can it serve traffic now? | Removes the Pod from Service endpoints, no restart |
| Liveness | Is it stuck for good? | Restarts the container |

```yaml
containers:
  - name: api
    image: registry.example.com/api:1.8.2
    ports: [{ containerPort: 8080 }]
    startupProbe:
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 5
      failureThreshold: 30        # up to 150 seconds to start
    readinessProbe:
      httpGet: { path: /ready, port: 8080 }
      periodSeconds: 5
      timeoutSeconds: 2
      failureThreshold: 3
    livenessProbe:
      httpGet: { path: /healthz, port: 8080 }
      periodSeconds: 10
      timeoutSeconds: 2
      failureThreshold: 3
    resources:
      requests: { cpu: 200m, memory: 256Mi }
      limits: { memory: 512Mi }
```

Rules that prevent trouble:

- A liveness probe should check only the process itself (is the event loop alive?), never a dependency. If the database is down and liveness fails, every Pod restarts at once and the outage gets worse.
- Readiness may check dependencies the app cannot work without, but be careful: if all Pods become unready together, the Service has no endpoints.
- Use a startup probe for slow starters instead of a long `initialDelaySeconds`.
- Set timeouts shorter than the period, and thresholds that tolerate a short delay.

## Metrics

The **metrics server** gives `kubectl top` and feeds the horizontal Pod autoscaler with CPU and memory use. It is not a monitoring system and keeps no history. For history and alerts, run Prometheus (or a compatible service) that scrapes:

- node and Pod resource use (cAdvisor, kubelet)
- cluster object state (`kube-state-metrics`: Pod phase, restarts, Deployment replicas)
- your applications, which expose `/metrics` and are discovered through annotations or `ServiceMonitor` objects

```console
$ kubectl top pods -n shop --sort-by=memory
NAME           CPU(cores)   MEMORY(bytes)
api-7d9f-abc   180m         410Mi
$ kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes | head -c 200
```

Useful alerts: Pods restarting repeatedly, containers near their memory limit, Deployments with fewer available replicas than desired, nodes not ready, and persistent volumes nearly full.

## Logging

Applications write to standard output, and the node keeps the files under `/var/log/containers`. Those files are rotated and disappear with the Pod, so run a node-level agent (a DaemonSet such as Fluent Bit or Vector) that ships logs to central storage with labels for namespace, Pod and container. Also collect cluster events, because `kubectl get events` forgets after about an hour.

```bash
kubectl logs deploy/api --since=15m --all-containers
kubectl logs api-7d9f-abc --previous
kubectl get events -A --sort-by=.lastTimestamp | tail -20
```

Write structured logs with a request or trace id, and avoid logging secrets and personal data.

```predict
Q: A liveness probe calls /health, which checks the database. The database goes down. What happens?
???
All Pods fail liveness and are restarted repeatedly, which adds load and delays recovery once the database returns.
> Keep liveness limited to the process. Put dependency checks in readiness, or in alerts.
```

## Incident: the restart storm

> **Incident:** A short database failover causes every API Pod to restart, and the service stays down for ten minutes after the database is back.

```console
$ kubectl get pods -l app=api
api-7d9f-abc   0/1   Running   9 (20s ago)
$ kubectl describe pod api-7d9f-abc | grep -A2 Liveness
Liveness probe failed: HTTP probe failed with statuscode: 500
```

The liveness endpoint ran a database query. During failover it failed, all Pods were killed, and they then started together and overloaded the database. The team changed liveness to a simple process check, kept the database check in readiness with a lenient threshold, added a startup probe, and alerted on restart rate.

## Common mistakes

- Liveness probes that check dependencies
- No readiness probe, so traffic goes to Pods still starting
- Treating the metrics server as monitoring
- Only collecting logs from Pods that still exist

```quiz
Q: What happens to a Pod that fails its readiness probe?
- It is restarted :: That is liveness.
+ It is removed from Service endpoints until it passes
- It is deleted :: It stays.
- Nothing :: Traffic is stopped.
> Readiness controls traffic, not restarts.

Q: Why should a liveness probe avoid checking the database?
+ A database failure would restart every Pod and make recovery harder
- It is slower :: Not the main reason.
- It uses more memory :: Not the main reason.
- Databases cannot be probed :: They can.
> Liveness should detect a stuck process only.

Q: What is the metrics server used for?
- Long-term storage :: It keeps no history.
+ Current CPU and memory data for kubectl top and autoscaling
- Logs :: Unrelated.
- Alerts :: It sends none.
> Use Prometheus for history and alerts.

Q: Why run a log agent as a DaemonSet?
+ One agent per node can collect logs from every Pod on that node
- It encrypts Pods :: Unrelated.
- It schedules Pods :: Unrelated.
- It replaces etcd :: Unrelated.
> Node-level collection survives Pod deletion.
```

```cards
Which probe controls traffic? :: Readiness
Which probe restarts a container? :: Liveness
What is a startup probe for? :: Slow-starting apps
What does kube-state-metrics export? :: State of Kubernetes objects
Where do container logs live on a node? :: /var/log/containers
```
