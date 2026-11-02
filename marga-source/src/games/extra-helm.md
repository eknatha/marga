## The release that would not roll back
module: helm
level: Intermediate
minutes: 6
lesson: helm/upgrade-rollback-and-release-history
summary: A Helm upgrade went wrong and the first rollback failed. Recover and learn.
intro: helm upgrade finishes but pods crash loop. You run helm rollback and it reports an error.

### s1
text: Pods crash after an upgrade. What do you do first?
- Check helm history and status, then roll back to the last good revision => s2 | 2 | History shows the revisions to return to. Example: helm history lists revision 7 as deployed and revision 6 as superseded.
- Delete the namespace => end-fail | 0 | You would destroy data. That does not deal with the real cause. Example: Persistent volumes are removed.
- Edit the pods directly => s2 | 1 | Manual edits drift from the release. Example: The next upgrade overwrites them.

### s2
text: Rollback reports an error. What do you examine?
- The error message and release state, for a failed or pending release, immutable fields or hook failures => s3 | 2 | The state explains why. Example: The release is in pending-upgrade after an interrupted run.
- Retry blindly => s3 | 1 | It may repeat the failure. It helps only in part. Example: The same error returns.
- Uninstall everything => s3 | 0 | You risk data and downtime. That does not deal with the real cause. Example: Services disappear.

### s3
text: The release is stuck in pending-upgrade. How do you move on?
- Follow the safe recovery for a stuck release, such as rolling back to a deployed revision after checking no operation is running => s4 | 2 | Make sure nothing else is changing it. Example: No other helm process runs, so rollback to revision 6 proceeds.
- Force delete the release secret without checking => s4 | 0 | It can lose state. That does not deal with the real cause. Example: History is gone.
- Run another upgrade now => s4 | 1 | It may compound the problem. It helps only in part. Example: The new revision also fails.

### s4
text: How do you make upgrades safer? Choose the move you would make next.
- Use --atomic and --wait with a timeout, run helm diff and template in CI, and keep values in version control => end-win | 2 | Atomic upgrades roll back on failure. Example: --atomic --timeout 5m rolls back automatically.
- Upgrade straight to production => end-fail | 0 | No test first. That does not deal with the real cause. Example: Production takes the failure.
- Skip reviewing the diff => end-ok | 1 | You miss changes. It helps only in part. Example: A surprising change reaches the cluster.

### end-win
end: win
text: You rolled back to a good revision, understood the stuck state and adopted atomic upgrades and diffs.
takeaway: Check history first, upgrade atomically.

### end-ok
end: ok
text: Service recovered, but upgrades are still risky.
takeaway: Use atomic upgrades. Review the lesson and try the game again.

### end-fail
end: fail
text: Destructive actions made things worse. Read each choice explanation to see why.
takeaway: Never delete first. Review the lesson and try the game again.

## The values file that overwrote production
module: helm
level: Beginner
minutes: 5
lesson: helm/values-per-environment-and-secrets
summary: Staging values were applied to production. Separate environments and protect secrets.
intro: A deploy with the wrong values file points production at the staging database with one replica.

### s1
text: Production is using staging settings. What is the first move?
- Roll back to the last good release and confirm production points at its own database => s2 | 2 | Restore the known good state first. Example: helm rollback prod-app 12 restores replicas and database settings.
- Edit values live in the cluster => s2 | 1 | Manual edits drift from source control. Example: The next deploy undoes them.
- Ignore it, staging data is similar => end-fail | 0 | Production traffic hits staging data. Example: Customers see test data.

### s2
text: How did the wrong file get applied? Choose the move you would make next.
- The pipeline took the values path from a variable that defaulted to staging => s3 | 2 | Defaults that point at a real environment are dangerous. Example: The pipeline used VALUES=staging when the variable was unset.
- Helm picked it at random => s3 | 0 | Helm does what it is told. That does not deal with the real cause. Example: It followed the command.
- Production does not need values => s3 | 0 | It does. That does not deal with the real cause. Example: It would use chart defaults.

### s3
text: How do you structure values to avoid this?
- Keep a base values file plus one explicit file per environment, with no default environment and a check that the target cluster matches => s4 | 2 | Explicit and validated beats implicit. Example: values.yaml, values-prod.yaml and a guard that fails if the context is not prod.
- One huge file with comments => s4 | 1 | Comments do not protect you. It helps only in part. Example: Someone edits the wrong block.
- Copy values by hand each time => s4 | 0 | Manual steps fail. That does not deal with the real cause. Example: A typo reaches production.

### s4
text: Where do secrets go? Choose the move you would make next.
- In a secrets manager or sealed or external secrets, not plain values in git => end-win | 2 | Secrets stay out of source control. Example: External Secrets pulls the database password at deploy time.
- In the values file in git => end-fail | 0 | Anyone with the repo can read them. Example: The password is in history.
- In a private values file shared by chat => end-ok | 1 | Better than public, but still unmanaged. Example: The file is copied around and never rotated.

### end-win
end: win
text: You rolled back, removed the unsafe default, validated the target and moved secrets out of git.
takeaway: Make the environment explicit and checked.

### end-ok
end: ok
text: Production is restored, but the pipeline can still choose wrongly.
takeaway: Remove the default. Review the lesson and try the game again.

### end-fail
end: fail
text: Ignoring it exposed customers to the wrong data.
takeaway: Roll back first. Review the lesson and try the game again.

