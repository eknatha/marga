## What is the difference between a request and a limit?
level: junior
A request is what the scheduler reserves for the pod and what its share is based on. A limit is a hard cap enforced by the kernel: CPU above the limit is throttled and memory above it is OOM killed.

## How are QoS classes decided?
level: junior
Guaranteed means every container has equal requests and limits for CPU and memory. Burstable means at least one request or limit is set. BestEffort has none. Under pressure BestEffort pods go first and Guaranteed last.

## Why can a pod be slow when average CPU looks low?
level: mid
Limits are enforced as a quota per period, so a bursty or multi-threaded container is throttled in short pauses. I check the throttled periods ratio and consider raising or removing the CPU limit.

## How does the HPA calculate replicas?
level: mid
Desired replicas equals current replicas times current metric divided by target, rounded up, bounded by min and max. It needs requests for resource metrics and uses stabilization to avoid flapping.

## Why does a cluster not scale down?
level: mid
Blocking pods such as those with local storage, no controller, restrictive disruption budgets or safe-to-evict false stop node removal. The autoscaler log names the blocker for each node.

## How would you plan capacity for a zone failure?
level: senior
Spread replicas across zones with topology constraints, set PodDisruptionBudgets, and keep enough spare capacity that remaining zones can host the lost zone workload. Then test it with a drain of a whole zone in a non-production cluster.
