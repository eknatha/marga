---
title: Topology and dependency-aware root cause
minutes: 14
summary: Use the service graph to explain why many things fail at once: walk the dependency edges, find the shared fault, and avoid blaming the loudest alert.
---

During an outage the service with the most alerts is rarely the cause. It is usually a victim, loud because it sits at the top of a chain. A dependency graph lets a tool reason the way an experienced engineer does: which broken thing, if it were the cause, would explain all the others?

## What you will learn

- What a dependency graph contains and where it comes from
- How to find the shared upstream cause of many failures
- How blast radius works in the other direction
- How to keep topology data fresh and what to do when it is wrong

## The graph

Nodes are services, databases, queues, hosts, clusters and external providers. Edges say "A calls B" or "A runs on B". Sources are service meshes, distributed traces, cloud inventory, Kubernetes ownership, and a service catalog. Traces give the most accurate call edges because they come from real traffic. A catalog gives owners and tiers. Use both.

## Finding the shared cause

Mark the failing nodes. For each candidate node, count how many failing nodes depend on it, directly or through others, and how many of its own dependencies are healthy. A node that is itself failing, with all of its dependencies healthy, and which sits upstream of many failing nodes is the best candidate. If checkout, cart and search all fail and all read from one database that is also failing, the database explains the three.

## Blast radius

The same graph answers a forward question: if this component fails, what is affected? Blast radius estimation helps prioritise during an incident ("this affects 14 services and 3 customer-facing flows") and supports change reviews before the incident ever happens.

## Health is not binary

A dependency can be degraded: slow but not down. Use latency and error signals per edge, not just up and down. Retries and timeouts can also move the symptom: a slow database makes callers time out, retry, and overload a third service that has nothing wrong with it. Rank by where the first abnormal signal appeared in time as well as by position in the graph.

```python
def ranked_causes(edges, failing):
    """edges: {service: [dependencies]}; failing: set of unhealthy services."""
    def downstream_failing(node):
        seen, stack = set(), [node]
        while stack:
            cur = stack.pop()
            for svc, deps in edges.items():
                if cur in deps and svc in failing and svc not in seen:
                    seen.add(svc)
                    stack.append(svc)
        return seen
    out = []
    for node in failing:
        healthy_deps = [d for d in edges.get(node, []) if d not in failing]
        deps = edges.get(node, [])
        if len(healthy_deps) == len(deps):
            out.append((len(downstream_failing(node)), node))
    return sorted(out, reverse=True)

edges = {
    "web": ["checkout", "search"],
    "checkout": ["orders-db", "payments"],
    "search": ["orders-db"],
    "payments": [],
    "orders-db": [],
}
print(ranked_causes(edges, {"web", "checkout", "search", "orders-db"}))
```

The function keeps only failing nodes whose own dependencies are all healthy, then ranks them by how many failing services depend on them. In this example the database explains three failures and is ranked first.

## When topology is wrong

Graphs go stale: services are renamed, new calls appear, a team adds a direct database connection that bypasses the usual path. Compare the catalog with trace data regularly and report edges that exist in only one. Show the responder the path the tool used, so a wrong edge is easy to spot and report. A hint that explains itself earns trust.

```diagram
title: Walking the dependency graph to a shared cause
node: web | Web frontend | 0 | 1 | Customer facing, shows errors first. | Loudest alert, but only a victim. | client
node: co | Checkout | 1 | 0 | Calls orders-db and payments. | Fails because its database fails. | service
node: se | Search | 1 | 2 | Reads from orders-db. | Fails for the same reason. | service
node: pay | Payments | 2 | 0 | Healthy in this incident. | Wrongly blamed because checkout calls it. | external
node: db | Orders database | 2 | 1 | Shared by checkout and search. | The real shared cause. | store
edge: web | co
edge: web | se
edge: co | db
edge: se | db
edge: co | pay
```

## Incident: Blaming the loudest service

> **Incident:** The web frontend paged first with the highest error count, and the first fifteen minutes went to its team.

```console
$ rcagraph explain --incident INC-4412
failing: web, checkout, search, orders-db
candidates with healthy dependencies: orders-db (explains 3), payments (explains 0)
first abnormal signal: orders-db p99 latency, 09:41:10
(this is a simulated illustration, not a real incident)
```

The graph pointed to the shared database, and its latency rose first. A runaway report query was holding locks. Ending the query cleared the incident, and the team added the database to the top of the incident dashboard.

## Common mistakes

- Treating the loudest service as the cause
- Using a stale catalog as the only source of edges
- Modelling health as up or down only
- Ignoring when each signal first appeared
- Hiding the path the tool used

```quiz
Q: Which node is the best root-cause candidate?
+ A failing node with healthy dependencies that many failing services depend on
- The service with the most alerts :: Often a victim.
- The newest service :: Age is irrelevant.
- The service owned by the on-call team :: Ownership is not evidence.
> It explains the others and has no failing cause of its own upstream.

Q: What is blast radius?
+ The set of components affected if one fails
- The size of a data centre :: Not meant.
- The number of alerts :: A symptom.
- The time to fix :: Different measure.
> It is the forward view of the dependency graph.

Q: Why are traces a good source of edges?
+ They record real calls from real traffic
- They are always complete :: Sampling can miss edges.
- They replace the catalog :: They add owners poorly.
- They are cheaper than all other sources :: Not the reason.
> Use traces for call edges and a catalog for ownership.

Q: Why show the path behind a hint?
+ So a wrong edge or a stale graph is easy to spot
- To make the screen busier :: No.
- To avoid storing data :: Unrelated.
- To skip review :: It supports review.
> An explained hint can be checked and corrected.
```

```cards
Dependency graph :: A map of which components call or run on which others
Blast radius :: Everything affected if a component fails
Shared cause :: One failing component that explains several failures
Service catalog :: A register of services with owners and tiers
Degraded :: Working but slow or partly failing
```
