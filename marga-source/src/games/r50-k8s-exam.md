## The silent snapshot
module: k8s-exam
level: Intermediate
minutes: 7
lesson: k8s-exam/cka-etcd-backup-restore-and-static-pods
summary: An etcd backup task finishes with no error but the file is empty. Find out why and finish the task correctly.
intro: In a timed exam you ran an etcd snapshot command and it printed nothing useful. You have 8 minutes left for this task.

### s1
text: What do you check first? Choose the best next step.
- The size of the file and the output of snapshot status => s2 | 2 | Verify the result, not the absence of errors. Example: The file is zero bytes and status fails.
- Assume it worked and move on => end-fail | 0 | An unverified backup is not a backup. Example: The next task needs the restore and it fails.
- Reinstall etcd => end-fail | 0 | Far too drastic and it risks the cluster. Example: The control plane goes down with minutes left.

### s2
text: The file is empty. Where do you find the correct connection details?
- In the etcd static pod manifest: endpoints, cacert, cert and key paths => s3 | 2 | The manifest shows what etcd itself uses. Example: The manifest lists the client certificate paths under /etc/kubernetes/pki/etcd.
- Guess common paths => s3 | 1 | Wrong guesses waste time. Example: Two attempts fail with certificate errors.
- Search the whole disk for pem files => s3 | 1 | Slow and may pick the wrong file. Example: Dozens of pem files appear and none are labelled.

### s3
text: You run the snapshot with all four flags. What next?
- Verify with snapshot status and note the file path in the answer => s4 | 2 | Verification is what the task checks. Example: Status shows a hash and a revision number.
- Delete the file to save space => s4 | 0 | You would remove the answer. Example: The task scores zero.
- Stop the API server to be safe => s4 | 0 | Not needed for a snapshot. Example: Everything else in the cluster stops responding.

### s4
text: The next task is a restore. Which is the safe sequence?
- Restore into a new data directory, edit the manifest volume path and wait for the pod to restart => end-win | 2 | The kubelet recreates the static pod from the manifest. Example: The new directory holds the data and the API server returns.
- Restore over the live data directory => end-fail | 0 | Overwriting live data risks corruption. Example: The restore fails halfway and the data is damaged.
- Delete the etcd pod with kubectl => end-ok | 1 | A static pod comes back from its manifest, so deleting it does nothing. Example: The mirror pod returns unchanged.

### end-win
end: win
text: The task completed but with extra time spent on guesses.
takeaway: Practise reading the manifest first. Review the lesson and try again.

### end-ok
end: ok
text: You verified the backup, used the right flags and restored safely with the manifest.
takeaway: Verify every backup. Always take connection details from the manifest.

### end-fail
end: fail
text: An unverified backup or a risky restore put the cluster at risk and lost the task.
takeaway: Verify before you rely on a backup. Review the lesson and try again.

## Passwords in the backup
module: k8s-exam
level: Advanced
minutes: 7
lesson: k8s-exam/cks-minimize-microservice-vulnerabilities
summary: A reviewer finds a secret in plain text inside a backup. Contain it and close the gap.
intro: During a review a colleague reads an etcd backup with a text tool and finds a database password. The cluster has no encryption configuration.

### s1
text: What is the first containment step? Choose the best next step.
- Restrict access to the backup and treat the password as exposed => s2 | 2 | Stop further exposure and assume the secret is known. Example: The backup share is locked down and the password is marked for rotation.
- Delete the backup and say nothing => s2 | 1 | Deleting hides the problem and may remove evidence. Example: The same secrets remain in the live store.
- Base64 encode the password => end-fail | 0 | Base64 is not protection. Example: Anyone can decode it in a second.

### s2
text: What fixes the storage of secrets? Choose the best next step.
- Enable encryption at rest with an encryption configuration on the API server => s3 | 2 | New and rewritten secrets are then stored encrypted. Example: The API server flag points at a config with an aescbc or kms provider.
- Hide the secrets with more RBAC only => s3 | 1 | RBAC does not protect the stored bytes. Example: A person with disk access still reads them.
- Move secrets into ConfigMaps => end-fail | 0 | ConfigMaps are not protected at all. Example: The password is still readable and now looks less sensitive.

### s3
text: Existing secrets were written before encryption. What do you do?
- Rewrite them all so they are stored with the new provider, then check the raw value => s4 | 2 | Old objects stay readable until rewritten. Example: A replace on every secret makes etcdctl show an encrypted prefix.
- Assume they are encrypted now => s4 | 0 | Only new writes use the provider. Example: Old values stay in plain text.
- Restart the API server again => s4 | 1 | A restart does not rewrite stored data. Example: Nothing changes in the stored values.

### s4
text: What should you do about the exposed password?
- Rotate it, update the dependent applications and record the incident => end-win | 2 | An exposed secret must be replaced. Example: The database user gets a new password and the app is restarted with it.
- Keep it and watch for misuse => end-ok | 1 | Watching is weaker than replacing. Example: Misuse could go unnoticed for weeks.
- Change the secret name only => end-fail | 0 | The value is unchanged. Example: The old password still works.

### end-win
end: win
text: The immediate risk went down but a step was missed and some secrets are still readable.
takeaway: Check the raw stored value after every change. Review the lesson and try again.

### end-ok
end: ok
text: Access was restricted, encryption at rest is enabled, secrets were rewritten and the password was rotated.
takeaway: Treat etcd and its backups as secret stores and rotate anything exposed.

### end-fail
end: fail
text: The password stayed usable and readable, so the exposure continued.
takeaway: Encoding and hiding are not protection. Review the lesson and try again.
