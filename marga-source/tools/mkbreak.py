import json
B={
'ship-a-service':[
 ('Change the POST /items handler so bad input returns 200 instead of 400, then run make test.','The bad-input test fails and make test exits non-zero. If it still passes, your test was not testing that case.','Restore the 400, then add a test for an empty body so the gap cannot return.'),
 ('Delete the USER line from the Dockerfile, rebuild, and run: docker run --rm IMAGE id -u','It prints 0: the service now runs as root inside the container.','Put USER back. Add a pipeline step that fails when id -u prints 0.'),
 ('Pin the base image to an old tag with a known critical vulnerability and push a branch.','The scan job fails and the image is never pushed.','Move to a patched tag and pin it by version. Keep the scan as a required check.'),
 ('Change something by hand on the cluster, for example label the namespace with kubectl label, then run terraform plan.','The plan shows the difference between the code and the real cluster (drift).','Decide which side is right: apply to remove the label, or add it to the code. Never leave drift unexplained.'),
 ('Change the readiness probe path to /nope and apply the Deployment.','The new pods never become Ready and the rollout stalls. The old pods keep serving traffic.','Restore the path, or run kubectl rollout undo. Note how the probe protected users.'),
 ('Release a version that needs an environment variable you have not defined, such as DB_URL.','Pods enter CrashLoopBackOff and the logs name the missing variable.','Roll back first with kubectl rollout undo, then add the key to the ConfigMap and release again.')],
'run-it-reliably':[
 ('Set your SLO target to 100 percent and work out the error budget.','The budget is zero minutes, so a single failed request breaches the SLO.','Choose a target the users would not notice missing, such as 99.5 percent, and write down why 100 percent is not a goal.'),
 ('Add the user id as a metric label and send requests with 1,000 different ids.','The number of time series jumps (check prometheus_tsdb_head_series) and Prometheus memory grows.','Remove the label. Keep the id in logs, where high cardinality is cheap.'),
 ('Set the fast alert to fire at a 1x burn rate and inject a short burst of errors.','The alert pages for a spike that cost almost no budget: this is noise.','Restore the multi-window thresholds so only a sustained burn pages.'),
 ('Remove the timeout on one outbound call and make the dependency answer after 30 seconds.','Workers pile up waiting, the whole service stops answering and the latency SLI collapses.','Restore the timeout, cap the retries and add a circuit breaker.'),
 ('Delete the latest backup file, then try the restore from your runbook.','The restore fails. This is the lesson: an untested backup is not a backup.','Add a scheduled job that restores into a scratch database and checks a row count.'),
 ('Rewrite one postmortem action as "be more careful next time" and review it against your own rules.','It has no owner, no date and no way to tell if it is done.','Rewrite it as a change to a system, with an owner and a date.')],
'operate-a-cluster':[
 ('In the control plane node, move kube-apiserver.yaml out of /etc/kubernetes/manifests for a minute.','kubectl is refused or times out, but pods already running keep running.','Move the file back and watch the API server return. Note what the control plane does and does not do for running pods.'),
 ('Commit a chart with a template syntax error and let Argo CD pick it up.','Argo CD shows a comparison error and the live app is untouched.','Revert the commit. Add helm lint and helm template to the pipeline so it fails before merge.'),
 ('Bind team-a to cluster-admin "just to test", then run kubectl auth can-i get secrets -n team-b --as team-a-user.','It answers yes: team-a can read team-b secrets.','Remove the binding. Add a can-i check script that runs on every change.'),
 ('Delete the default-deny NetworkPolicy from team-a and curl its API from a team-b pod.','The request succeeds: the namespace is open again.','Reapply the policy and turn the curl into an automated test.'),
 ('Truncate a copy of your snapshot with head -c 1000 and run etcdutl snapshot status on it.','The status check fails: a damaged snapshot looks like a file until you check it.','Verify every snapshot after taking it and copy it off the node.'),
 ('Create a PodDisruptionBudget with minAvailable equal to the replica count, then drain the node.','The drain blocks and keeps retrying because no pod may be evicted.','Raise the replicas or relax the budget for the drain, then restore it.')],
'cloud-landing-zone':[
 ('Pick the guardrail "no public storage" and write the single command that would break it.','You now have a test case ready for stage 4. Without a test, a guardrail is only a wish.','Record the command and the expected denial in DESIGN.md.'),
 ('In a sandbox account, attach full administrator rights to the pipeline role, then run the policy analyzer.','The analyzer reports wide, unused permissions on the role.','Replace it with the scoped policy and add an alert for any administrator attachment.'),
 ('In a sandbox, open port 22 to 0.0.0.0/0 on a security group and run your configuration check.','The check flags an open admin port.','Remove the rule and use the managed session service. Keep the check as a scheduled test.'),
 ('In a sandbox, switch off the bucket public access block and upload a harmless test file with a public setting.','Your guardrail or config rule flags it, and the test file is reachable from outside.','Switch the block back on and add the account-level guardrail that denies the change.'),
 ('In a sandbox, stop the audit trail for a few minutes, then start it again.','Your "trail disabled" alert fires and the logs show a gap.','Add a guardrail that denies stopping the trail except for the break-glass role.'),
 ('In a sandbox, create one resource with no tags and wait for the next cost report.','It appears under untagged spend.','Add a tag policy that blocks untagged creation, and an automatic stop for dev resources.')]}
T=json.load(open('src/tracks/tracks.json'))
for t in T:
    for s,(a,b,c) in zip(t['stages'],B[t['id']]): s['breakit']={'do':a,'see':b,'fix':c}
json.dump(T,open('src/tracks/tracks.json','w'),indent=1)
print(sum('breakit' in s for t in T for s in t['stages']))
