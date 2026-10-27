---
title: Dependencies and third-party risk
minutes: 12
summary: Understand how your reliability depends on other services, set realistic targets, and plan for their failures.
---

Your service has a 99.95 percent target. It calls a payment provider with a 99.9 percent target, a search service at 99.9 percent and a messaging service at 99.5 percent. Your target is higher than some of your own dependencies. Reliability maths, and plain honesty about dependencies, change what promises you can make.

## What you will learn

- How dependencies limit the availability you can offer
- Map hard and soft dependencies
- Mitigations: timeouts, fallbacks, caching, queues and redundancy
- Managing third-party providers: contracts, status, and exit plans

## The arithmetic of dependencies

If a request needs services A and B, and both must work, the availability is the product: 99.9% x 99.9% = 99.8%. With five such dependencies at 99.9 percent, you cannot offer better than about 99.5 percent, however good your own code is. This is why every hard dependency must be visible in your target: either lower the promise, reduce the number of hard dependencies, or add a way to work when one fails.

| Dependencies in the request path | Each at 99.9% | Combined |
|---|---|---|
| 1 | 99.9% | 99.9% |
| 3 | 99.9% | 99.7% |
| 5 | 99.9% | 99.5% |

## Draw the dependency map

List what a request needs: databases, caches, internal services, cloud services, DNS, identity providers, payment and email vendors. Mark each as **hard** (the request fails without it) or **soft** (the request still gives a useful answer). For each, note the owner, the target they publish, and how you would notice a failure. Include the hidden ones: DNS, certificates, time sync, the CI system you need to deploy a fix.

## Make soft what you can

Turn hard dependencies into soft ones where the product allows it.

- **Timeouts and budgets**: a call must fail quickly so that it does not use up your own capacity.
- **Fallbacks**: show cached prices, or hide recommendations, when the recommender is down.
- **Queues**: accept an order now and send the confirmation email later.
- **Circuit breakers**: stop calling a failing dependency for a short time, then probe again.
- **Redundancy**: a second provider for critical functions such as payments or email, with a tested switch.

Each fallback must be tested, because an untested fallback usually fails during the first real outage.

## Third-party providers

For external vendors, read the SLA: what is measured, what credit you get, and what is excluded. A credit is not compensation for your lost customers. Subscribe to the provider status page and alert on it, but also measure the dependency yourself, because status pages lag. Keep an exit plan for critical vendors: data export, a tested alternative, and a decision on how long an outage you would tolerate before switching. Review dependency health in your regular reliability review.

```predict
Q: Your service needs four hard dependencies, each at 99.9 percent. What is the best availability you can honestly promise?
???
About 99.6 percent (0.999 to the power of four), before your own failures.
> Availabilities multiply when all must work.
```

## Incident: Our 99.95 depended on a 99.5

> **Incident:** A product promised customers 99.95 percent availability, then missed it every quarter.

```console
$ ./dependency-report.sh --quarter Q4
service        role   target   measured
payments-api   hard   99.9     99.82
search         soft   99.9     99.71
mail-gateway   hard   99.5     99.40
sms-vendor     hard   99.5     99.20
```

Three hard dependencies had lower targets than the promise. The review led to three changes: the email and SMS calls moved to a queue, so they became soft; search results fell back to a cached list; and the public target changed to 99.9 percent for the checkout path. The team measured each dependency from their own side, not only from provider status pages.

## Common mistakes

- Promising more than the product of your hard dependencies
- Forgetting hidden dependencies such as DNS and identity
- Fallbacks that were never tested
- Trusting a vendor status page alone

```quiz
Q: What is the combined availability of two required services at 99.9 percent each?
+ About 99.8 percent
- 99.9 percent :: Both must work.
- 100 percent :: That is not possible.
- 99.99 percent :: Multiplying lowers it.
> Hard dependencies multiply.

Q: What is a soft dependency?
+ One where the request still gives a useful answer if it fails
- One that is cheap :: Cost is separate.
- One that is internal :: Internal can be hard.
- One with an SLA :: An SLA says nothing about softness.
> Design to make dependencies soft.

Q: What does a circuit breaker do?
+ Stops calling a failing dependency for a while, then probes again
- Cuts power to the server :: It is a software pattern.
- Encrypts calls :: It does not.
- Deletes failing requests :: It avoids pointless calls.
> It protects both sides.

Q: Why measure a vendor yourself?
+ Status pages lag and may not show the failure your users see
- Vendors lie :: Not necessarily.
- It is required by law :: Not generally.
- It saves money :: The point is accuracy.
> Your users' experience is the truth.
```

```cards
Hard dependencies combine by :: multiplication
Make a dependency soft with :: timeouts, fallbacks, queues, breakers
Hidden dependencies :: DNS, certificates, identity, CI
Vendor checks :: SLA, own measurement, exit plan
Test :: every fallback, regularly
```
