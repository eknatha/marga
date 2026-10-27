## The key in the public repository
module: security
level: Advanced
minutes: 7
lesson: security/secrets-management
summary: A cloud access key appears in a public code repository. Respond in the right order and prove what was accessed.
intro: A security researcher emails you at 10:15 with a link to a public repository. A file in it contains an access key for your company's cloud account, committed three weeks ago.

### s1
text: You confirm the key is real and belongs to the ci-deploy user. What is your first action?
- Delete the repository and reply that it is handled => end-fail | 0 | The key has been public for three weeks and has probably been copied. Deleting the repository does not make it safe. Example: Deleting the public repository does not remove copies: scrapers and forks already hold the file, and the access key AKIA... still works.
- Disable the key immediately, then investigate what it did => s2 | 2 | Disabling stops any further use at once and can be reversed if needed. Example: aws iam update-access-key --access-key-id AKIA... --status Inactive blocks the key in seconds and you can set it Active again if a production job breaks.
- Write a long incident report first => s3 | 0 | Every minute the key is active gives an attacker time. Example: A two hour report while the key is live means an attacker can keep starting servers and reading storage for those two hours.

### s2
text: The key is disabled. Now you need to find out whether anyone used it. Where do you look?
- The cloud audit log, filtered by this access key id, for the last three weeks => s4 | 2 | Audit logs show each call, source address and result. Example: CloudTrail lookup by AccessKeyId shows CreateUser from 198.51.100.7 in another country on day 2, and RunInstances in a region you never use.
- The repository's commit history only => s3 | 0 | The repository shows how it leaked, not how it was used. Example: The commit history shows that the key was added on 3 March in config.py, which explains the leak but not what the attacker did after finding it.

### s3
text: Without logs you cannot say what happened. What is the next step?
- Query the audit log for the key id and the time since the commit => s4 | 2 | This is the evidence you need. Example: Querying the log from 3 March to today for that key id returns 1,200 events, including CreateAccessKey and AttachUserPolicy by an unknown address.
- Assume nothing happened because nobody has complained => end-fail | 0 | Attackers do not complain. Absence of reports is not evidence. Example: No complaint does not mean no use. Mining servers can run for weeks and show up only on the bill at month end.

### s4
text: The log shows calls from an unknown address in another country starting two days ago: ListBuckets, then GetObject on a bucket of customer exports, then CreateAccessKey for a new user named backup-svc. What do you do?
- Treat it as a breach: preserve the logs, remove the new user and key, check what else the attacker created, and involve the security and legal contacts => s5 | 2 | The attacker created persistence. Contain it, keep evidence and start the formal process. Example: Save the logs, delete the created user 'backup-svc' and its key, list instances and roles created by the key, and call the security lead and legal on the same hour.
- Delete only the leaked key and close the case => end-fail | 0 | The attacker already created another way back in. Example: Revoking only the leaked key leaves the attacker's new user 'backup-svc' with a working key and admin policy, so they simply log in again.

### s5
text: You found the backup-svc user and its key, plus a new role that trusts an external account. How do you contain it?
- Disable the new key, remove the role and user after taking a copy of their configuration, and rotate other credentials the ci-deploy user could reach => s6 | 2 | You remove persistence while keeping evidence, and limit further risk. Example: Export the configuration of the new user and role to a file, then delete them, and rotate secrets stored in Secrets Manager that ci-deploy could read.
- Rebuild the entire account from scratch right now => s6 | 1 | It may eventually be needed, but starting without a scoped plan could destroy evidence and cause long downtime. Example: Deleting and rebuilding the account on day one wipes the evidence you need and takes production offline for a week, while a targeted clean-up takes hours.

### s6
text: The data in the exports bucket was downloaded. What are the next steps?
- Decide on notification duties with legal advice, tell affected customers as required, and fix the root cause: short-lived credentials, a secret scanner in the pipeline, and least privilege for the CI role => end-win | 2 | You handle the obligations and remove the cause. Example: With legal advice you notify the data protection authority within the legal limit if customer data was read, and replace the key with OIDC short-lived tokens plus a secret scan in the pipeline.
- Keep quiet to protect the company's image => end-fail | 0 | Hiding a breach is unethical and often breaks the law. Example: Not telling customers whose data was copied can bring fines and a loss of trust that is far worse than the original leak.

### end-win
end: win
text: The attacker lost access within the hour of discovery. Audit evidence was kept, obligations were met, and the pipeline now uses short-lived credentials and scans for secrets.
takeaway: Disable first, then investigate with audit logs, look for persistence, preserve evidence, and fix the cause with short-lived credentials and secret scanning.

### end-fail
end: fail
text: The attacker kept access or the company failed in its duties. The incident turned into a larger and longer breach.
takeaway: A leaked key must be treated as used. Remove all attacker access and be honest with those affected.
