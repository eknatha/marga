## The etcd backup nobody tested
module: k8s-ops
level: Advanced
minutes: 7
lesson: k8s-ops/etcd-backup-and-restore
summary: The control plane lost its data and the only backup will not restore. Recover and fix the practice.
intro: A failed disk corrupts etcd on a single-control-plane cluster. kubectl hangs. The last backup is from 3 weeks ago.

### s1
text: The API server is down because etcd is corrupted. First step?
- Stop the control plane components, protect the data directory copy and find the newest valid backup => s2 | 2 | Avoid more damage and know your options. Example: Copy the corrupted directory aside for later analysis.
- Delete the etcd directory and start over => end-fail | 0 | You would lose any chance to recover. That does not deal with the real cause. Example: No data remains.
- Run kubectl apply repeatedly => s2 | 1 | The API is down, so it cannot work. It helps only in part. Example: Commands time out.

### s2
text: The backup is three weeks old. What does restoring it mean?
- The cluster state returns to three weeks ago, so newer objects are missing and need re-applying from source control => s3 | 2 | A restore is a point in time. Example: Deployments created last week are gone until your Git repo reapplies them.
- Everything will be current => s3 | 0 | Backups are not live copies. Example: Recent work disappears unexpectedly.
- Nothing will change => s3 | 0 | The state will be old. That does not deal with the real cause. Example: Stale objects return.

### s3
text: The snapshot restore fails on version or checksum. What do you check?
- The etcdctl version, the snapshot integrity and the restore flags for data dir and cluster name => s4 | 2 | Restores are picky about version and settings. Example: etcdutl snapshot status shows the hash and revision to verify the file.
- Try random flags => s4 | 0 | You may damage the restore. Example: The data directory is overwritten.
- Give up and rebuild by hand => s4 | 1 | It may be needed but check the simple causes first. Example: A flag was the only problem.

### s4
text: How do you make sure this works next time?
- Take frequent snapshots, store them off the node, and rehearse restores on a schedule => end-win | 2 | A backup is only proven by a restore. Example: A monthly restore drill in a scratch cluster records how long it takes.
- Keep backups on the same disk => end-fail | 0 | The same failure takes both. That does not deal with the real cause. Example: The disk dies with the backups.
- Backup yearly => end-ok | 1 | Too much would be lost. It helps only in part. Example: A year of change is gone.

### end-win
end: win
text: You protected the data, restored a valid snapshot, replayed state from source control and set a restore drill.
takeaway: A backup you have not restored is a hope.

### end-ok
end: ok
text: The cluster came back but old state was lost and practice is thin.
takeaway: Rehearse restores. Review the lesson and try the game again.

### end-fail
end: fail
text: Destroying the directory removed recovery options.
takeaway: Copy before you repair. Review the lesson and try the game again.

## The node drain that stalled
module: k8s-ops
level: Intermediate
minutes: 6
lesson: k8s-ops/nodes-draining-taints-and-capacity
summary: Draining a node for maintenance hangs and the upgrade window is closing. Find out why.
intro: kubectl drain node-3 waits forever. Pods will not evict and the window ends in 30 minutes.

### s1
text: The drain hangs. What does it print? Choose the move you would make next.
- Read the drain output for the pods it cannot evict and the reason => s2 | 2 | The message names the blocker. Example: It says "cannot evict pod ... would violate the PodDisruptionBudget".
- Force delete all pods => end-fail | 0 | You may cause an outage. Example: All replicas of one app go down together.
- Reboot the node => s2 | 1 | It drops running pods. It helps only in part. Example: Unflushed work is lost.

### s2
text: A PodDisruptionBudget blocks eviction. Why might that be?
- The budget requires more healthy pods than the app currently has, or only one replica exists => s3 | 2 | The budget protects availability. Example: minAvailable 2 with only two replicas, one already unhealthy.
- PDBs are broken => s3 | 0 | They work as designed. That does not deal with the real cause. Example: Nothing is broken.
- The node is too large => s3 | 0 | Size is unrelated. That does not deal with the real cause. Example: It has nothing to do with it.

### s3
text: How do you make progress safely? Choose the move you would make next.
- Scale the app up or fix the unhealthy pod so the budget allows eviction, then drain again => s4 | 2 | Satisfy the rule rather than bypass it. Example: Scaling to 3 replicas lets one be evicted while two stay available.
- Delete the PodDisruptionBudget => s4 | 1 | It removes protection for everything. Example: Another drain takes the app down.
- Use --disable-eviction => s4 | 0 | It skips protections. That does not deal with the real cause. Example: The app drops below capacity.

### s4
text: How do you avoid it next time? Choose the move you would make next.
- Review PDBs and replica counts before maintenance and rehearse drains in staging => end-win | 2 | Plan the window. Example: A pre-check lists apps whose budgets prevent draining.
- Set budgets to 100 percent => end-fail | 0 | No pod could ever move. That does not deal with the real cause. Example: Every drain stalls.
- Remove all budgets => end-ok | 1 | Availability protection disappears. Example: The next drain causes an outage.

### end-win
end: win
text: You read the blocker, satisfied the budget safely and checked budgets before maintenance.
takeaway: Fix the cause, do not bypass protection.

### end-ok
end: ok
text: The drain finished, but protections were weakened or untested.
takeaway: Check PDBs before maintenance.

### end-fail
end: fail
text: Forcing it risked an outage. Read each choice explanation to see why.
takeaway: Do not force delete. Review the lesson and try the game again.

