# AWS Elastic Load Balancing and Christmas Eve, 2012
company: Amazon Web Services
date: 24 December 2012
modules: cloud, sre
calc: capacity, retries
source: AWS service disruption summary | https://aws.amazon.com/message/680587/
summary: A developer deleted live load balancer state in the wrong place, and customers, including a large video service, lost load balancing for many hours.

## Before you read on
Operators use tools that can modify production data. How would you design the tool so that deleting the wrong thing is hard, or can be undone?

## The system
Elastic Load Balancing in the US-East region keeps its state in a data store. Internal data is also used by control components that manage the load balancers when they change.

## Timeline as reported
- A developer ran a maintenance process against the production data, without the usual approval, and as reported, the process deleted some of the state.
- The load balancers lost part of the data they needed. Some requests failed, and customers could not make changes.
- The team found that the missing data was the cause only after some hours. They had to restore data from a snapshot to a point before the deletion, and reapply the changes from after it.
- Restoring the state was time-consuming. The loss of the state affected some customers for about 24 hours.
- Netflix, one of the affected customers, had streaming problems in parts of the US and Canada on Christmas Eve.

## Root cause
A person had access to production data without a safeguard for destructive actions, and the system could not rebuild the lost state quickly.

## What changed
- AWS made changes so that access to production data requires a specific approval each time.
- The company also changed its recovery tooling, to restore state faster, and improved its detection of the issue.

## Trade-offs to weigh
- **Operator access against safety.** Operators need access to fix things. A change request makes careless actions less likely and slows emergency work.
- **Snapshots against live replication.** A replica copies a mistaken delete. A snapshot lets you go back, at the cost of data newer than the snapshot.
- **Single region against several.** Spreading across regions protects against a region-wide fault, and it costs more.

## Try the calculators
In the capacity calculator, see how much spare capacity you would need to absorb the loss of one zone. In the retries calculator, see how customers' retries add load while a service is restoring.
