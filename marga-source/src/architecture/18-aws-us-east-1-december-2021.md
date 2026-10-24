# AWS US-East-1 network devices, December 2021
company: Amazon Web Services
date: 7 December 2021
modules: cloud, networking, observability
calc: capacity, retries
source: AWS post-event summary | https://aws.amazon.com/message/12721/
summary: An automated scaling activity on an internal network triggered a surge of connection attempts that congested the links, and the tools to fix it were affected too.

## Before you read on
Your monitoring and your control tools use the same network as the thing they monitor. What happens to them when that network is congested?

## The system
AWS runs its customer services on a main network and its internal services, such as monitoring, DNS and the control tools, on a separate internal network. Devices connect the two. In US-East-1, many services use the internal network.

## Timeline as reported
- At about 7:30 AM Pacific, an automated activity to scale the capacity of an internal service in the main network started.
- As reported, the activity caused unexpected behaviour from a large number of clients on the internal network, which produced a surge in connection attempts.
- The surge congested the devices connecting the two networks. Latency and errors rose for services that depend on the internal network, including DNS, monitoring and the console.
- Congestion made it hard to see what was happening, because the monitoring data and the operator tools were affected.
- Engineers worked through the logs and mitigations, and the main fixes were in place by early afternoon, with later recovery for some services.

## Root cause
A latent defect in the automation that handled scaling activity led to a surge of connection attempts, and the clients retried in a way that sustained the congestion.

## What changed
- AWS disabled the scaling activity that caused the surge, until it could be fixed.
- It also deployed new network configurations for the devices, and said it would improve monitoring and the way the Service Health Dashboard works during events.

## Trade-offs to weigh
- **Shared internal network against separate monitoring.** A shared network is simpler. When it is congested, you lose both service and view.
- **Aggressive retry against back-off.** Retries help in short faults. In congestion they keep the surge alive.
- **Automation scale against safety.** Automatic scaling saves effort, and a defect in it applies at machine speed.

## Try the calculators
In the retries calculator, see how load rises as clients retry more times. In the capacity calculator, see how much headroom a link needs to survive a surge.
