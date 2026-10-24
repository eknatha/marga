# Google Cloud network congestion, June 2019
company: Google Cloud
date: 2 June 2019
modules: cloud, networking, sre
calc: capacity, cells
source: Google Cloud incident report 19009 | https://status.cloud.google.com/incident/cloud-networking/19009
summary: A configuration change meant for a small group of servers was applied to a larger set, and the network lost capacity in several regions for hours.

## Before you read on
A maintenance event is planned for a few servers. The tool that applies the change gets its target list wrong. What limits how much damage it can do?

## The system
Google Cloud runs a global network. The control plane that configures it is spread over several locations in each region, and a job in the control plane normally schedules maintenance on a small number of servers at a time.

## Timeline as reported
- On 2 June 2019, a configuration change was started for a small number of servers in one region. It was meant to be applied to a few servers in a few regions.
- As reported, two software bugs combined: the configuration was applied to a larger set of servers in several regions, and the control plane jobs that would have stopped the maintenance were all stopped by the same event.
- The affected servers were taken down for maintenance, and the network lost much of its capacity in the regions.
- Traffic went over the remaining paths and became congested. Packet loss and high latency affected Google Cloud, and also some Google products such as YouTube, Gmail and G Suite.
- The engineers could not use the usual tools quickly, because their access to the network was impaired by the congestion itself.
- Service came back in the afternoon, about four hours after the start.

## Root cause
A configuration change was applied to more servers than intended, and the control plane for the maintenance had the same fault domain as the network it was meant to protect.

## What changed
- Google said it would stop the automation until safeguards were added, and fix the bugs.
- It also planned to improve the isolation of its control plane, and the tools that engineers use during an incident, so that they do not rely on the congested network.

## Trade-offs to weigh
- **Shared control plane against separate one.** Sharing is simple. A fault in the network also removes the means to repair it.
- **Automatic maintenance against manual.** Automation scales to many servers, and a wrong target list scales as well.
- **Congestion priority.** Giving the management traffic a priority helps operators. It needs to be designed before the incident.

## Try the calculators
In the capacity calculator, see how the loss of a share of capacity changes the load on the remaining paths. In the cells calculator, compare one global control plane with several regional ones.
