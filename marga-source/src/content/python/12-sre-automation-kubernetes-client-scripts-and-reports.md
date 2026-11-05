---
title: SRE automation: Kubernetes client scripts and reports
minutes: 12
summary: Use the official Python client to list workloads, find unhealthy pods and missing limits, and produce reports without scripting kubectl output.
---

`kubectl` is perfect for people. For scheduled reports and safe automation, a Python script using the API client gives you structured data, real error handling and tests. This lesson builds a small report you could run daily.

## What you will learn

- Load cluster configuration inside and outside the cluster
- List pods and read their status as structured objects
- Find common problems: restarts, missing limits and pending pods
- Keep scripts read-only unless a change is explicitly requested

## Connecting

```python
from kubernetes import client, config

def api():
    try:
        config.load_incluster_config()
    except config.ConfigException:
        config.load_kube_config()
    return client.CoreV1Api()

v1 = api()
```

Inside a pod the client uses the service account token. Outside it reads your kubeconfig. Print the current context at start in laptop runs, since a script that changes the wrong cluster is a common accident.

## A health report

```python
def restarts(v1, namespace=None, threshold=5):
    pods = (v1.list_namespaced_pod(namespace) if namespace
            else v1.list_pod_for_all_namespaces())
    for p in pods.items:
        for cs in (p.status.container_statuses or []):
            if cs.restart_count >= threshold:
                reason = cs.last_state.terminated.reason if cs.last_state.terminated else ""
                yield p.metadata.namespace, p.metadata.name, cs.name, cs.restart_count, reason
```

The objects mirror the API: `metadata`, `spec`, `status`. Container statuses give restart counts and the reason for the last termination, such as `OOMKilled`. For large clusters pass `limit` and follow the `continue` token to page through results instead of loading everything at once.

## Policy checks

```python
def missing_limits(v1):
    for p in v1.list_pod_for_all_namespaces().items:
        for c in p.spec.containers:
            res = c.resources
            if not res or not res.limits or "memory" not in res.limits:
                yield p.metadata.namespace, p.metadata.name, c.name
```

Reports like this find pods without memory limits, images using `latest`, or pods pending for a long time. Write results as CSV or JSON so other tools can use them, and keep a stable sort order so day-to-day diffs are meaningful.

## Read-only by default

Give the service account only `get`, `list` and `watch` permissions on the resources it reports on. If a script must change something (for example cordon a node), ask for a flag, log what it changed, and use a separate, narrower role. Handle `ApiException`: a `403` means a permissions gap, a `404` often means someone already deleted the object, and a `429` or `5xx` should be retried with backoff.

```predict
Q: A report script uses list_pod_for_all_namespaces on a cluster with 40,000 pods and times out. What helps?
???
Request pages with the limit parameter and follow the continue token, or narrow by namespace or label selector.
> Page large lists.
```

## Incident: The report that missed the problem

> **Incident:** A daily report said "no restarts above threshold", yet a service was crash-looping all week.

```console
$ python report.py --threshold 5
0 containers above threshold
$ kubectl get pods -n shop
checkout-7c9   0/1   CrashLoopBackOff   2 (30s ago)   6m
```

The pod was recreated by its controller every few minutes after failing readiness, so the restart count of each new pod stayed low. The report counted restarts per pod, not per workload. The team changed it to also group by owner and report the number of distinct pods created in the last day, and to flag any workload whose pods are not ready. The count of restarts alone was the wrong signal.

## Common mistakes

- Parsing `kubectl` text output in scripts
- Running with cluster-admin for a read-only report
- Loading huge lists in one request
- Measuring a symptom at the wrong level (pod instead of workload)

```quiz
Q: How does the Python client authenticate inside a pod?
+ With the service account token via load_incluster_config
- With the user's SSH key :: Not used.
- With a hard-coded password :: Bad practice.
- With no authentication :: The API requires it.
> In-cluster config uses the service account.

Q: What does a 403 ApiException usually mean?
+ The service account lacks permission for that call
- The object does not exist :: That is 404.
- The server is overloaded :: That is 429 or 5xx.
- The network is down :: Different error.
> Check RBAC permissions for the account.

Q: How do you handle very large list calls?
+ Use limit and the continue token, or filter by namespace or label
- Request everything at once :: Can time out.
- Ignore errors :: Hides the problem.
- Run on a laptop only :: Does not change the API load.
> Paging keeps load predictable.

Q: Why group restarts by workload as well as by pod?
+ Replacement pods reset the per-pod count and hide a crash loop
- It makes the CSV smaller :: Not the reason.
- It avoids RBAC :: Unrelated.
- It speeds up the API :: Unrelated.
> Measure at the level where the problem lives.
```

```cards
load_incluster_config :: use the pod's service account
list_pod_for_all_namespaces :: cluster-wide pod list, page it on big clusters
Container status :: restart count and last termination reason
Read-only role :: get, list and watch only
ApiException codes :: 403 permission, 404 missing, 429 and 5xx retry
```
