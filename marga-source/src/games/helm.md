## Happy Helming, broken site
module: helm
level: Beginner
minutes: 7
lesson: helm/upgrade-rollback-and-release-history
summary: An upgrade reports success while pods crash. Roll back safely, then make the pipeline catch it next time.
intro: Your pipeline ran helm upgrade for the shop frontend and printed Happy Helming. Minutes later customers report errors and the dashboard shows pods in CrashLoopBackOff.

### s1
text: Helm said the release was upgraded, yet pods crash. What is the first move to stop the damage?
- Check helm history and roll back to the last good revision with --wait => s2 | 2 | A rollback re-applies the previous manifests quickly. Example: helm rollback shop-web 7 -n shop --wait brings back the revision that ran fine yesterday.
- Delete the namespace and reinstall => s3 | 0 | This destroys state such as claims and secrets. Example: The persistent volume claim and the TLS secret vanish and the reinstall needs manual repair.
- Scale the deployment to zero and wait => s3 | 1 | It stops the errors but also the site. Example: Customers now get a 503 for every request.

### s2
text: The rollback worked. Why did the upgrade report success?
- Without --wait or --atomic Helm returns when the objects are accepted, not when pods are ready => s4 | 2 | Helm only waits if told to. Example: helm upgrade without --wait returns in 3 seconds while pods fail their readiness probe afterwards.
- Helm cannot detect failures at all => s3 | 0 | It can, with the right flags. Example: helm upgrade --atomic --wait --timeout 5m would have rolled back by itself.
- The cluster lied => s3 | 0 | The cluster reported the truth; the pipeline did not ask. Example: kubectl get pods shows the crash loop immediately.

### s3
text: Given what you have found so far: What do you change in the pipeline?
- Use upgrade --install --atomic --wait --timeout 5m, add a smoke test with helm test, and alert on unready pods => end-win | 2 | Failed rollouts now revert automatically and are visible. Example: The next bad image is rolled back within five minutes and the pipeline job fails.
- Add a manual check after every deploy => end-ok | 1 | Helpful but human checks are skipped under pressure. Example: On a busy Friday the check is skipped and the same failure ships.
- Ignore it, rollbacks are easy => end-fail | 0 | Customers see the errors before you act. Example: Thirty minutes of failed checkouts happen before anyone looks.

### s4
text: Given what you have found so far: Why did the new image crash?
- Review the diff of values and rendered manifests between revisions to find the cause => end-win | 2 | Revisions are stored, so compare them. Example: helm get values shop-web --revision 7 versus 8 shows a changed DB_HOST value.
- Guess and try again => end-ok | 1 | Guessing wastes time. Example: Two more bad deploys happen before someone reads the diff.
- Delete the history => end-fail | 0 | You lose the evidence and the rollback targets. Example: The history is gone and the next rollback has nothing to roll back to.

### end-win
end: win
text: The pipeline waits for readiness, rolls back automatically and the cause is understood from revision diffs.
takeaway: Use --atomic --wait, keep history, and compare revisions to find the cause.

### end-ok
end: ok
text: The incident ended, but the process still depends on people noticing.
takeaway: Add automation so the next failure heals itself.

### end-fail
end: fail
text: Failed releases keep reaching users and evidence is lost.
takeaway: Success from helm upgrade alone does not mean the app is healthy.


## The password in helm get values
module: helm
level: Intermediate
minutes: 7
lesson: helm/values-per-environment-and-secrets
summary: A database password was committed in a values file. Contain the leak and change how the chart handles secrets.
intro: During a review someone notices that values-prod.yaml in the shared repository contains the production database password. The chart then passes it to the application as a value.

### s1
text: Given what you have found so far: What do you do first?
- Rotate the database password now and treat the old one as compromised => s2 | 2 | A secret that was committed is no longer secret. Example: ALTER USER shop PASSWORD with a new random value, then update the secret store.
- Delete the line and commit => s3 | 0 | The password stays in history and in the release history. Example: git log -p still prints the old password and so does helm get values.
- Wait for the next planned rotation => s3 | 0 | The exposure window stays open. Example: The password stays valid for another 60 days.

### s2
text: Given what you have found so far: Where else is the password stored?
- In the release Secret in the cluster, visible through helm get values to anyone allowed to read it => s4 | 2 | Helm stores values with each revision. Example: helm get values shop-web -n shop prints db.password in clear text.
- Nowhere else => s3 | 0 | Release history keeps the values. Example: Old revisions in the namespace hold older passwords too.
- Only in the container image => s3 | 0 | The image is built separately. Example: The image has no values data.

### s3
text: How should the chart receive the password from now on?
- Reference a Kubernetes Secret created by an external secrets controller or a secure pipeline step => end-win | 2 | Charts name secrets but never contain them. Example: auth.existingSecret: shop-db and the Secret is synced from the secret manager.
- Base64 encode the value in the file => end-ok | 1 | Base64 is encoding, not protection. Example: echo c2VjcmV0 | base64 -d prints the password.
- Keep it in values but make the repository private => end-fail | 0 | It still ends up in release history and logs. Example: A contractor with namespace read access sees it with helm get values.

### s4
text: Given what you have found so far: What prevents a repeat?
- Add secret scanning to pull requests, restrict who can read release Secrets and review values files => end-win | 2 | Controls catch mistakes before they spread. Example: A pre-merge scan blocks any file containing a string shaped like a database URL with credentials.
- Ask people to be careful => end-ok | 1 | Good intentions fail. Example: The next engineer pastes a token into a values file.
- Stop using values files => end-fail | 0 | Values are fine; secrets in them are the problem. Example: The team copies settings into templates and loses reviewability.

### end-win
end: win
text: The password is rotated, secrets come from a store by reference, and scanning stops new leaks.
takeaway: Rotate first, then change the design so values hold configuration and secrets arrive by reference.

### end-ok
end: ok
text: The password is rotated but nothing prevents the next leak.
takeaway: Add automated checks. Use this in your own work.

### end-fail
end: fail
text: Given what you have found so far: The password stays valid and exposed.
takeaway: Values files and release history are not secret stores.

