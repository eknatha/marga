# Fastly global outage, June 2021
company: Fastly
date: 8 June 2021
modules: cloud, networking, sre
calc: cells, error-budget
source: Fastly blog: Summary of June 8 outage | https://www.fastly.com/blog/summary-of-june-8-outage
summary: One customer configuration change triggered a dormant bug, and a large share of the edge network returned errors for under an hour.

## Before you read on
A software release contains a bug that only a specific combination of settings can trigger. Who would find it first, your tests or a customer?

## The system
Fastly runs a content delivery network. Customers change the configuration of their services through the control plane, and the change is pushed to the points of presence around the world. Many large websites sit behind it.

## Timeline as reported
- On 12 May, Fastly started to deploy a software update that contained a bug. The bug could be triggered by a specific valid configuration under certain conditions.
- On 8 June, a customer pushed a valid configuration change which triggered the bug.
- As reported, about 85 percent of the network returned errors within a minute, and many well-known sites were unavailable.
- Fastly detected the problem in one minute, and identified the customer configuration as the cause within about 40 minutes.
- The company disabled the configuration, and most of the network recovered within about 49 minutes.
- Some other effects stayed longer, for example on cache hit ratio, until the network warmed up again.

## Root cause
A latent software bug, released weeks earlier, that a valid customer setting activated, combined with a configuration push model that applies a change across the entire network.

## What changed
- Fastly said it would fix the bug and deploy the fix, and review its processes and test coverage.
- It also said it would evaluate its architecture to make the service more resilient to such changes.

## Lessons learned
- Release software in stages, and also stage the data and customer configuration that exercise it.
- Test the paths that unusual valid settings can reach.
- Detect fast, then communicate while the fix is in progress.
- Reduce the share of the network that a single customer setting can affect.

## Trade-offs to weigh
- **Fast propagation of customer changes.** Customers expect changes to apply in seconds. It is also how one change reaches all points of presence.
- **Shared platform against isolation.** A shared network lowers the cost. One customer's input can affect the others.
- **Quick detection against full diagnosis.** The team saw the failure in a minute. Finding the cause took longer.

## Try the calculators
In the cells calculator, compare a single shared network with several independent ones. In the error budget calculator, see how well a 49-minute event fits into a yearly objective.
