---
title: FinOps: Kubernetes cost allocation and resource requests
minutes: 13
summary: Show which team and workload costs what in a shared cluster, set requests and limits from real usage, and use autoscaling and node choices to cut idle capacity.
---

In a shared cluster the cloud bill shows nodes, not teams. A pod that asks for 8 CPUs and uses 0.3 still blocks the capacity it requested. Kubernetes cost work therefore starts with requests, because the scheduler packs by what pods ask for, not by what they use.

## What you will learn

- Why requests, not usage, decide how many nodes you pay for
- Allocate node cost to namespaces and workloads
- Set requests from observed usage and use autoscalers
- Find idle capacity and fix bin-packing problems

## Requests drive node count

The scheduler places a pod on a node if the node has enough **unrequested** CPU and memory. If teams copy large requests "to be safe", nodes look full while real utilization is low, and the cluster autoscaler adds more nodes. The gap between requested and used resources is waste you pay for. Compare the two for each workload.

```console
$ kubectl top pods -A --sort-by=cpu | head
$ kubectl get pods -A -o custom-columns=NS:.metadata.namespace,POD:.metadata.name,CPUREQ:.spec.containers[*].resources.requests.cpu,MEMREQ:.spec.containers[*].resources.requests.memory | head
$ kubectl describe node node-a | grep -A6 "Allocated resources"
```

`kubectl top` needs the metrics server and shows current use only. For decisions use a longer window from your monitoring system (for example the 95th percentile over two weeks).

## Allocate cost to teams

Split node cost by what each workload reserves (requests), blended with usage where available. Group by the labels `team`, `service` and `env` that you require on every namespace and workload. Tools such as OpenCost, Kubecost and the cloud providers' own allocation features calculate this, and add the shared and idle parts: unrequested node capacity is **idle cost**, spread across teams by an agreed rule or reported separately. Show each team their share weekly, next to their unit cost.

## Set requests and limits well

- **Memory**: set the request close to the working set plus headroom, and a limit at or slightly above it, since memory cannot be shared by throttling and over-use means a kill.
- **CPU**: set a request at typical load. Be careful with tight CPU limits, which can throttle latency-sensitive services even when the node has spare CPU. Many teams set requests but no CPU limit.
- Use the **Vertical Pod Autoscaler** in recommendation mode to learn sensible values, and the **Horizontal Pod Autoscaler** to change replica counts with load.
- Use **ResourceQuotas** and **LimitRanges** per namespace so one team cannot reserve the whole cluster.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-checkout
  namespace: checkout
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 160Gi
    limits.memory: 200Gi
```

## Nodes and packing

Mix node sizes to fit pod shapes, use autoscalers that choose instance types for pending pods (such as Karpenter), consolidate underused nodes, and run fault-tolerant workloads on spot pools. Pod disruption budgets make consolidation safe. Look at DaemonSets as well: ten small agents on every node add up on big fleets.

```predict
Q: A node shows 90 percent of CPU requested but 15 percent used. The autoscaler keeps adding nodes. What do you fix?
???
The requests are too large. Lower them to match observed usage with headroom, and the same pods fit on fewer nodes.
> Requests, not usage, drive scheduling.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How FinOps: Kubernetes cost allocation and resource... fits together
node: n1 | Requests drive node count | 0 | 0 | The scheduler places a pod on a node if the node has enough unrequested CPU and memory. | Large requests "just in case". | client
node: n2 | Allocate cost to teams | 1 | 1 | Split node cost by what each workload reserves (requests), blended with usage where available. | Tight CPU limits that throttle a latency-sensitive service. | process
node: n3 | Set requests and limits well | 2 | 0 | Memory: set the request close to the working set plus headroom, and a limit at or slightly above it, since memory cannot be shared by throttling and over-use means a... | No quotas, so one namespace takes the cluster. | client
node: n4 | Nodes and packing | 3 | 1 | Mix node sizes to fit pod shapes, use autoscalers that choose instance types for pending pods (such as Karpenter), consolidate underused nodes, and run fault-tolerant... | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Forty nodes for the work of twelve

> **Incident:** A cluster grew from 12 to 40 nodes over a quarter, while traffic grew by only 20 percent.

```console
$ kubectl describe node ip-10-0-3-41 | grep -A5 "Allocated resources"
  cpu      15700m (98%)
  memory   52Gi (83%)
$ kubectl top node ip-10-0-3-41
cpu 2100m (13%)   memory 21Gi (33%)
```

Teams had copied a template with 4 CPU and 8 GiB requests per pod, and pods used a fraction of it. The nodes were full on paper and idle in practice. The team ran a recommendation pass with VPA, lowered requests by workload in steps, added quotas and a monthly cost report per namespace, and the cluster settled at 16 nodes with the same traffic and no new incidents.

## Common mistakes

- Large requests "just in case"
- Reading `kubectl top` once and deciding
- Tight CPU limits that throttle a latency-sensitive service
- No quotas, so one namespace takes the cluster

```quiz
Q: What decides how many pods fit on a node?
+ The pods' resource requests
- Their actual CPU use at that moment :: The scheduler uses requests.
- Their names :: Irrelevant.
- The image size :: Not the main factor.
> Requests are the scheduling currency.

Q: What is idle cost in a cluster?
+ The cost of node capacity that nobody has requested
- The cost of stopped pods only :: Too narrow.
- The cost of DNS :: Unrelated.
- The cost of logs only :: Unrelated.
> It is paid for but not allocated.

Q: What is a risk of a very low CPU limit?
+ The service may be throttled and slow even if the node is idle
- It may be killed by the OOM killer :: That is for memory.
- It cannot be scheduled :: Limits do not prevent scheduling.
- It loses its IP :: Unrelated.
> CPU limits enforce throttling.

Q: How do you find sensible request values?
+ Measure usage over a long window and add headroom, for example with VPA recommendations
- Copy the largest value from a template :: Wasteful.
- Use zero :: Poor scheduling and eviction risk.
- Guess once and never revisit :: Drifts.
> Use data, review regularly.
```

```cards
Requests :: what the scheduler reserves, and what you pay for
Idle cost :: unrequested node capacity
VPA :: recommends request values from usage
ResourceQuota :: caps what a namespace may request
Karpenter style :: picks node types for pending pods and consolidates
```
