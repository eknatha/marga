## Pending with no events
module: k8s-control-plane
level: Advanced
minutes: 7
lesson: k8s-control-plane/control-plane-failure-modes-and-diagnosis
summary: Pods stay Pending with no events. Work out which component stopped and restore it safely.
intro: At 14:00 new pods stay Pending while existing pods serve traffic. The describe output shows no events at all.

### s1
text: What does the missing event tell you? Choose the best next step.
- The scheduler never tried the pod, so check the scheduler and its lease => s2 | 2 | A FailedScheduling event would exist if it had tried. Example: The scheduler pod shows CrashLoopBackOff.
- The nodes are full, so add more nodes => s2 | 1 | Full nodes would produce an event. Example: Nodes are added and the pods still sit Pending.
- The image is missing => end-fail | 0 | Image errors appear after scheduling. Example: The image is fine and nothing changes.

### s2
text: The scheduler log shows lease errors. What next?
- Check API server and etcd latency, because lease renewal depends on them => s3 | 2 | Lease errors usually point below the scheduler. Example: etcd disk latency is above one second.
- Restart the scheduler repeatedly => s3 | 1 | A restart hides the cause for a short time. Example: It works for five minutes and fails again.
- Delete the lease object and the node pool => end-fail | 0 | This breaks more than it fixes. Example: Leader election restarts but the latency remains.

### s3
text: etcd disk latency is high. What is the safest first action?
- Find the process that shares the disk and move etcd to dedicated fast storage => s4 | 2 | Disk contention is a common cause of etcd slowness. Example: A backup job writes to the same disk every hour.
- Add more etcd members at once => s4 | 1 | More members add replication work and risk. Example: Latency gets worse during the join.
- Disable the API server audit log and restart all nodes => end-fail | 0 | Not related to the evidence. Example: Nothing improves and an outage begins.

### s4
text: How do you stop it happening again? Choose the best next step.
- Alert on etcd fsync latency and API server latency and keep backups off the etcd disk => end-win | 2 | Alerts on the lowest layer give early warning. Example: The alert fires at 100 ms and the team acts before pods stall.
- Add a note to a wiki => end-ok | 1 | Notes do not alert. Example: The same event happens a month later.
- Raise the scheduler timeout => end-fail | 0 | It hides the symptom. Example: Pods stay Pending longer before failing.

### end-win
end: win
text: Pods were scheduled again but the cause is still there and will return.
takeaway: Fix the lowest layer, not only the component that complained. Review the lesson and try again.

### end-ok
end: ok
text: Scheduling resumed, the shared disk was separated and alerts now watch the lowest layer.
takeaway: Diagnose from the symptom down. Missing events point at the component that never looked.

### end-fail
end: fail
text: Changes were made at random and the control plane got less stable.
takeaway: Match the symptom to the component before touching anything. Review the lesson and try again.
