## The access key on a public repo
module: cloud-iam
level: Intermediate
minutes: 6
lesson: cloud-iam/debugging-access-denied-and-cloud-security-incidents
summary: A cloud access key was pushed to a public repository and unknown instances are running. Contain it.
intro: A billing alert shows a spike. Audit logs show a developer access key creating large instances in a region you never use.

### s1
text: A leaked key is being used. What is the first action?
- Disable or deactivate the key now, then investigate what it did => s2 | 2 | Stop the access first, keep the evidence. Example: Setting the key inactive stops new calls but leaves the logs for review.
- Delete the repository only => s2 | 1 | The key still works and is already copied. Example: Bots have scraped the key within minutes.
- Wait until the investigation is complete => end-fail | 0 | Every minute costs money and risk. Example: Another fifty instances launch.

### s2
text: What do you check in the audit trail? Choose the move you would make next.
- Every action by that key: instances, new users or keys, policy changes and data access => s3 | 2 | Attackers add persistence. Example: CloudTrail shows a new IAM user and an access key created two hours ago.
- Only the instances => s3 | 1 | You may miss persistence and data theft. Example: A backdoor user remains.
- Nothing, just terminate instances => s3 | 0 | You would not know what else changed. Example: The attacker returns with the new user.

### s3
text: You find a backdoor user and extra roles. What next?
- Remove the attacker-created identities, rotate related credentials and review resources in all regions => s4 | 2 | Clean everything the key touched. Example: Delete the new user, reset keys of the same developer and scan unused regions.
- Leave them, they are probably harmless => s4 | 0 | They give the attacker a way back. Example: The attacker reuses the user.
- Delete only the instances => s4 | 1 | The backdoor remains. It helps only in part. Example: Instances are relaunched.

### s4
text: How do you prevent a repeat? Choose the move you would make next.
- Use short-lived roles instead of long-lived keys, enable secret scanning and restrict unused regions => end-win | 2 | Remove the standing secret. Example: SSO with role assumption gives tokens that expire in hours.
- Tell developers to be careful => end-ok | 1 | It does not scale. It helps only in part. Example: The next key leaks.
- Give the key more permissions to investigate => end-fail | 0 | It increases harm. That does not deal with the real cause. Example: The attacker gains more.

### end-win
end: win
text: The key was disabled quickly, the backdoors were removed, and short-lived roles replaced the standing keys.
takeaway: Disable first, investigate, remove persistence, then remove long-lived keys.

### end-ok
end: ok
text: Immediate harm stopped, but standing keys remain.
takeaway: Move to short-lived credentials.

### end-fail
end: fail
text: Delay or partial clean-up let the attacker keep access.
takeaway: Contain fast and check persistence.

## The role that could do everything
module: cloud-iam
level: Beginner
minutes: 5
lesson: cloud-iam/least-privilege-and-access-reviews
summary: An application role has full admin rights. Reduce it to what the app really needs.
intro: A review finds the reporting app role has AdministratorAccess because "it was easier".

### s1
text: The app role has admin rights. Why is that risky?
- If the app is compromised, the attacker inherits everything the role can do => s2 | 2 | Permissions set the blast radius. Example: A bug in the app lets an attacker delete production databases with the role.
- It is not risky, the app is internal => s2 | 0 | Internal apps get attacked too. Example: A stolen token is used from outside.
- It costs more money => s2 | 1 | Cost is not the main problem. It helps only in part. Example: The bill is the same.

### s2
text: How do you find what the app actually needs?
- Use access logs and policy analysis to see which actions it used, then write a policy for those => s3 | 2 | Base permissions on evidence. Example: Access Advisor lists three services used in 90 days.
- Guess and remove permissions in production => s3 | 0 | Guesses cause outages. That does not deal with the real cause. Example: Reports fail at month end.
- Ask the developer from memory => s3 | 1 | Memory misses rare jobs. It helps only in part. Example: The monthly job breaks.

### s3
text: How do you roll out the smaller policy? Choose the move you would make next.
- Apply it in staging, watch for denials, then production with a quick rollback path => s4 | 2 | Test the change before it hurts. Example: Denied calls appear in logs and are added to the policy.
- Swap it in on Friday evening => s4 | 0 | Failures hit with nobody ready. Example: Reports break over the weekend.
- Skip testing, it is only read access => s4 | 1 | Even read access can be needed by jobs. Example: A job reads a bucket you removed.

### s4
text: How do you keep it least-privilege? Choose the move you would make next.
- Review access regularly, alert on unused permissions and require approval for broad grants => end-win | 2 | Permissions drift without review. Example: A quarterly review removes unused actions.
- Review once and forget => end-ok | 1 | Drift returns. It helps only in part. Example: New broad rights creep in.
- Allow admin for convenience again => end-fail | 0 | It repeats the problem. That does not deal with the real cause. Example: The same finding returns.

### end-win
end: win
text: The role is now scoped to real usage, tested in staging and reviewed regularly.
takeaway: Base permissions on evidence and review them.

### end-ok
end: ok
text: Access is smaller, but drift is not controlled.
takeaway: Review regularly. Review the lesson and try the game again.

### end-fail
end: fail
text: Guessing or weak testing broke jobs or kept the risk.
takeaway: Use logs, then test. Review the lesson and try the game again.

