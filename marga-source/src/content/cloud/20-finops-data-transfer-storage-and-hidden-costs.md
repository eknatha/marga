---
title: FinOps: data transfer, storage tiers and hidden costs
minutes: 12
summary: Spot the costs that surprise teams, such as cross-zone and egress traffic, NAT gateways, log ingestion and storage classes, and design to reduce them.
---

Compute is easy to see. The surprises are in the less visible lines: data moving between zones and out to the internet, a NAT gateway that processes every byte, logs billed per gigabyte, and storage kept at the most expensive tier. These costs scale with traffic and design choices, so architecture reviews are the best place to control them.

## What you will learn

- Which data transfer paths are billed and which are usually free
- Why NAT gateways, load balancers and cross-zone traffic add up
- Storage classes, lifecycle rules and retention
- Observability and logging cost control

## Data transfer paths

Rules differ by provider and change over time, so check the current price pages, but the pattern is stable:

- Inbound traffic from the internet is usually free.
- Outbound traffic (**egress**) to the internet is billed per GB, often at the highest rate.
- Traffic **between regions** is billed, and **between availability zones** is often billed in each direction.
- Traffic inside one zone over private addresses is usually free.
- Using a CDN can cut origin egress and improve latency.

So an architecture that spreads chatty services across three zones, or replicates data to another region, pays for every byte that crosses. That can still be the right choice for resilience, but it should be a conscious one.

## NAT gateways and managed services

A managed NAT gateway charges an hourly fee and a per-GB processing fee on all traffic through it. Services that pull large images, packages or backups from the internet or from provider services through NAT can create a very large bill. Mitigations: use **VPC gateway or private endpoints** for storage and registry traffic, cache images and packages inside the network, and place chatty components in the same zone when resilience allows (zone-aware routing in Kubernetes can reduce cross-zone calls).

```console
$ aws ce get-cost-and-usage --time-period Start=2026-03-01,End=2026-04-01 --granularity MONTHLY --metrics UnblendedCost --filter '{"Dimensions":{"Key":"USAGE_TYPE_GROUP","Values":["EC2: Data Transfer - Inter AZ"]}}'
```

## Storage tiers and lifecycle

Object storage has classes from hot to archive, with lower price per GB but retrieval fees, minimum storage periods and slower access. Use lifecycle rules to move data by age, expire temporary data and abort incomplete multipart uploads. Turn on versioning only with a rule to expire old versions. For block volumes, delete after use, choose the volume type by actual IOPS need, and expire old snapshots.

```yaml
Rules:
  - ID: tier-and-expire-logs
    Status: Enabled
    Filter:
      Prefix: logs/
    Transitions:
      - Days: 30
        StorageClass: STANDARD_IA
    Expiration:
      Days: 365
    AbortIncompleteMultipartUpload:
      DaysAfterInitiation: 7
```

## Logs, metrics and traces

Ingest volume is often the biggest part of observability cost. Reduce it by dropping debug logs in production, sampling traces, limiting metric cardinality (labels with unbounded values such as user ids multiply series), and setting retention by value: short for verbose data, long only for audit logs. Put costs per team on the dashboard so teams see what their logging costs.

```predict
Q: A service in zone A calls a cache in zone B ten thousand times per second. What cost appears and what are your options?
???
Cross-zone data transfer is billed per GB. Run the cache in each zone and route locally, or accept the cost knowingly for the resilience benefit.
> Zone placement has a price tag.
```

## Incident: The NAT bill

> **Incident:** A small company saw its networking line become larger than its compute after a nightly job was moved into private subnets.

```console
$ aws ce get-cost-and-usage --time-period Start=2026-03-01,End=2026-03-10 --granularity DAILY --metrics UnblendedCost --filter '{"Dimensions":{"Key":"USAGE_TYPE","Values":["EUW1-NatGateway-Bytes"]}}'
```

The job pulled several terabytes per night from object storage in the same region, and the traffic went through a NAT gateway that charged per processed GB. A gateway endpoint for the storage service made that path private and free of NAT processing fees. The team also added a check in design reviews for large flows, and a budget alert on the NAT usage type.

## Common mistakes

- Ignoring cross-zone and NAT charges in the design
- Keeping all data in the hottest storage class
- Logging everything at debug level with long retention
- Unbounded metric labels

```quiz
Q: Which traffic is usually billed?
+ Egress to the internet and traffic between regions or zones
- Inbound internet traffic :: Usually free.
- Local loopback :: Not billed.
- Comments in code :: Not traffic.
> Look at where bytes cross a boundary.

Q: Why can a NAT gateway be expensive?
+ It charges per GB processed as well as per hour
- It stores files :: It does not.
- It encrypts data :: Not the cost driver.
- It runs only on Mondays :: Nonsense.
> Large flows through NAT add up.

Q: What do lifecycle rules do for storage?
+ Move or expire data by age automatically
- Increase retrieval speed :: Not their purpose.
- Remove tags :: Unrelated.
- Block uploads :: Not their purpose.
> Automate the cleanup.

Q: What often multiplies metric cost?
+ High-cardinality labels such as user IDs
- Short metric names :: Not an issue.
- Dashboards :: Do not multiply storage.
- Fewer labels :: Reduces cost.
> Each unique combination is a series.
```

```cards
Egress :: outbound data to the internet, billed per GB
Cross-zone traffic :: billed in most clouds, check current rules
NAT gateway :: hourly plus per GB processed
Lifecycle rules :: tier and expire data by age
Cardinality :: unique label combinations, the metric cost driver
```
