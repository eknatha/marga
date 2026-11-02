## The app that never synced
module: argocd
level: Beginner
minutes: 5
lesson: argocd/sync-health-and-drift
summary: Argo CD shows OutOfSync and a manual change keeps reverting. Understand drift and desired state.
intro: Someone scaled a deployment to 6 replicas with kubectl. Argo CD shows OutOfSync and sets it back to 3.

### s1
text: The replica count reverted. Why? Choose the move you would make next.
- Git says 3 and self-heal restores the live state to match Git => s2 | 2 | Git is the source of truth. Example: Self-heal compares live state to the repository and reapplies it.
- Argo CD is faulty => s2 | 0 | It is doing what it is configured to do. Example: It reverted the change on purpose.
- Kubernetes undid it => s2 | 1 | Kubernetes did not; Argo CD did. Example: The controller is not the cause.

### s2
text: You need 6 replicas now. What is the right way?
- Change the value in Git, review and merge, and let Argo CD sync => s3 | 2 | Make the change where the truth lives. Example: A pull request edits replicas to 6 and syncs.
- Keep scaling with kubectl => s3 | 1 | It will keep reverting and hides the real state. Example: The next sync reverts it.
- Turn Argo CD off => s3 | 0 | You lose protection for all apps. That does not deal with the real cause. Example: Drift spreads.

### s3
text: You need it urgently during an incident. What can you do?
- Make the Git change fast, or pause auto-sync for that app, and record it => s4 | 2 | Break glass with a trace. Example: Pausing sync for ten minutes while a PR merges.
- Disable sync everywhere => s4 | 0 | Too broad. That does not deal with the real cause. Example: Other apps drift.
- Edit live and forget => s4 | 1 | The next sync undoes it. Example: Capacity vanishes at the worst time.

### s4
text: How do you make sure drift is visible? Choose the move you would make next.
- Alert on OutOfSync and Degraded, limit who can change the cluster and show diffs in review => end-win | 2 | Make drift noisy and rare. Example: An alert fires when an app is OutOfSync for ten minutes.
- Ignore OutOfSync => end-fail | 0 | Drift grows silently. That does not deal with the real cause. Example: The cluster differs from Git.
- Rely on people to tell each other about changes => end-ok | 1 | Informal notice is easy to miss. Example: A teammate scales it again without telling anyone.

### end-win
end: win
text: You changed Git, kept the audit trail and alerted on drift.
takeaway: Change the truth, not the live copy.

### end-ok
end: ok
text: The change went through, but workarounds remain.
takeaway: Keep Git the only path. Review the lesson and try the game again.

### end-fail
end: fail
text: Disabling protection spread drift. Read each choice explanation to see why.
takeaway: Keep sync on. Review the lesson and try the game again.

## The sync that deleted the database
module: argocd
level: Advanced
minutes: 7
lesson: argocd/hooks-sync-waves-and-progressive-delivery
summary: Pruning removed a resource that was still needed. Protect stateful resources.
intro: After a repository clean-up, an automatic sync with prune enabled deleted a PersistentVolumeClaim.

### s1
text: A sync deleted a claim. What do you do first?
- Stop automated sync for the app and check whether the volume still exists with its data => s2 | 2 | Stop more deletes and see what survives. Example: The PV had a Retain policy and the disk is intact.
- Sync again to fix it => end-fail | 0 | It may delete more. That does not deal with the real cause. Example: More resources are pruned.
- Wait and see => s2 | 1 | Further changes may be applied. It helps only in part. Example: Another prune runs.

### s2
text: Why was it pruned? Choose the move you would make next.
- It was removed from the repository and prune is on, so Argo CD deleted what Git no longer had => s3 | 2 | Prune deletes resources missing from Git. Example: The clean-up commit removed the claim file.
- Argo CD guessed => s3 | 0 | It follows Git. That does not deal with the real cause. Example: Git said it was gone.
- Kubernetes garbage collected it => s3 | 1 | Not the cause. It helps only in part. Example: No GC rule applied.

### s3
text: How do you recover the data? Choose the move you would make next.
- Re-create the claim bound to the retained volume or restore from backup, then verify the database => s4 | 2 | Use the retained disk or the backup. Example: Create a PVC pointing at the PV and check the database.
- Start with an empty database => s4 | 0 | You lose data. That does not deal with the real cause. Example: Customer records vanish.
- Hope the data is still there => s4 | 1 | Verify before relying. It helps only in part. Example: The volume has partial data.

### s4
text: How do you protect stateful resources next time?
- Set the Prune=false annotation, use Retain reclaim policies, enable backups and require review for removals => end-win | 2 | Make deletions deliberate. Example: argocd.argoproj.io/sync-options: Prune=false on the claim.
- Turn prune on for everything => end-fail | 0 | More deletion risk. That does not deal with the real cause. Example: More surprise removals.
- Trust reviewers to notice => end-ok | 1 | A deleted file is easy to miss. It helps only in part. Example: The next removal slips by.

### end-win
end: win
text: You stopped the sync, restored from the retained volume and protected stateful resources with annotations and backups.
takeaway: Treat deletion in Git as a production action.

### end-ok
end: ok
text: Data returned, but protection against pruning is thin.
takeaway: Add Prune=false and backups. Review the lesson and try the game again.

### end-fail
end: fail
text: Syncing again or guessing deleted more. Read each choice explanation to see why.
takeaway: Pause before fixing. Review the lesson and try the game again.

