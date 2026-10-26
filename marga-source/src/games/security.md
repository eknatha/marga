## The key in the public repository
module: security
level: Advanced
minutes: 7
lesson: security/secrets-management
summary: A cloud access key appears in a public code repository. Respond in the right order and prove what was accessed.
intro: A security researcher emails you at 10:15 with a link to a public repository. A file in it contains an access key for your company's cloud account, committed three weeks ago.

### s1
text: You confirm the key is real and belongs to the ci-deploy user. What is your first action?
- Delete the repository and reply that it is handled => end-fail | 0 | The key has been public for three weeks and has probably been copied. Deleting the repository does not make it safe.
- Disable the key immediately, then investigate what it did => s2 | 2 | Disabling stops any further use at once and can be reversed if needed.
- Write a long incident report first => s3 | 0 | Every minute the key is active gives an attacker time.

### s2
text: The key is disabled. Now you need to find out whether anyone used it. Where do you look?
- The cloud audit log, filtered by this access key id, for the last three weeks => s4 | 2 | Audit logs show each call, source address and result.
- The repository's commit history only => s3 | 0 | The repository shows how it leaked, not how it was used.

### s3
text: Without logs you cannot say what happened. What is the next step?
- Query the audit log for the key id and the time since the commit => s4 | 2 | This is the evidence you need.
- Assume nothing happened because nobody has complained => end-fail | 0 | Attackers do not complain. Absence of reports is not evidence.

### s4
text: The log shows calls from an unknown address in another country starting two days ago: ListBuckets, then GetObject on a bucket of customer exports, then CreateAccessKey for a new user named backup-svc. What do you do?
- Treat it as a breach: preserve the logs, remove the new user and key, check what else the attacker created, and involve the security and legal contacts => s5 | 2 | The attacker created persistence. Contain it, keep evidence and start the formal process.
- Delete only the leaked key and close the case => end-fail | 0 | The attacker already created another way back in.

### s5
text: You found the backup-svc user and its key, plus a new role that trusts an external account. How do you contain it?
- Disable the new key, remove the role and user after taking a copy of their configuration, and rotate other credentials the ci-deploy user could reach => s6 | 2 | You remove persistence while keeping evidence, and limit further risk.
- Rebuild the entire account from scratch right now => s6 | 1 | It may eventually be needed, but starting without a scoped plan could destroy evidence and cause long downtime.

### s6
text: The data in the exports bucket was downloaded. What are the next steps?
- Decide on notification duties with legal advice, tell affected customers as required, and fix the root cause: short-lived credentials, a secret scanner in the pipeline, and least privilege for the CI role => end-win | 2 | You handle the obligations and remove the cause.
- Keep quiet to protect the company's image => end-fail | 0 | Hiding a breach is unethical and often breaks the law.

### end-win
end: win
text: The attacker lost access within the hour of discovery. Audit evidence was kept, obligations were met, and the pipeline now uses short-lived credentials and scans for secrets.
takeaway: Disable first, then investigate with audit logs, look for persistence, preserve evidence, and fix the cause with short-lived credentials and secret scanning.

### end-fail
end: fail
text: The attacker kept access or the company failed in its duties. The incident turned into a larger and longer breach.
takeaway: A leaked key must be treated as used. Remove all attacker access and be honest with those affected.
