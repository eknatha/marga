# AWS EBS and a data collection bug, October 2012
company: Amazon Web Services
date: 22 October 2012
modules: cloud, sre, observability
calc: capacity, retries
source: AWS summary of the October 22, 2012 AWS Service Event in the US-East Region | https://aws.amazon.com/message/680342/
summary: A memory leak in a data collection agent on EBS servers, set off by a missed configuration change, exhausted memory across the fleet and many volumes became stuck.

## Before you read on
A monitoring agent on your storage servers has a memory leak that is only triggered when a certain server name stops resolving. How would you know before it matters?

## The system
Amazon Elastic Block Store (EBS) provides volumes to EC2 instances, with data stored on servers in an availability zone, and with a control plane for the volumes. A data collection agent on each storage server sent operational data to a collection server.

## Timeline as reported
- A DNS update for the data collection server was made as part of ordinary maintenance. As reported, the update did not reach one set of storage servers, as a result of a missed change in a configuration.
- The agents could not reach the collection server, and a latent memory leak in them started to consume memory on each storage server.
- The memory pressure slowed the servers, and many EBS volumes became stuck, as the servers could not process requests, and the problem grew as more servers failed.
- The control plane became overloaded by the many failing requests, and customers could not create or attach volumes, and some services such as RDS and ELB were affected.
- Engineers fixed the DNS record and restarted servers, throttled the control plane, and recovered volumes in stages over about 20 hours.

## Root cause
A latent defect in a non-critical agent, triggered by a configuration gap, was able to take down a critical storage fleet, with a control plane that retried too much.

## What changed
- AWS fixed the memory leak and the process for configuration changes of that type.
- It also said it would add monitoring for the memory use of agents, and make the control plane more robust to a flood of failed requests.

## Lessons learned
- Limit the resources of agents with cgroups or quotas, so a leak cannot take down the service they watch.
- Test what the agent does when its target is unreachable, not only when it is healthy.
- Add back-off and limits to control plane retries to avoid overload during recovery.
- Check configuration changes against the full list of affected servers.

## Trade-offs to weigh
- **Monitoring agent on critical servers.** Agents give visibility, and they share the resources of the critical process.
- **Aggressive retries against back-off.** Retries help with short faults and flood a struggling control plane.
- **Region-wide control plane against cells.** A shared control plane is simple, and one problem blocks recovery for all.

## Try the calculators
In the capacity calculator, see how the load on the remaining servers grows as others fail. In the retries calculator, see how many requests a failed fleet sends if each client retries without back-off.
