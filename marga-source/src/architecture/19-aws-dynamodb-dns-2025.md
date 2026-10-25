# AWS DynamoDB DNS race condition, October 2025
company: Amazon Web Services
date: 19 and 20 October 2025
modules: cloud, networking, sre
calc: recovery, retries
source: AWS post-event summary | https://aws.amazon.com/message/101925/
summary: Two automation components raced each other, an empty DNS record for DynamoDB resulted, and many dependent services in US-East-1 failed for hours.

## Before you read on
A service looks up one DNS name to find its database. Two automated processes update that name. What stops the older one from overwriting the newer one?

## The system
DynamoDB is a managed database that many AWS services and customers use. In each region, DNS names for its endpoints point at load balancers. Two automated components manage this: a planner that creates plans for the records and an enactor that applies them.

## Timeline as reported
- Late on 19 October (Pacific time), one enactor was delayed while applying an older plan, while another enactor applied a newer plan.
- As reported, a race condition let the delayed enactor overwrite the newer plan with the old one, and the cleanup of old plans then removed the IP addresses of the regional endpoint. The record was empty.
- New connections to DynamoDB in US-East-1 failed. The system could not repair itself, and operators had to intervene by hand.
- After DynamoDB came back in the early morning, the EC2 service struggled to launch instances, because the system that manages the physical hosts was congested with the backlog.
- Network load balancer health checks also failed during the recovery. Full recovery of all services was reported later that day.

## Root cause
A race condition in DNS automation, together with a lack of safety checks on stale plans, produced an empty record. The recovery then ran into dependencies between services that were rebuilding at once.

## What changed
- AWS disabled the DNS automation worldwide while it fixed the race condition and added protection.
- It also said it would add tests, improve the throttling of work during recovery, and add checks to the network load balancer.

## Lessons learned
- Protect automation from stale work, with checks that an older plan cannot replace a newer one.
- Add a safety check so a record can never be set to empty.
- Throttle recovery work so dependent services do not overload each other.
- Keep manual recovery tools for the case in which automation is the broken part.

## Trade-offs to weigh
- **Automation against manual control.** Automation updates thousands of records safely most of the time. A bug in it can remove a record for everybody.
- **Self-healing against manual recovery.** Self-healing helps when the failure is expected. Here the repair path itself was broken.
- **Regional dependency against independence.** Services that use a regional database inherit its outages.

## Try the calculators
In the backup, RTO and RPO calculator, see how recovery time shapes the total downtime. In the retries calculator, see how a backlog of retries slows a service that is trying to come back.
