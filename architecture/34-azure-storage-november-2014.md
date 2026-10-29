# Azure Storage interruption, November 2014
company: Microsoft Azure
date: 18 November 2014
modules: cloud, cicd, sre
calc: cells, error-budget
source: Microsoft Azure blog: Update on Azure Storage Service Interruption | https://azure.microsoft.com/en-us/blog/update-on-azure-storage-service-interruption/
summary: A performance improvement rolled out to many regions at once triggered an infinite loop in the storage front ends, and service dropped in many locations.

## Before you read on
A change has been tested on a small set of servers and looks good. A teammate wants to roll it to the rest of the world in one go, to save time. What do you say?

## The system
Azure Storage runs front end servers that take customer requests for blobs, tables and queues. Changes are meant to be deployed in stages, in a process the team calls flighting, where a small slice of the fleet gets the change first and is watched.

## Timeline as reported
- Engineers developed an improvement to cut the CPU use of the storage front ends and tested it in a small flight.
- As reported, they also deployed a configuration change to the front ends, and it was rolled to the whole fleet at once, against the usual practice.
- The change exposed a bug in the new code: in a certain case it went into an infinite loop and stopped the front ends from taking traffic.
- The loop hit storage in many regions at about the same time, so the loss of service was wide, and some services built on storage were affected too.
- Engineers rolled back the change and restarted the front ends. Recovery took many hours, in some regions up to about 11 hours.

## Root cause
A deployment bypassed the staged rollout, and the new code had a bug that testing in the small flight did not find.

## What changed
- Microsoft said it would improve the deployment tooling so that the process cannot skip staged deployment.
- It also said it would improve its monitoring, its reviews of changes, and the speed of recovery.

## Lessons learned
- Enforce staged rollout in the tool, so that skipping it requires a deliberate, visible exception.
- Treat configuration changes like code changes: review them, stage them and watch them.
- Test with the failure cases of the new code, not only with the typical load.
- Design services that depend on storage to degrade, because storage is a shared dependency.

## Trade-offs to weigh
- **Flighting against speed.** Staged deployment takes longer. It catches the bug on a fraction of the fleet.
- **Configuration against code.** A configuration change may look safer than code, and it can switch on a bug just as well.
- **Human override against enforcement.** Operators need an emergency path. If the path is easy to take, it will be taken for ordinary changes.

## Try the calculators
In the cells calculator, compare deploying to 1, 5 and 20 cells in turn with deploying to all at once, and read the share of users affected by a faulty change. In the error budget calculator, see how 11 hours compares with a yearly objective.
