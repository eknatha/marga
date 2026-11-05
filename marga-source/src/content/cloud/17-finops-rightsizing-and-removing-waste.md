---
title: FinOps: rightsizing and removing waste
minutes: 12
summary: Find idle and oversized resources with utilization data, retire unattached disks and old snapshots safely, and schedule non-production environments off hours.
---

The cheapest resource is the one you do not run. Typical clouds hold a long tail of waste: instances sized for a peak that never came, disks left behind after a delete, load balancers with no targets, and test environments that run all weekend. Removing waste needs data and a safe process, not a purge.

## What you will learn

- Rightsize compute from real utilization
- Find unattached volumes, old snapshots and idle load balancers
- Schedule development and test environments
- Remove things safely with owners and a grace period

## Rightsize from data

Look at utilization over a representative period (at least two weeks, and include month-end if the workload has one). For CPU, look at the high percentile (p95 or p99), not the average, and for memory the working set including headroom. An instance that never goes above 15 percent CPU and uses a quarter of its memory is a candidate for a smaller size or a different family. Cloud tools (AWS Compute Optimizer, Azure Advisor, Google Cloud recommender) produce suggestions; treat them as a starting point and check burst patterns, licensing and network limits that depend on size.

```console
$ aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=i-0abc123 --start-time 2026-03-01T00:00:00Z --end-time 2026-03-15T00:00:00Z --period 3600 --statistics Maximum
$ aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].[VolumeId,Size,CreateTime]' --output table
```

Change one step at a time (one size down), watch latency and errors, and keep a quick path back.

## The waste checklist

- **Unattached volumes and old snapshots**: left after instances were deleted. Snapshot lifecycle policies should expire them.
- **Idle load balancers, NAT gateways and IP addresses**: they bill by the hour even with no traffic.
- **Oversized databases and caches**: provisioned for a peak, with low connections and CPU.
- **Orphaned test stacks**: forgotten feature environments.
- **Over-retained logs and metrics**: ingest is often the larger cost than storage.

Each item should have an owner via tags. Items without an owner enter a process: notify, wait a fixed time, snapshot, then delete.

## Schedule what does not need to run

Development, test and demo environments often need to run only during working hours, which is about a quarter of the week. Stop instances, scale node groups to zero and pause databases outside those hours, and make it easy to start them again. Automate with the provider's scheduler, a pipeline job or a small script, and tag environments with their schedule.

```predict
Q: A volume is unattached and has no tags. Should you delete it now?
???
Not immediately. Create a snapshot, notify likely owners, wait a grace period and then delete. An unattached volume may still hold needed data.
> Reversible steps first.
```

## Incident: The cleanup that deleted a restore

> **Incident:** A cost cleanup removed "unused" snapshots older than 90 days, and a month later a team needed one of them to recover a customer database.

```console
$ aws ec2 describe-snapshots --owner-ids self --query 'Snapshots[?StartTime<=`2026-01-01`].[SnapshotId,Description]' --output text | head -3
snap-0a1  quarterly-archive-prod-db
```

The snapshots were the only copies of quarterly archives, but they were untagged and looked abandoned. The clean-up job had no grace period and no review. Recovery took days, from a partial backup. The team now requires an owner and a retention tag on every snapshot, runs cleanup in report mode first, adds a 14-day quarantine (stop or snapshot before delete) and keeps a short list of "never delete without a human" resource types.

## Common mistakes

- Sizing from average CPU instead of high percentiles
- Deleting "unused" resources without owners or a grace period
- Optimizing small items while ignoring a large database or data transfer
- Rightsizing production in one big jump

```quiz
Q: Which metric is better for sizing CPU?
+ A high percentile such as p95 over a representative period
- The average over one minute :: Hides peaks.
- The lowest value :: Hides load.
- The number of tags :: Unrelated.
> Size for the peak you must handle.

Q: Why quarantine before deleting?
+ Wrongly identified resources can be restored
- To make the bill larger :: Opposite aim.
- To avoid tagging :: Unrelated.
- To speed up deletion :: It slows it on purpose.
> Make the action reversible.

Q: Which resources bill hourly even with no traffic?
+ Load balancers, NAT gateways and reserved IP addresses
- Deleted objects :: They do not exist.
- Free-tier tags :: Not resources.
- Comments in code :: Not resources.
> Idle does not mean free.

Q: How can you reduce the cost of dev and test environments?
+ Stop or scale them to zero outside working hours
- Run them at full size all week :: Wasteful.
- Move them to production :: Risky.
- Disable monitoring :: Does not save much.
> Schedule what is not needed 24 hours a day.
```

```cards
Rightsizing :: match size to measured peak with headroom
Candidates :: unattached volumes, old snapshots, idle load balancers
Quarantine :: stop or snapshot before delete, with a grace period
Schedules :: dev and test off outside working hours
Owner first :: no tag means ask before removing
```
