# Datadog multi-region outage, March 2023
company: Datadog
date: 8 March 2023
modules: linux, observability, sre
calc: redundancy, recovery
source: Datadog engineering: Multiregion infrastructure connectivity issue | https://www.datadoghq.com/blog/2023-03-08-multiregion-infrastructure-connectivity-issue/
summary: A system update restarted systemd-networkd on many hosts at once, they dropped their network rules, and several regions and clouds lost their nodes together.

## Before you read on
You use several regions and several providers for safety. What would still link them all together, and could one update reach all of them in the same hour?

## The system
Datadog runs a monitoring service on many thousands of nodes across regions and across cloud providers. Its fleet uses Ubuntu, and the nodes receive updates automatically from the operating system.

## Timeline as reported
- On 8 March 2023, shortly after 06:00 UTC, an automatic update of the systemd package ran on nodes in several regions and clouds.
- As reported, the update restarted the networking daemon, systemd-networkd, and it deleted the routes that other software had added, which cut the network for the nodes.
- The nodes lost their connections, and many of them became unreachable at the same time. This included Kubernetes nodes in all regions of the fleet.
- The company's processes for recovery were not designed for a case where so many nodes needed to be replaced at once.
- Engineers rebuilt the nodes with fresh machines, using their normal automation. They then worked through the data pipelines, and backlog. Full recovery took more than a day for some functions.

## Root cause
An operating system update which, with a known interaction, removed network configuration, applied automatically on a schedule that was too close for the nodes across all regions.

## What changed
- Datadog disabled the automatic update of the affected package, and checked the staggering of its operating system updates.
- It also said it would test recovery with a loss of capacity in multiple regions at once, and improve its tools for rebuilding nodes in bulk.

## Lessons learned
- Stagger operating system updates across regions and providers.
- Test what a package update does to the networking configuration.
- Prepare to rebuild many nodes at once, and rehearse it.
- Remember that a shared image or package source links supposedly independent systems.

## Trade-offs to weigh
- **Automatic security updates against staged updates.** Fast patches close holes quickly. A lagging canary group finds bad updates first.
- **Multi-cloud against shared dependencies.** Using several providers protects against one provider. A common base image or package source links them.
- **Immutable nodes against in-place updates.** Replacing a node is clean. It requires spare capacity and automation that works at scale.

## Try the calculators
In the redundancy calculator, see how the real availability changes when replicas share a failure that happens at once. In the backup, RTO and RPO calculator, see how long a bulk rebuild of nodes takes.
