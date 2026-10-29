# Azure Front Door configuration change, October 2025
company: Microsoft Azure
date: 29 October 2025
modules: cloud, networking, cicd
calc: cells, error-budget
source: Microsoft Azure status history and post incident review | https://azure.status.microsoft/en-us/status/history/
summary: An inadvertent configuration change to a global edge service got past safety checks because of a software defect, and many customer sites and Microsoft services were disrupted for hours.

## Before you read on
A global edge service has safeguards that validate configuration before it spreads. What if the validation system itself has a bug?

## The system
Azure Front Door is a global content delivery and application delivery service. Customer and Microsoft services use it as the entry point, and it receives configuration changes through a control plane that pushes them to edge sites.

## Timeline as reported
- A configuration change was made to the service, and, as Microsoft reported, it was not meant to be released in that form.
- Protection mechanisms that normally validate such changes did not stop it, because of a defect in the software that does the check.
- The bad configuration spread to edge sites and many of them failed to load it properly, and requests to services behind Front Door timed out or returned errors.
- Microsoft blocked further configuration changes, and rolled back to the last known good configuration. It then recovered the nodes gradually, to avoid overloading the healthy ones.
- Customer services, and several Microsoft services including parts of Microsoft 365 and the Azure portal, saw disruption for many hours before the traffic was back to normal.

## Root cause
A faulty configuration reached production because the safeguards had a defect, and the global propagation spread it to many edge sites before it could be stopped.

## What changed
- Microsoft said it would review its validation and rollout safeguards, and move to stricter staged deployment for configuration.
- It also said it would make the rollback process faster and reduce the dependency of the management paths on the same service.

## Lessons learned
- Do not rely on one validator: add an independent check or a canary stage that would catch the validator failing.
- Keep an emergency block on configuration changes, so that a bad spread can be stopped quickly.
- Recover capacity gradually after a global failure, so that healthy nodes are not overloaded.
- Keep the management and status paths independent from the service they manage.

## Trade-offs to weigh
- **Validation in one system against independent checks.** A single validator is simple. Its bug becomes a hole in every change.
- **Global propagation against staged.** Fast spread helps with attacks and urgent fixes. It also spreads mistakes.
- **Using your own platform for management.** It keeps things simple, and when it fails you lose the console used to repair it.

## Try the calculators
In the cells calculator, see how many users a change reaches when the edge is split into more groups. In the error budget calculator, see what several hours of regional failure do to a yearly objective.
