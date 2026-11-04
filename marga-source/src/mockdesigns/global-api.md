# Model answer: a public API with a 99.99 percent availability SLO
prompt: global-api
summary: Multiple regions, no single point of failure, careful deploys and a measured error budget.

## The answer in one minute

Four nines allows about 4 minutes of downtime a month, so run at least two regions active, remove shared dependencies, deploy gradually with automatic rollback, and measure the SLO from the user side. Plan degraded modes for each dependency.

## The design

```diagram
title: Four-nines global API design
node: user | Clients | 0 | 1 | Call the API with retries. | Retry storms amplify trouble.
node: gslb | Global DNS and load balancing | 1 | 1 | Health-checked routing to regions. | Slow failover prolongs outages.
node: r1 | Region A | 2 | 0 | Stateless services plus local cache. | Shared deploy bugs hit both regions.
node: r2 | Region B | 2 | 2 | Same stack, independent deploys. | Capacity too small to take A traffic.
node: data | Replicated data store | 3 | 1 | Multi-region database with a defined consistency. | Replication lag and conflicts.
node: dep | Dependencies with fallbacks | 4 | 0 | Auth, payments, third parties. | A hard dependency lowers the SLO.
node: slo | SLO and error budget | 4 | 2 | Measured from client perspective. | Internal metrics hide real failures.
edge: user | gslb
edge: gslb | r1
edge: gslb | r2
edge: r1 | data
edge: r2 | data
edge: data | dep
edge: r1 | slo
```

## Every component, explained

### Error budget

At 99.99 percent about 4.3 minutes a month may fail. The budget decides how risky releases may be.

Example: After a 3-minute incident the team pauses risky launches until next month.

### Active-active regions

Both regions serve traffic and each can carry the load alone, so a regional failure is a routing change.

Example: Region A fails and the global load balancer moves its traffic to B in about a minute.

### Gradual deploys

Changes go to a small share first, are compared with the rest, and roll back automatically.

Example: A deploy to 1 percent shows a higher 5xx rate and is reverted in 3 minutes.

### Dependency isolation

Each dependency has a timeout, a circuit breaker and a degraded mode.

Example: If the recommendation service fails, the API returns the page without recommendations.

### Client-side measurement

Success is measured at the edge or by probes from outside, not only inside the service.

Example: Probes from five continents catch a routing fault that internal metrics miss.

## Numbers to say out loud

- 99.99 percent means about 52 minutes a year.
- Each hard dependency at 99.9 percent lowers the total, so three in series give about 99.7 percent.
- Region capacity needs at least 100 percent of peak per surviving region.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Bad deploy to all regions | Global outage | Stagger regions, automated rollback |
| Shared config push | Both regions fail | Version config, canary it, keep last good |
| Database failover slow | Minutes of errors | Rehearsed failover, health checks |
| Retry storm | Overload after a blip | Backoff, jitter, budgets |
| Third-party outage | Feature failure | Fallbacks and timeouts |

## Follow-up questions to expect

- How do you handle data consistency across regions?
- How would you test region failure?
- What do you do when the budget is spent?
