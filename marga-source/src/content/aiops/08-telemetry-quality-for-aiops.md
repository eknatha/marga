---
title: Telemetry quality: the data AIOps depends on
minutes: 12
summary: Fix the data before the model: consistent names, labels, timestamps and completeness so machine learning on operations data can work.
---

Machine learning finds patterns in what you give it. If service names differ between tools, timestamps drift or half the metrics are missing, the result is confident nonsense. The first AIOps project is usually a data project.

## What you will learn

- Naming and labeling conventions that join data together
- Time, clocks and missing data
- A service catalog as the common key
- Measuring data quality

## Consistent names

Use one name per service across metrics, logs, traces and tickets, with standard labels such as `service`, `env`, `team` and `version`. Follow common conventions rather than inventing your own.

```yaml
# OpenTelemetry resource attributes used everywhere
service.name: checkout
service.version: 2.8.1
deployment.environment: prod
team: payments
```

## Time and gaps

Correlating events needs clocks that agree. Use NTP or chrony, store timestamps in UTC and check skew. Gaps matter too: a metric that stops reporting looks like zero or like an anomaly, depending on the tool.

```promql
# which scrape targets stopped reporting
up == 0
# metrics with too many label combinations
topk(10, count by (__name__) ({__name__=~".+"}))
```

## Catalog and ownership

A **service catalog** lists every service with owner, tier, dependencies and runbook. Telemetry and incident tools use it to join signals and to route alerts. Without it, machine learning cannot tell which team to notify.

## Measure quality

Track the share of services with complete labels, the number of unnamed or duplicate services, scrape success rate and log parsing success. Treat falling data quality like any other incident source, and review it monthly.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Telemetry quality: the data AIOps depends on fits together
node: n1 | Consistent names | 0 | 0 | Use one name per service across metrics, logs, traces and tickets, with standard labels such as service, env, team and version. | Different names for one service. | process
node: n2 | Time and gaps | 1 | 1 | Correlating events needs clocks that agree. | Clock skew between hosts. | process
node: n3 | Catalog and ownership | 2 | 0 | A service catalog lists every service with owner, tier, dependencies and runbook. | Buying AIOps tools before fixing data. | observe
node: n4 | Measure quality | 3 | 1 | Track the share of services with complete labels, the number of unnamed or duplicate services, scrape success rate and log parsing success. | No owner metadata on services. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Five names for one service

> **Incident:** The same service appeared under different names in metrics, logs and traces.

```console
metrics:   service="checkout-svc"
logs:      app="Checkout"
traces:    service.name="checkout_api"
incidents: component="payments-checkout"
```

Correlation produced nothing because the data would not join. The team created a catalog with one canonical name, mapped old names for a transition period and enforced labels in the collection pipeline.

## Common mistakes

- Buying AIOps tools before fixing data
- Different names for one service
- Clock skew between hosts
- No owner metadata on services

```quiz
Q: What does a service catalog provide?
+ A common key and ownership
- More disk space :: No.
- A new database :: No.
- A faster network :: No.
> It joins signals and routes alerts.

Q: Why check clocks?
+ Correlating events needs agreeing time
- Clocks are optional :: No.
- To save logs :: No.
- To change names :: No.
> Skew breaks correlation.

Q: What does a missing metric look like to a model?
+ Zero or an anomaly
- Nothing at all :: No.
- A new service :: No.
- A fix :: No.
> Gaps need explicit handling.

Q: What is a good first AIOps project?
+ Fixing data quality
- Buying a dashboard :: No.
- Deleting alerts :: No.
- Replacing engineers :: No.
> Data decides results.
```

```cards
Service catalog :: Inventory of services with owners and dependencies
Semantic conventions :: Standard names for telemetry attributes
Clock skew :: Difference between system clocks
Data quality :: How complete and consistent your telemetry is
```
