## Pods stuck in Pending
module: kubernetes
level: Intermediate
minutes: 7
lesson: kubernetes/scheduling-and-troubleshooting
summary: New pods will not start after a node pool change. Read events, resources, taints and quotas.
intro: After the platform team replaced a node pool, ten new pods of the payments service stay in Pending. The old pods still run.

### s1
text: You see the pods in Pending. What is your first command?
- kubectl describe pod, and read the Events section at the bottom => s2 | 2 | The scheduler writes the reason for not placing a pod. Example: 0/6 nodes are available: 3 Insufficient cpu, 3 node(s) had untolerated taint.
- kubectl delete pod and hope => s2 | 1 | The replacement stays Pending for the same reason. Example: nothing changes except lost time.
- Restart the cluster => s2 | 0 | It is dramatic and not needed. Example: running workloads are disrupted for no reason.

### s2
text: Events say 3 nodes have Insufficient cpu and 3 have an untolerated taint (dedicated=batch:NoSchedule). What do you check next?
- The pod CPU requests, free allocatable capacity on nodes and the tolerations of the pod => s3 | 2 | The scheduler uses requests, not actual usage. Example: each pod requests 2 CPUs and the nodes have 1.5 free.
- The container image => s3 | 1 | An image problem shows as ImagePullBackOff, not Pending. Example: the pod would be scheduled first.
- The cluster DNS => end-fail | 0 | DNS is not involved in scheduling. Example: pods start fine on existing nodes.

### s3
text: The new pool is tainted for batch jobs, and the old pool was removed. Payments has no toleration. What is a clean fix?
- Make a node pool for general workloads without the taint, or add a toleration only if payments should run on batch nodes => s4 | 2 | A taint repels pods that do not tolerate it. Example: add a general pool of 3 nodes, so payments schedules without special rules.
- Remove all taints from every node => s4 | 0 | Batch jobs would then run beside payments and compete for resources. Example: a nightly job starves checkout.
- Set the replicas to 1 => s4 | 1 | It reduces pods and availability. Example: one pod cannot survive a node loss.

### s4
text: Capacity exists now, but one pod stays Pending: "exceeded quota: cpu". What is that?
- A ResourceQuota on the namespace limits total CPU requests => s5 | 2 | Quotas cap what a team can request. Example: the namespace allows 20 CPUs, 20 are already requested by existing pods.
- A broken scheduler => end-fail | 0 | The scheduler is fine and enforcing a rule. Example: the message names the quota.
- A bug in the image => s5 | 1 | The pod has not started yet. Example: no container logs exist.

### s5
text: You raise the quota after approval. How do you prevent the next surprise?
- Alert on pending pods and on quota usage, and document node pool taints and ownership => end-win | 2 | Visibility turns surprises into planned work. Example: an alert fires when pods stay Pending for 5 minutes.
- Ask people to avoid change => end-fail | 0 | Change is constant. Example: the next pool change repeats the problem.
- Give every team unlimited quota => end-ok | 1 | It removes the guardrail. Example: one runaway job consumes the cluster.

### end-win
end: win
text: All pods run. Pending pods now alert within minutes, and pool taints are documented with owners.
takeaway: Pending means the scheduler has a reason. Read events, then compare requests, taints and quotas.

### end-ok
end: ok
text: The pods run, though the cause could repeat on the next change.
takeaway: Capture what you learned in alerts and docs.

### end-fail
end: fail
text: Pods stayed Pending and the wrong fix, such as removing taints, created a second problem.
takeaway: Do not change cluster-wide rules before reading the reason.

## Evicted under pressure
module: kubernetes
level: Advanced
minutes: 7
lesson: kubernetes/resources-and-quotas
summary: Pods are killed or evicted at peak. Learn requests, limits, QoS classes and OOM kills.
intro: During the afternoon peak, API pods restart with OOMKilled and some are evicted. Customers see random errors.

### s1
text: Pods show OOMKilled and Evicted. What does each tell you?
- OOMKilled means a container went over its memory limit, Evicted means the node ran short and removed pods => s2 | 2 | They are different events with different fixes. Example: OOMKilled shows exit code 137 in the container state, Evicted appears in pod status with a reason.
- They are the same thing => s2 | 0 | Treating them as one hides the cause. Example: raising limits does not stop node-level eviction.
- Both mean the node is broken => s2 | 1 | The node may be healthy and overcommitted. Example: its hardware is fine.

### s2
text: Pods have no memory requests and no limits. What QoS class do they get, and what follows?
- BestEffort, so they are the first to be evicted under pressure => s3 | 2 | No requests means no guarantee. Example: when memory runs low, BestEffort pods go before Burstable and Guaranteed.
- Guaranteed => end-fail | 0 | Guaranteed requires equal requests and limits for every resource. Example: requests=limits=512Mi.
- No class => s3 | 1 | Every pod has a class. Example: kubectl get pod -o yaml shows qosClass.

### s3
text: You measure real usage: 600 MiB typical, 900 MiB at peak. What do you set?
- Request about 700 MiB and set the limit near 1 GiB, based on measured usage => s4 | 2 | Requests reserve capacity, limits cap damage. Example: requests 700Mi, limits 1Gi leaves headroom without wasting the node.
- Limit 128 MiB to be safe => s4 | 0 | A limit below real use causes OOM kills. Example: the pod dies every time it reaches 128 MiB.
- Request 8 GiB to be sure => s4 | 1 | It wastes capacity and makes scheduling hard. Example: only two pods fit on a node.

### s4
text: A Java app still gets OOMKilled with a 1 GiB limit, though the heap is 1 GiB. Why?
- The process uses memory beyond the heap (metaspace, threads, buffers), so total memory exceeds the limit => s5 | 2 | The limit counts everything in the container. Example: heap 1 GiB plus 300 MiB of other memory needs a limit of about 1.5 GiB, or a smaller heap such as 700 MiB.
- Kubernetes counts memory wrongly => end-fail | 0 | It counts the cgroup usage correctly. Example: kubectl top shows the total.
- The limit is ignored => s5 | 1 | The limit is enforced and that is why it was killed. Example: exit code 137.

### s5
text: Stable now. How do you keep sizing right over time?
- Review usage metrics, add autoscaling, and use a quota plus alerts on restarts and evictions => end-win | 2 | Usage changes with traffic and releases. Example: a vertical or horizontal autoscaler plus a dashboard of memory against requests.
- Set the numbers once and forget => end-ok | 1 | Sizing drifts. Example: a new feature raises memory by 30 percent and the old limit fails again.
- Remove all limits => end-fail | 0 | One leak can take down a node. Example: a memory leak starves neighbour pods.

### end-win
end: win
text: Requests and limits match measured use, restarts are rare, and an alert catches drift.
takeaway: Requests schedule, limits protect, and real measurements decide both.

### end-ok
end: ok
text: The cluster is steadier, but sizing is still guesswork.
takeaway: Use metrics to size, then keep checking.

### end-fail
end: fail
text: Restarts continued and capacity was wasted or still unsafe.
takeaway: Guessing resource numbers either breaks pods or wastes money.

