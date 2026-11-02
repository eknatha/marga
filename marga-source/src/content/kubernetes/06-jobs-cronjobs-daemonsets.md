---
title: Jobs, CronJobs, DaemonSets and StatefulSet patterns
minutes: 15
summary: Choose the right workload controller for batch work, scheduled tasks and per-node agents, and configure retries, concurrency, history and cleanup.
---

Not every workload is a web server that runs forever. Database migrations run once, reports run nightly, and log collectors must run on every node. Kubernetes has a controller for each pattern, and picking the wrong one produces duplicated work, missed runs or Pods that never finish.

## What you will learn

- Jobs for run-to-completion work, with retries and parallelism
- CronJobs for scheduled work, and their concurrency and history settings
- DaemonSets for one Pod per node
- How to pick between Deployment, StatefulSet, Job and DaemonSet

## Jobs

A **Job** creates Pods and keeps retrying until a set number complete successfully. The Pod's restart policy must be `Never` or `OnFailure`.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  namespace: shop
spec:
  backoffLimit: 3
  activeDeadlineSeconds: 600
  ttlSecondsAfterFinished: 3600
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: registry.example.com/shop/api:1.8.2
          command: ["python", "manage.py", "migrate"]
          envFrom:
            - secretRef:
                name: shop-db
```

`backoffLimit` caps retries before the Job is marked failed. `activeDeadlineSeconds` kills a Job that runs too long. `ttlSecondsAfterFinished` deletes the finished Job and its Pods automatically, so completed objects do not accumulate. For parallel work, set `completions` and `parallelism`, for example 10 completions with 3 running at a time.

```console
$ kubectl apply -f job.yaml
$ kubectl get jobs -n shop
$ kubectl logs job/db-migrate -n shop
$ kubectl describe job db-migrate -n shop | tail -8
$ kubectl wait --for=condition=complete job/db-migrate -n shop --timeout=300s
```

## CronJobs

A **CronJob** creates a Job on a schedule, using the same five-field syntax as cron.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
  namespace: shop
spec:
  schedule: "30 2 * * *"
  timeZone: "Etc/UTC"
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 600
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: registry.example.com/shop/report:2.4.0
              args: ["--date", "yesterday"]
```

`concurrencyPolicy` decides what happens if the previous run is still going: `Allow` runs them together, `Forbid` skips the new one, and `Replace` kills the old one. Use `Forbid` for most jobs. `startingDeadlineSeconds` lets a missed run start late within the window. History limits keep recent Jobs around so you can read their logs.

```console
$ kubectl get cronjob -n shop
$ kubectl create job manual-report --from=cronjob/nightly-report -n shop
$ kubectl patch cronjob nightly-report -n shop -p '{"spec":{"suspend":true}}'
```

## DaemonSets

A **DaemonSet** runs one Pod on every node, or on every node that matches a selector. New nodes get the Pod automatically, and removed nodes lose it. Typical uses are log shippers, metric exporters, storage drivers and network plugins.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      tolerations:
        - operator: Exists
      containers:
        - name: exporter
          image: prom/node-exporter:v1.8.2
          ports:
            - containerPort: 9100
              hostPort: 9100
```

Because control-plane nodes and special nodes carry taints, a DaemonSet needs `tolerations` to run there. Use resource requests so an agent cannot starve the workloads it monitors.

## Picking the right controller

| Need | Use |
|------|-----|
| Stateless service, interchangeable replicas | Deployment |
| Stable identity and storage per replica | StatefulSet |
| Run to completion once | Job |
| Run on a schedule | CronJob |
| One copy per node | DaemonSet |

## Incident: the report that ran twice and doubled the invoices

> **Incident:** A nightly invoicing CronJob takes longer than usual because of a slow database. At the next scheduled time the controller starts a second Job while the first is still running. Both read the same unprocessed invoices and customers are billed twice.

The default `concurrencyPolicy: Allow` permits overlap, and the job was not idempotent. Inspect and fix:

```console
$ kubectl get jobs -n billing --sort-by=.metadata.creationTimestamp | tail -3
$ kubectl get cronjob invoicing -n billing -o jsonpath='{.spec.concurrencyPolicy}'
Allow
$ kubectl patch cronjob invoicing -n billing -p '{"spec":{"concurrencyPolicy":"Forbid"}}'
```

Set `Forbid`, make the work idempotent by marking each invoice as claimed in a transaction, add an `activeDeadlineSeconds`, and alert if a run takes longer than expected.

## Common mistakes

- Using `restartPolicy: Always` in a Job template, which is invalid
- Leaving finished Jobs forever instead of setting a TTL
- Allowing overlap on jobs that are not idempotent
- Forgetting tolerations so a DaemonSet misses tainted nodes
- Assuming CronJob times are in your local timezone

```quiz
Q: Which controller runs one Pod on every node?
- Deployment
- Job
+ DaemonSet
- StatefulSet
> DaemonSets ensure a copy on each matching node, including new ones.

Q: What does concurrencyPolicy: Forbid do?
- Stops the CronJob permanently
+ Skips a new run if the previous one is still running
- Kills the previous run
- Runs both at once
> It prevents overlapping executions.

Q: What does ttlSecondsAfterFinished do?
+ Deletes a completed Job and its Pods after the given time
- Limits how long the Job may run
- Retries failed Pods
- Sets the schedule
> It cleans up finished Jobs automatically.

Q: Why does a DaemonSet often need tolerations?
- To get more CPU
+ To run on nodes that have taints, such as control-plane nodes
- To change its image
- To pull from private registries
> Tolerations allow scheduling onto tainted nodes.
```

```cards
Valid restartPolicy values for a Job Pod? :: Never or OnFailure
How to run a CronJob once now? :: kubectl create job NAME --from=cronjob/CRONJOB
What does backoffLimit set? :: The number of retries before a Job is marked failed
Why make batch jobs idempotent? :: Retries and overlaps must not repeat side effects
```
