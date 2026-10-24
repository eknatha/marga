# Azure leap day outage, February 2012
company: Microsoft Azure
date: 29 February 2012
modules: cloud, linux, sre
calc: redundancy, error-budget
source: Microsoft Azure blog: Summary of Windows Azure service disruption on Feb 29th, 2012 | https://azure.microsoft.com/en-us/blog/summary-of-windows-azure-service-disruption-on-feb-29th-2012/
summary: A certificate whose expiry date was computed as one year later on 29 February did not exist, and the failure spread across many clusters.

## Before you read on
Your code creates a certificate valid for one year by adding one to the year number. What date does it produce on 29 February?

## The system
In Azure, each server has a guest agent that talks to the host agent. The guest agent creates a transfer certificate when it starts, to protect its communication with the host. Servers are grouped into clusters managed by a fabric controller.

## Timeline as reported
- On 29 February 2012, shortly after midnight UTC, the guest agent created a certificate valid for one year, by taking the date and adding one to the year.
- The result was 29 February 2013, which does not exist. The certificate creation failed.
- As reported, the agent treated the failure as a hardware problem, and the server was moved elsewhere. The same failure then repeated on new servers.
- A cluster stops accepting more servers when many have failed, to stop a wrong spread. This protected other clusters for a while, and the problem grew in the affected ones.
- Microsoft fixed the code and rolled out the update. A step to update running servers disrupted several clusters further, and service management in some regions was disrupted for several hours.

## Root cause
A date calculation that did not handle the leap day, and failure handling that treated a software bug as a hardware fault and retried on other machines.

## What changed
- Microsoft fixed the date handling and reviewed other code for the same kind of mistake.
- It also changed how the platform tells software failures from hardware failures, and improved its communication about the incident.

## Trade-offs to weigh
- **Automatic recovery against stopping early.** Moving a failed workload to other servers is helpful for hardware. When the cause is code, it spreads the failure.
- **Fast patching against staged patching.** The fix was urgent and an update to running servers disrupted others.
- **Clear status updates against speed.** Customers wanted to know what happened, and the dashboards were slow to say.

## Try the calculators
In the error budget calculator, see how much a few hours of regional failure costs against a yearly objective. In the redundancy calculator, ask whether replicas in other clusters would have helped when the same bug ran everywhere.
