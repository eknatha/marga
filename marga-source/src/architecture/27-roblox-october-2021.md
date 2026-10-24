# Roblox 73-hour outage, October 2021
company: Roblox
date: 28 to 31 October 2021
modules: observability, sre, cloud
calc: capacity, retries
source: Roblox blog: Roblox Return to Service 10/28-10/31 2021 | https://blog.roblox.com/2022/01/roblox-return-to-service-10-28-10-31-2021/
summary: A subtle fault in a service discovery and key-value store under heavy load, and a monitoring system that relied on it, made a long outage hard to diagnose.

## Before you read on
Your monitoring depends on the same service discovery as the application. If service discovery degrades, how do you find out what is wrong?

## The system
Roblox runs its own data centres, and uses HashiCorp Consul for service discovery and for a key-value store that many systems use. The cluster of Consul servers had grown to a large size and carried a very high load.

## Timeline as reported
- On 27 October, Consul performance started to degrade, and the team tried to find the cause, while the platform became partly unavailable.
- As reported, on the 28th a new feature for streaming in Consul, enabled shortly before, and a subtle issue in a database used for storage (BoltDB) caused high contention under the heavy write load.
- The monitoring systems depended on Consul, so the engineers had less visibility just when they most needed it.
- The team replaced the Consul cluster with new hardware, and later turned off the streaming feature.
- Restarting a platform with a cold cache was careful work: services were brought back in a staged way and traffic was increased in steps.
- After about 73 hours the platform was back to normal.

## Root cause
Two independent issues, one in a feature and one in a storage engine, which only showed up together at a very high load, and a diagnosis process that was impeded by the monitoring depending on the failing system.

## What changed
- Roblox said it would move to multiple availability zones and data centres, to reduce the blast radius.
- It also planned changes to separate its monitoring from the systems it watches, and to review how it uses Consul.

## Trade-offs to weigh
- **Own hardware against public cloud.** Owning gives control and cost benefits. Scaling or replacing hardware during an incident takes days.
- **Shared infrastructure services against separation.** A common discovery service is easy. Everything depends on it.
- **Staged restart against fast restart.** Bringing services back slowly extends the outage. A flood of traffic breaks them again.

## Try the calculators
In the capacity calculator, see how much spare capacity a restart with cold caches needs. In the retries calculator, see how clients that retry make a recovering system struggle.
