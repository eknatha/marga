## Access denied at 14:05
module: cloud
level: Intermediate
minutes: 6
lesson: cloud/identity-and-access
summary: A nightly job that worked for a year suddenly cannot read its storage bucket. Trace identity, policy and recent changes.
intro: The data export job fails with AccessDenied when it reads a storage bucket. It has run without trouble for a year, and the first failure was at 14:05 today. Nobody has touched the job.

### s1
text: Customers wait for their exports. You have admin access to the account. What do you do first?
- Give the job's role full administrator rights so it works again => end-fail | 0 | This removes least privilege and hides the cause. It also leaves a dangerous permission behind.
- Check which identity the job uses, and look for recent changes in the audit log => s2 | 2 | You need to know who is calling and what changed just before 14:05.
- Retry the job a few times => s3 | 0 | Retrying a permission error does not change the answer.

### s2
text: The audit log shows the job uses role export-job. Three minutes before the first failure, platform-admin ran PutBucketPolicy on the bucket. What do you do?
- Read the new bucket policy and compare it with the previous version => s4 | 2 | The change is the strongest lead.
- Ask platform-admin to undo whatever they did without looking => s3 | 1 | It may restore access, but you learn nothing, and they may have had a good reason.

### s3
text: Time passes with no progress. What is the most informative thing you can do now?
- Look at the audit log for the denied call and the latest changes => s2 | 2 | The log shows the caller, action and recent policy changes.
- Create a new bucket and copy the data manually => end-fail | 0 | It avoids the question and creates data copies without control.

### s4
text: The new policy has an explicit deny for any request that does not come through one specific VPC endpoint. The export job runs from another network. How do you deal with it?
- Add the job's network or endpoint to the allowed conditions, test, and record the reason for the rule => s5 | 2 | You keep the intended protection and allow the legitimate path.
- Remove the deny statement completely => s5 | 1 | It restores access fast but removes a security control that someone added on purpose.

### s5
text: The job succeeds on retry. How do you stop a policy change from breaking jobs silently in future?
- Review bucket policy changes with a policy simulation step and an announcement to dependent teams => s6 | 2 | A simulation shows who would lose access before the change.
- Ask admins to be careful => s6 | 0 | A process is more reliable than a request.

### s6
text: The job is working again and the cause is understood. Now you want to hear about a change like this before the next job fails. What detection do you add?
- An alert on bucket policy changes and on a rise in AccessDenied for production roles => end-win | 2 | You learn about the change and about the effect quickly.
- None, because this was rare => end-ok | 1 | Rare events are the ones you do not practise for.

### end-win
end: win
text: The exports run again. The deny rule stays, with the correct exceptions, and changes now go through simulation and alerts.
takeaway: AccessDenied names the caller, action and resource. Check who the caller is, then check what changed in the audit log. Do not widen permissions to hide a cause.

### end-ok
end: ok
text: Service is restored but a similar change could surprise you again.
takeaway: Alert on policy changes and on denials.

### end-fail
end: fail
text: Broad permissions or manual copies left a security problem and an unsolved cause.
takeaway: Least privilege and an audit trail are the point of access control. Use them to investigate.
