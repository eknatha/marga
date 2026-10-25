# Slack after the holidays, January 2021
company: Slack
date: 4 January 2021
modules: cloud, networking, sre
calc: capacity, cloud-cost
source: Slack engineering | https://slack.engineering/slacks-outage-on-january-4th-2021/
summary: A predictable return-to-work traffic spike met network limits and an autoscaler that read the wrong signal.

## Before you read on
Your traffic doubles on one known morning each year. What do you test in advance, and which of your scaling signals could mislead you when the network, not the CPU, is the bottleneck?

## The system
Slack's service ran on AWS. Its web tier sat behind load balancers and talked to back-end systems and databases across the AWS network, which includes AWS Transit Gateways that connect virtual networks. A provisioning service starts new instances, and autoscaling adds or removes web servers based on load.

## Timeline as reported
- On the first working Monday of 2021, many people returned to work and traffic rose sharply in the morning.
- The network between the layers became saturated at the Transit Gateways. Packets were dropped and requests slowed.
- Web servers spent time waiting on the network, so their CPU use looked low. The autoscaler treated that as spare capacity and began to scale in, removing servers when more were needed.
- The provisioning service, which is needed to add capacity, was itself affected, so adding servers back was slow.
- Slack worked with AWS to scale the gateways. Capacity was restored in stages over several hours, and service returned over the day.

## Root cause
A network limit was reached on a day with a known traffic pattern, and signals used for scaling did not reflect what was limiting the service. The tool for adding capacity needed capacity of its own.

## What changed
- AWS and Slack increased the network capacity ahead of expected load and changed how it scales.
- Slack changed autoscaling so it does not scale in when signs point to network trouble, and increased headroom for provisioning.
- More load testing and monitoring of the network were added.

## Lessons learned
- Load test for the return from a quiet period, such as the first working day after a holiday.
- Scale infrastructure, including network capacity, before the peak and watch the limits of cloud components.
- Keep dependencies of the monitoring system as small as possible.
- Practise autoscaling limits and recovery with the actual traffic pattern.

## Trade-offs to weigh
- **Autoscaling against pre-provisioning.** Autoscaling saves money in quiet times. For known peaks, scaling ahead is more predictable.
- **Single metric against several signals.** CPU is easy but can be misleading. Request latency, queue depth and network drops describe the user's experience better.
- **Managed network limits.** A managed network service hides details, and still has limits that you need to know and raise early.

## Try the calculators
In the capacity calculator, plan for a peak that is twice the normal load and decide on a target utilisation. Then use the cloud cost calculator to compare running the extra servers on demand for a few hours a month against reserving them all year.
