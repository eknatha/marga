# Reddit Pi Day outage, March 2023
company: Reddit
date: 14 March 2023
modules: kubernetes, networking, sre
calc: capacity, recovery
source: Reddit engineering: You Broke Reddit, the Pi Day outage | https://www.reddit.com/r/RedditEng/
summary: A Kubernetes upgrade interacted with an old routing label and an overlooked configuration, the control plane failed, and the site was down for hours.

## Before you read on
You upgrade a cluster and it breaks in a way that the staging cluster never showed. What differences between staging and production could explain it?

## The system
Reddit ran a large Kubernetes cluster for much of its platform. Nodes were labelled, and a network plugin used routing information and node labels to set up connectivity. The cluster had grown over years and some settings dated from its early life.

## Timeline as reported
- The team upgraded the cluster from one Kubernetes version to the next, a step that they had practised.
- As reported, an old node label used to select control plane nodes was no longer valid after the upgrade, and the network plugin lost connectivity between the nodes.
- The cluster lost its internal networking, and many services could not reach each other. The control plane also struggled because of the broken routes.
- Rolling back was hard, because the data store of the control plane had moved forward and the older version could not simply be restored.
- The engineers rebuilt the cluster state from a backup of the data store, which took many hours, because it needed manual steps and had to be tested.
- Service returned late on the same day, after about five hours, and the company published a detailed review.

## Root cause
A configuration that depended on an old label and a plugin behaviour, hard to see from the staging environment, and an upgrade path with no tested way back.

## What changed
- Reddit said it would keep staging and production closer, so that unusual settings are present in both.
- It also planned to test its backup and restore procedure for the control plane, and to upgrade in smaller steps with a clear rollback plan.

## Lessons learned
- Make staging match production in the details that matter, such as labels, versions and plugin settings.
- Test the path back before every upgrade: restoring the control plane data store should be a rehearsed procedure.
- Use more clusters of smaller size to limit the blast radius of an upgrade.
- Keep an inventory of old, undocumented settings and retire them on purpose.

## Trade-offs to weigh
- **Single large cluster against many small ones.** One cluster is easy to run. A failure takes everything with it.
- **Upgrade speed against safety.** Staying current avoids security debt. Each upgrade carries risk without rehearsal.
- **Reproducing production in staging.** An exact copy is expensive, and a copy that lacks the odd settings misses the real risk.

## Try the calculators
In the backup, RTO and RPO calculator, see how a manual restore of several hours changes your yearly downtime. In the capacity calculator, see how the load on the remaining clusters changes when one of several is lost.
