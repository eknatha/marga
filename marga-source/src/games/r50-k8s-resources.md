## Slow with low CPU
module: k8s-resources
level: Advanced
minutes: 7
lesson: k8s-resources/cpu-and-memory-behaviour-throttling-and-oom
summary: An API is slow but its CPU graph looks calm. Find the real limit.
intro: A checkout API has a p99 of three seconds after a release. CPU average is thirty percent and the team plans to add more pods.

### s1
text: What do you check before adding pods? Choose the best next step.
- The throttled period ratio and the CPU limit of the container => s2 | 2 | Limits can slow a container while average CPU is low. Example: nr_throttled is forty percent of nr_periods.
- Add pods and see => s2 | 1 | It may not fix it and costs more. Example: Each new pod is throttled in the same way.
- Restart the nodes => end-fail | 0 | It does not address a limit. Example: The latency returns after restart.

### s2
text: The ratio shows heavy throttling. What is a good fix?
- Raise the limit or remove it and keep the request near typical use => s3 | 2 | Throttling comes from the limit. Example: A higher limit lets bursts finish.
- Lower the request to save cost => s3 | 1 | It changes scheduling, not the quota. Example: Pods are packed tighter and are slower.
- Add a sidecar proxy => end-fail | 0 | Unrelated to the cause. Example: Overhead and the same pauses.

### s3
text: Is there another risk from a higher limit?
- Noisy neighbours, so keep requests honest and watch node CPU => s4 | 2 | Requests protect each pod share under contention. Example: Pods keep their share when the node is busy.
- No risk at all => s4 | 1 | Shared nodes can be contended. Example: A busy node slows several pods.
- The pod will be evicted for using CPU => end-fail | 0 | CPU is compressible and is throttled, not evicted. Example: Eviction is for memory and disk.

### s4
text: How do you keep it fixed? Choose the best next step.
- Alert on throttled ratio and p99 latency together => end-win | 2 | Both signals show the problem early. Example: An alert at ten percent throttling leaves time to adjust.
- Check once a year => end-ok | 1 | Workloads change. Example: The next release brings it back.
- Rely on average CPU => end-fail | 0 | It hides short bursts. Example: The graph stays calm while users wait.

### end-win
end: win
text: Latency improved but the monitoring gap remains.
takeaway: Alert on throttling as well as CPU. Review the lesson and try again.

### end-ok
end: ok
text: The limit was raised, latency fell and alerts now watch throttling.
takeaway: Average CPU hides bursts. Check throttling before you add replicas.

### end-fail
end: fail
text: More pods raised the cost and the latency stayed high.
takeaway: Find the limit that binds before scaling out. Review the lesson and try again.
