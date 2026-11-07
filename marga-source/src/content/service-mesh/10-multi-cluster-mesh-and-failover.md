---
title: Multi-cluster mesh and failover
minutes: 12
summary: Connect services across clusters with shared trust, cross-cluster discovery and locality-aware failover, and know the risks.
---

Running more than one cluster gives you isolation and regional failover, but services still need to find and trust each other. A mesh can provide that, at the cost of more moving parts.

## What you will learn

- Shared trust and identity across clusters
- Discovery and gateway patterns
- Locality-aware routing and failover
- Failure domains and capacity

## Trust

Workloads in both clusters must trust the same **root certificate authority**, usually with a separate intermediate per cluster. Protect the root offline and rotate intermediates on a schedule. Without shared trust, mTLS between clusters fails.

## Connectivity and discovery

There are two main shapes. In **flat** networking the pod networks are routable, so proxies connect directly. In **gateway-based** designs each cluster exposes an east-west gateway and traffic crosses it over mTLS. Each control plane or a replicated service registry learns about services in the other cluster.

```bash
istioctl remote-clusters
kubectl --context east get svc -n shop
kubectl --context west get endpoints api -n shop
```

## Locality and failover

```yaml
trafficPolicy:
  loadBalancer:
    localityLbSetting:
      enabled: true
      failover:
        - from: eu-west
          to: eu-central
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 10s
    baseEjectionTime: 30s
```

Prefer local endpoints for latency and cost, and fail over only when local ones are unhealthy. Outlier detection is required for failover to trigger.

## Independence

Give each cluster its own control plane if possible, and keep the system able to run if the link between them is cut. Plan spare capacity so one cluster can absorb the other's traffic, and run regular failover tests during working hours.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Multi-cluster mesh and failover fits together
node: n1 | Trust | 0 | 0 | Workloads in both clusters must trust the same root certificate authority, usually with a separate intermediate per cluster. | Assuming failover works without testing it. | process
node: n2 | Connectivity and discovery | 1 | 1 | There are two main shapes. In flat networking the pod networks are routable, so proxies connect directly. | Sizing each cluster only for its own traffic. | process
node: n3 | Locality and failover | 2 | 0 | Prefer local endpoints for latency and cost, and fail over only when local ones are unhealthy. | Locality and failover Prefer local endpoints for latency and cost, and fail over only when local ones are unhealthy. | process
node: n4 | Independence | 3 | 1 | Give each cluster its own control plane if possible, and keep the system able to run if the link between them is cut. | Cross-region traffic on every call. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Failover overloaded the survivor

> **Incident:** Traffic moved to the second cluster and overloaded it.

```console
eu-west: all endpoints unhealthy
eu-central: cpu 97%, p99 latency 4.2s
503 rate rising
```

The mesh failed over exactly as configured, but the second cluster was sized for half the traffic. The team sized each region to carry the other at peak, added autoscaling headroom and scheduled a quarterly failover test.

## Common mistakes

- Assuming failover works without testing it
- Sizing each cluster only for its own traffic
- Sharing one point of failure such as a single root key
- Cross-region traffic on every call

```quiz
Q: What must clusters share for mTLS across them?
+ A trusted root of trust
- A pod network CIDR only :: No.
- A database :: No.
- A namespace :: No.
> Certificates must verify.

Q: What is an east-west gateway?
+ A gateway for cluster-to-cluster traffic
- A DNS server :: No.
- A node :: No.
- A volume :: No.
> It carries mesh traffic between clusters.

Q: What triggers locality failover?
+ Unhealthy local endpoints
- A new label :: No.
- A timer only :: No.
- Quota :: No.
> Outlier detection marks them unhealthy.

Q: What must you plan for failover?
+ Spare capacity in the other cluster
- More YAML :: No.
- More namespaces :: No.
- Longer names :: No.
> It must absorb the load.
```

```cards
Root CA :: The trust anchor for mesh certificates
East-west gateway :: Gateway for traffic between clusters
Locality-aware routing :: Preferring nearby endpoints
Failure domain :: A set of things that fail together
```
