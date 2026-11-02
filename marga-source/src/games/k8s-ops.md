## The drain that never finished
module: k8s-ops
level: Intermediate
minutes: 7
lesson: k8s-ops/nodes-draining-taints-and-capacity
summary: A node drain hangs during maintenance. Find out why and finish safely.
intro: You are patching nodes. The drain of node-3 has been stuck for an hour with a message about a disruption budget.

### s1
text: The drain reports it would violate a disruption budget. What do you check?
- List the budgets and replicas for the affected application => s2 | 2 | The budget and replica count explain the block. Example: The api deployment has 3 replicas and a budget requiring all 3.
- Force delete the node => s2 | 1 | This skips safety and drops traffic. Example: Requests fail while pods are recreated.
- Reboot the node anyway => s2 | 0 | Same risk and no fix. Example: Pods vanish with no replacement ready.

### s2
text: The budget requires every replica. What is the safe change?
- Scale up by one replica and lower the budget so one pod can be evicted => s3 | 2 | You keep availability and unblock maintenance. Example: With 4 replicas and minAvailable 2 the drain continues.
- Delete the budget permanently => s3 | 1 | You lose protection for future drains. Example: The next drain evicts all pods at once.
- Wait for it to fix itself => s3 | 0 | It will not change. Example: The window passes.

### s3
text: The drain finished. How do you prevent a repeat?
- Review budgets for zero allowed disruptions, keep spare capacity and add the check to the runbook => end-win | 2 | Prevent the same stall. Example: A weekly report lists budgets that block drains.
- Skip drains in future => end-ok | 1 | Nodes still need patching. Example: Unpatched nodes accumulate.
- Remove all replicas => end-fail | 0 | Outage. Example: The service goes down.

### end-win
end: win
text: Nodes are patched without downtime, and the budget check is part of the runbook.
takeaway: Check budgets and replicas before draining, and keep spare capacity.

### end-ok
end: ok
text: The drain finished, but the next one may stall again.
takeaway: Fix the immediate block and add a check.

### end-fail
end: fail
text: Maintenance fails and traffic is dropped.
takeaway: Forcing a drain trades an annoyance for an outage.


## The backup that could not restore
module: k8s-ops
level: Intermediate
minutes: 7
lesson: k8s-ops/etcd-backup-and-restore
summary: Two of three etcd members are lost and the latest backup is empty. Recover and fix the process.
intro: A storage failure destroyed two etcd members. You reach for last night's snapshot and find a zero-byte file.

### s1
text: The latest snapshot is empty. What do you do first?
- Check older snapshots with the status command and pick the newest valid one => s2 | 2 | Verify before restoring. Example: Snapshot from 31 days ago shows 4,812 keys.
- Restore the empty file => s2 | 1 | It would erase the cluster state. Example: The cluster is rebuilt empty.
- Delete all backups => s2 | 0 | Destroys your only chance. Example: No recovery path remains.

### s2
text: You restored an older valid snapshot. What should you expect?
- Objects created since then are missing and deleted ones may return, so check and re-apply from the repository => s3 | 2 | State rolls back to the snapshot time. Example: Three new deployments need to be applied again.
- Everything is current => s3 | 1 | The snapshot is old. Example: Teams report missing services.
- Volumes were restored too => s3 | 0 | A snapshot does not include volume data. Example: Databases show old data.

### s3
text: Given what you have found so far: How do you fix the process?
- Verify every snapshot, alert on size and age, copy off-node, and drill restores quarterly => end-win | 2 | Detect failure early and rehearse. Example: A daily job runs the status check and pages on failure.
- Keep the same job => end-ok | 1 | The failure would repeat. Example: Another empty file appears.
- Stop taking backups => end-fail | 0 | No safety net. Example: The next failure is total.

### end-win
end: win
text: The cluster is restored, missing objects are re-applied, and backups are verified and rehearsed.
takeaway: Verify backups, store them off-node and rehearse restores.

### end-ok
end: ok
text: The cluster is back, but backup failures could still go unnoticed.
takeaway: Recover from what is valid, then fix the process.

### end-fail
end: fail
text: The cluster is lost and cannot be rebuilt from state.
takeaway: An unverified backup is a hope, not a plan.

