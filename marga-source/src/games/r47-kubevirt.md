## The drain that stopped every VM
module: kubevirt
level: Advanced
minutes: 7
lesson: kubevirt/live-migration-node-drains-and-eviction
summary: A planned node drain begins to shut down virtual machines instead of moving them. Find out why and protect the rest of the fleet.
intro: It is a maintenance window. You start draining node2 for a kernel update and the first VMs on it begin to stop rather than migrate. Several of them run customer databases.

### s1
text: The drain has begun and VMs are stopping. What is your first move?
- Stop the drain and check the LiveMigratable condition of the VMs on the node => s2 | 2 | Stopping the drain protects the remaining VMs, and the condition names the exact blocker. Example: kubectl get vmi -o wide shows LiveMigratable False for db1 with a message about a shared ReadWriteMany PVC.
- Let the drain continue because the maintenance window is limited => s3 | 0 | Continuing stops every non-migratable VM on the node, including databases. Example: Forty minutes of database downtime follows because each stopped VM must restart on another node.
- Delete the stuck VMs so the drain can finish => end-fail | 0 | Deleting VMs destroys definitions and risks data. Example: A VM with a local disk is deleted and its definition has to be rebuilt from Git.

### s2
text: The condition says the disk is on a ReadWriteOnce PVC. What does that mean for migration?
- The disk cannot be attached to two nodes, so the VM cannot live-migrate => s4 | 2 | Migration attaches the same disk on source and target. Example: A RWO volume allows one node at a time, so the target launcher cannot attach it while the source runs.
- The VM is too large to migrate => s3 | 0 | Size slows a migration but does not forbid it. Example: A 64 GiB VM with RWX storage migrates in a few minutes.
- Live migration is switched off for the whole cluster => s3 | 0 | The condition names storage, not a cluster setting. Example: Other VMs on RWX disks migrate normally during the same drain.

### s3
text: The situation is getting worse. What do you do now?
- Stop and read the VMI conditions before taking any other action => s2 | 2 | Evidence first. Example: The message states exactly why migration is blocked.
- Reboot the node anyway to finish the window => end-fail | 0 | Rebooting stops all VMs on the node at once. Example: Every VM on node2 goes down hard, including the ones that were migratable.

### s4
text: Some VMs are migratable and some are not. How do you proceed with the maintenance?
- Let migratable VMs move, schedule a short planned stop for the RWO ones, and cordon the node meanwhile => s5 | 2 | This keeps most services up and makes the downtime planned. Example: kubectl cordon node2 prevents new VMs landing while two RWO VMs are shut down cleanly with the guest agent.
- Convert the disks to RWX while the VMs run => end-ok | 1 | Moving disks needs a storage migration and is risky in the middle of a window. Example: A copy to an RWX class takes hours and the window ends before it finishes.
- Cancel the maintenance and tell nobody => end-fail | 0 | The kernel update is still needed and the issue will return. Example: Next month the same drain stops the same VMs.

### s5
text: The window is done. How do you stop this from happening again?
- Move VM disks to an RWX Block StorageClass, check LiveMigratable in an alert, and rehearse a drain in staging => end-win | 2 | It removes the cause and adds a check. Example: A Prometheus alert fires when any VMI has LiveMigratable False, and the next drain migrates every VM.
- Document that drains stop some VMs and accept it => end-ok | 1 | It records the problem but leaves downtime in every window. Example: Each maintenance window now includes planned downtime for six VMs.
- Disable the eviction strategy so drains never touch VMs => end-fail | 0 | Drains would then hang or require manual kills. Example: Node updates are delayed for weeks and security patches are late.

### end-win
end: win
text: The next drain migrates every VM, and an alert catches any VM that cannot move.
takeaway: Choose RWX storage up front, check LiveMigratable before windows, and rehearse a drain.

### end-ok
end: ok
text: The window finished, but downtime remains part of every maintenance.
takeaway: Documenting a risk is not the same as removing it.

### end-fail
end: fail
text: Virtual machines were stopped or deleted and service was lost.
takeaway: Stop and read the condition before forcing a drain.
