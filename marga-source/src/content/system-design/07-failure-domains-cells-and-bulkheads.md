---
title: Failure domains, cells and bulkheads
minutes: 15
summary: Divide a system so one fault can only reach a bounded part of it, using zones, cells and bulkheads.
---

A big shared system fails big. The way to bound the damage is to decide in advance what can fail together and keep the rest apart. A failure domain is the set of things one cause can take down. Your design is mostly a list of failure domains and the walls between them.

## What you will learn

- Name failure domains: process, host, rack, zone, region, provider, change
- Build cells and bulkheads so a fault cannot spread
- Spot shared dependencies that silently join domains
- Size a cell and route users to one

## Failure domains

A process crash, a host, a rack, a power feed, a data centre or availability zone, a region, a cloud provider. There are also non-physical domains: a deploy that goes to everything at once, a shared configuration file, a shared certificate, a shared control plane. The last group causes more large outages than lightning does. Spreading across zones helps against a data centre fault and does nothing against a bad configuration pushed to all zones at once.

## Cells

A **cell** is a complete, independent copy of the service for a slice of users. Each cell has its own compute, queues and data. A router sends each customer to exactly one cell. If a cell fails, only its share of users is affected: with 10 cells, a cell fault reaches about 10 percent. Cells also give a safe place to roll out: update one cell, watch, then the next. Capacity grows by adding cells rather than making one cell larger, so the biggest thing you operate stays a known, tested size.

Cell design rules: cells do not call each other; the router is thin and highly reliable (it is the shared part, so keep it simple); a customer's data lives in one cell; keep a hard maximum size and test at it.

## Bulkheads

Named after ship compartments. Inside one service, separate resources so one noisy part cannot drain the rest: a separate thread or connection pool per dependency, separate queues for critical and bulk work, separate rate limits per tenant. Without bulkheads, one slow dependency uses all threads and the whole service stalls, including paths that never needed it.

## Hidden shared dependencies

Cells and zones are undone by what they share: one database, one DNS provider, one identity service, one configuration store, one deploy pipeline. Draw the dependency graph and mark each node shared or per-cell. Every shared node is a place where cells fail together. In 2021 Roblox's Consul cluster was shared by many services and the outage lasted 73 hours; in 2025 Cloudflare Workers KV relied on a third-party storage provider, and many products failed with it. See the case files.

## Static stability

A cell should keep running when its control plane is gone. Pre-provision capacity, cache configuration locally and avoid needing an API call to keep serving. Recovery should not depend on the thing that is broken.

```predict
Q: You run 20 identical stateless instances behind one load balancer and one database. What are your failure domains?
???
Effectively one. The shared database and the load balancer fail all 20 together, and a bad deploy reaches all of them. Splitting instances alone adds capacity, not isolation.
> Count what is shared, not how many copies you have.
```

## How it fails

Cells fail when the router fails, when a "global" dependency sneaks in, or when a deploy hits every cell at once. Bulkheads fail when pools are sized so large they still exhaust the host.

## Incident: Three zones, one bad config

> **Incident:** A service ran in three zones for resilience. A configuration change was applied to all three at once and all three crashed.

```console
$ for z in a b c; do kubectl --context zone-$z get pods -l app=api | grep -c CrashLoop; done
24
24
24
```

This is a simulated illustration. Real cases with the same shape include Cloudflare's November 2025 bot management feature file, which reached the whole proxy fleet, and Microsoft Azure Front Door in October 2025. Spreading across zones did not help because the change was the shared domain. A staged rollout cell by cell would have limited it.

## Interview question

"Design for 99.99 percent availability." Start with cells and independent deployment, then ask what is shared and how changes are staged. Zones alone do not reach it.

## Common mistakes

- Counting replicas and calling it isolation
- Cells that call each other
- One global config or control plane everywhere at once
- No hard limit on cell size

```quiz
Q: What is a cell?
+ A complete independent copy of the service serving a slice of users
- A single container :: Too small and not independent.
- A database table :: No.
- A load balancer rule :: No.
> Customers map to one cell.

Q: A fault in one of 10 equal cells affects roughly what share of users?
+ About 10 percent
- All of them :: That is the shared design.
- 50 percent :: No.
- 1 percent :: Only with 100 cells.
> Correct: About 10 percent. Re-read the matching lesson section for the full reasoning.

Q: What is a bulkhead inside a service?
+ Separate resource pools so one slow dependency cannot use everything
- A firewall rule :: No.
- A backup :: No.
- A cache :: No.
> Correct: Separate resource pools so one slow dependency cannot use everything. Re-read the matching lesson section for the full reasoning.

Q: Why do zones not protect against a bad config rollout?
+ The change is a failure domain that spans all zones
- Zones share a disk :: Not the point.
- Zones are slow :: No.
- Configs are encrypted :: No.
> Correct: The change is a failure domain that spans all zones. Re-read the matching lesson section for the full reasoning.
```

```cards
failure domain :: what one cause can take down together
cell :: independent full copy for a slice of users
bulkhead :: separate pools to contain a slow part
shared dependency :: node that joins domains
static stability :: keeps serving without the control plane
router :: thin layer mapping users to cells
```
