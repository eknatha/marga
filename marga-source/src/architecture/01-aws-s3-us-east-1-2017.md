# AWS S3 in US-East-1, February 2017
company: Amazon Web Services
date: 28 February 2017
modules: cloud, bash, sre
calc: capacity, cells, error-budget
source: AWS post-event summary | https://aws.amazon.com/message/41926/
summary: A mistyped capacity command took out the index and placement subsystems of S3 in its busiest region.

## Before you read on
You operate a storage service. An engineer needs to remove a few servers from a pool. What stops them from removing too many, and how long would a full restart of the pool take?

## The system
S3 stores objects for millions of customers. In the US-East-1 region, requests go through several subsystems. The index subsystem holds metadata and location information for every object. The placement subsystem decides where new objects are stored and depends on the index. Both run on fleets of servers. Many other AWS services, and many customer sites, depend on S3 in this region.

## Timeline as reported
- Around 9:37 AM Pacific, an authorised engineer followed a documented playbook to remove servers from a billing subsystem, because billing was slower than expected.
- One input to the command was entered incorrectly, and a much larger set of servers was removed than intended. This included servers supporting the index and placement subsystems.
- Both subsystems had to be fully restarted. AWS had not done a full restart of these subsystems in the region for years, and the fleet had grown, so safety checks and metadata loading took far longer than expected.
- While the index subsystem was down, requests to list, read, write and delete objects failed. The placement subsystem could not work either until the index was back.
- The index subsystem returned to service in the early afternoon, and the placement subsystem followed. S3 was fully back about four hours after the start.
- The AWS Service Health Dashboard relied on S3 in the same region, so for a time AWS could not update the status icons and used other channels.

## Root cause
A tool allowed capacity to be removed too quickly and without a minimum. Combined with a typing error, it removed more than a safe amount of capacity. The recovery path was slow because it had not been exercised at the current size of the system.

## What AWS changed
- The tool was changed to remove capacity more slowly and to block any removal that would take a subsystem below its minimum required capacity.
- AWS began to partition the index subsystem into smaller cells to reduce the blast radius and to shorten restarts.
- The Service Health Dashboard was changed so that it no longer depended on S3 in a single region.
- AWS audited other tools that remove or restart capacity.

## Trade-offs to weigh
- **Speed against safety.** Removing capacity quickly helps in an emergency, but it is also how a typo becomes an outage. A rate limit makes routine work slower.
- **Big pools against cells.** One large pool is simpler and uses capacity efficiently. Many cells shrink the damage of one mistake, but add routing, deployment work and spare capacity in every cell.
- **Rehearsal cost.** Practising a full restart takes time and risks a real incident, but untested recovery is slower than anyone expects.

## Try the calculators
In the capacity calculator, set peak load and see how much extra capacity zone loss needs. In the cells calculator, compare 1 cell with 8 and 20: look at the share of users hit by one failure against the cost multiplier. Ask which cell count you would choose if each cell cost 4% more to run.
