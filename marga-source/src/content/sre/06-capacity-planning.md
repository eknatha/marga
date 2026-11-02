---
title: Capacity planning and performance testing
minutes: 15
summary: Forecast demand, find a service's limits with load tests, plan headroom and N+1 redundancy, and connect capacity to cost and to autoscaling.
---

Running out of capacity is an avoidable outage. Having too much wastes money. Capacity planning is the discipline of knowing how much load your system can carry, how fast demand is growing and how long it takes to add more.

## What you will learn

- Demand forecasting from real traffic data
- Load, stress and soak testing
- Headroom, N+1 and failure-domain planning
- Lead times, autoscaling and cost

## Know your demand

Start with measurements: requests per second (peak, not average), growth over months, and seasonal events such as sales or month-end processing. Use Prometheus to see the trend:

```promql
max_over_time(sum(rate(http_requests_total{job="shop-api"}[5m]))[7d:5m])
```

```promql
predict_linear(node_filesystem_avail_bytes{mountpoint="/data"}[7d], 14 * 24 * 3600) < 0
```

The second query forecasts when a disk will fill, based on the last week of growth. Combine technical trends with business input: product launches, marketing campaigns and customer onboarding all change demand in ways history cannot show.

## Find the limits

You cannot plan capacity without knowing what one unit can handle. Test it.

| Test | Question it answers |
|------|---------------------|
| Load | Does the system meet its SLO at the expected peak? |
| Stress | At what load does it break, and how does it fail? |
| Soak | Does it stay healthy for hours? (finds leaks) |
| Spike | Can it handle a sudden jump? |

```text
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '5m', target: 300 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<400'],
  },
};

export default function () {
  const r = http.get('https://staging.example.com/api/products');
  check(r, { ok: (res) => res.status === 200 });
}
```

Run load tests against an environment that resembles production, never against production data without protection. Watch the saturation signals during the test: CPU, memory, connection pools, queue depth and database load. The first resource to saturate is the bottleneck, and the number to remember is the throughput at which latency starts to exceed the SLO, not the point of total failure.

```console
$ k6 run loadtest.js
$ kubectl top pods -n shop --sort-by=cpu | head -5
$ kubectl get hpa -n shop -w
```

## Headroom and redundancy

If one instance handles 200 requests per second at the SLO, and peak demand is 900, you need five instances for the load. Add:

- **Headroom** for growth and bursts, commonly 20 to 30 percent
- **N+1 or N+2** so that losing one node or one zone does not take you over capacity
- **Failure-domain thinking**: with three zones, losing one leaves 67 percent of capacity, so each zone must be sized to carry half the peak alone

```text
peak load            900 rps
per-instance limit   200 rps at SLO
needed for load      5 instances
with 25% headroom    6 instances
survive loss of 1 of 3 zones (2 zones carry all): 3 per zone = 9 instances
```

The last line shows why "survive a zone failure" is the most expensive requirement and deserves an explicit decision rather than an accident.

## Lead time and autoscaling

Capacity must arrive before demand. Ask how long it takes to add some: autoscaling takes minutes, ordering hardware or a large cloud commitment takes weeks, and database sharding takes months. Plan based on the **longest lead time** among the resources a service depends on.

Autoscaling covers short-term variation, but it does not remove the need for planning: quotas, subnet addresses, database connections and downstream services all have limits that autoscaling will hit.

```console
$ aws service-quotas get-service-quota --service-code ec2 --quota-code L-1216C47A --query 'Quota.Value'
$ kubectl describe quota -n shop
$ aws ec2 describe-subnets --subnet-ids subnet-0abc --query 'Subnets[0].AvailableIpAddressCount'
```

## Capacity and cost

Review utilisation regularly. Persistently low usage means over-provisioning, and persistently high usage means risk. Use commitments such as reserved capacity or savings plans for the steady base, on-demand or spot for the variable part, and tag resources so cost is attributed to the teams who control it.

## Incident: the launch day that overwhelmed the database

> **Incident:** Marketing launches a campaign without telling engineering. Web servers autoscale from 10 to 60 instances within minutes, but the database hits its connection limit of 500, queries queue up, and every instance starts failing health checks. The site is down for the launch.

Autoscaling the stateless tier moved the bottleneck to the shared database.

```console
$ psql -h db.internal -c "select count(*) from pg_stat_activity;"
 count
-------
   498
$ psql -h db.internal -c "show max_connections;"
```

Immediate mitigation: cap the Deployment's maximum replicas, shed load with a queue or cached pages, and scale the database or add a connection pooler such as PgBouncer. Long term: load-test the whole path including dependencies, set autoscaling maximums from the weakest dependency, and add a launch checklist that gives engineering notice of expected traffic.

## Common mistakes

- Planning for average load instead of peak
- Testing only the stateless tier
- No headroom or N+1, so one failure causes an overload
- Ignoring quotas and address space limits
- Forecasting only from history, with no input from the business

```quiz
Q: Why plan for peak instead of average load?
- Peaks are easier to measure
+ Failures happen when demand is highest
- Averages are illegal
- It lowers cost
> Capacity must handle the busiest period within the SLO.

Q: What does a soak test reveal?
- Maximum throughput
+ Problems that appear over time, such as memory leaks
- Network latency
- Code style issues
> Running at steady load for hours exposes slow resource leaks.

Q: What is N+1 redundancy?
+ Enough capacity to keep serving after losing one unit
- One extra feature
- A backup of the code
- Doubling all capacity
> Capacity for the load plus one spare unit.

Q: Why can autoscaling the web tier cause an outage?
- Autoscaling is unreliable
+ It can overload a shared dependency, such as a database, that does not scale with it
- It removes health checks
- It needs more IAM
> Test the whole path and cap scaling by the weakest dependency.
```

```cards
Load versus stress test? :: Load checks the SLO at expected peak; stress finds the breaking point
Why test dependencies too? :: The bottleneck is often a shared database or downstream service
What is headroom? :: Spare capacity above forecast peak for growth and bursts
Which lead time drives planning? :: The longest lead time among the resources the service needs
```
