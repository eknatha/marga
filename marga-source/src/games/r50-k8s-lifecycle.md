## The old snapshot
module: k8s-lifecycle
level: Advanced
minutes: 7
lesson: k8s-lifecycle/backup-and-disaster-recovery-for-the-cluster
summary: A control plane is lost and the newest snapshot is months old. Recover and prevent a repeat.
intro: A cloud zone failure destroyed all three control plane nodes. The team starts to restore etcd and finds the newest snapshot is eight months old.

### s1
text: What do you do first with the old snapshot?
- Check the size and status, restore it to a scratch cluster and see what is missing => s2 | 2 | Verify before you trust it. Example: The restore works and shows which applications are absent.
- Restore it straight into production => s2 | 1 | You may lose newer state without noticing. Example: Eight months of changes disappear at once.
- Wait for a newer one to appear => end-fail | 0 | Nothing will create one. Example: The outage continues.

### s2
text: Many deployments are missing after the restore. How do you rebuild them?
- Reapply manifests and charts from source control in a safe order => s3 | 2 | The repository holds the intended state. Example: Namespaces and quotas go first and applications follow.
- Recreate each application from memory => s3 | 1 | Slow and error prone. Example: Three services are rebuilt with the wrong settings.
- Ask each team to redeploy by hand without a list => end-fail | 0 | No order and no record. Example: Teams collide on shared resources.

### s3
text: How do you find out why snapshots stopped?
- Check the job history and find the node rebuild that removed the cron entry => s4 | 2 | Evidence shows the cause. Example: The job lived on a node and was lost when it was rebuilt.
- Assume nobody changed anything => s4 | 1 | It ignores the facts. Example: The cause stays unknown.
- Blame the storage vendor => end-fail | 0 | There is no evidence for it. Example: The real fault remains in the setup.

### s4
text: What stops this recurring? Choose the best next step.
- Run snapshots as a monitored CronJob, alert on snapshot age and rehearse restores => end-win | 2 | Detect silence and test the path. Example: An alert fires at twelve hours without a new snapshot.
- Take one more manual snapshot now => end-ok | 1 | It fixes today only. Example: The same gap appears again later.
- Keep more old snapshots => end-fail | 0 | Old copies do not help if new ones stop. Example: The newest is still stale.

### end-win
end: win
text: The cluster returned but with gaps and without a clear fix for the missing snapshots.
takeaway: Fix the cause as well as the state. Review the lesson and try again.

### end-ok
end: ok
text: The cluster was rebuilt from source control, and monitoring plus rehearsals now guard the backups.
takeaway: A backup is only real when restores are tested and silence raises an alert.

### end-fail
end: fail
text: Risky restores and guesses made the outage longer.
takeaway: Verify before you restore and rebuild from a known source. Review the lesson and try again.
