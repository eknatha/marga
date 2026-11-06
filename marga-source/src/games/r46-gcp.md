## The bucket that anyone could read
module: gcp
level: Intermediate
minutes: 7
lesson: gcp/security-cost-and-debugging-on-google-cloud
summary: Customer exports sit in a Cloud Storage bucket that is readable by the internet. Contain it, assess the damage and prevent a repeat.
intro: A security researcher emails you at 09:30 a link to a file in your acme-exports bucket. It opened without any login. The bucket holds customer exports and has been shared for several weeks.

### s1
text: You confirm the file opens without credentials. What do you do first?
- Remove public access from the bucket and enable public access prevention, keeping the logs and a record of what was exposed => s2 | 2 | Stop the exposure first, and preserve evidence. Example: gcloud storage buckets remove-iam-policy-binding gs://acme-exports --member=allUsers --role=roles/storage.objectViewer closes the access and the audit log is exported before any cleanup.
- Delete the bucket so nothing remains exposed => s3 | 0 | Deleting destroys the evidence and the data your customers need. Example: After the delete there is no object list to show which files were readable, and a restore from backup is needed.
- Ask the team who made it public and wait for an answer => s3 | 0 | Time matters, and finding out who can follow containment. Example: Waiting two hours for replies leaves the files readable and the number of external reads rising.

### s2
text: Access is closed. How do you find out whether anyone else downloaded the files?
- Review the data access audit logs and the bucket's request logs for reads by unknown principals => s4 | 2 | Logs tell you what actually happened. Example: A log query for storage.objects.get from principals other than your service accounts shows 14201 reads from external addresses, 12 of them from one unknown range.
- Assume nobody did because nobody complained => end-fail | 0 | Silence is not evidence. Example: The unknown range later appears in a breach report, and the missing notification becomes a compliance problem.
- Check billing for egress spikes only => s3 | 0 | Egress alone shows volume but not who read what. Example: Billing shows a small rise in egress but cannot list which objects were taken.

### s3
text: You lost time without learning more. What is the best reset?
- Close the exposure if not already done, then pull the audit logs for the bucket => s2 | 2 | Containment and evidence are the two urgent jobs. Example: Both the policy change and the log export finish in ten minutes.
- Escalate only by email and continue other work => end-fail | 0 | An exposed bucket needs an incident response now. Example: The exposure lasts another day because the email sat unread.

### s4
text: The logs show external reads. What is the right next step?
- Follow the incident process: notify security and legal, assess the data, and tell affected customers as the law and contracts require => s5 | 2 | Customer data exposure is a formal incident. Example: Legal confirms a 72 hour notification duty, and the list of exported customers is pulled from the object names.
- Quietly rotate the file names and hope for the best => end-fail | 0 | Hiding the exposure does not remove it and may break the law. Example: A regulator later finds the delay and fines the company.

### s5
text: Containment and notification are under way. Which lasting changes close the gap?
- Enforce an organization policy for public access prevention, use signed URLs for sharing, and alert on any IAM change that grants allUsers => end-win | 2 | Make the safe path the default and detect risky changes. Example: The organization policy storage.publicAccessPrevention blocks the setting everywhere, and a log-based alert fires within a minute of any allUsers binding.
- Rely on a reminder email telling engineers not to make buckets public => end-fail | 0 | Reminders do not stop mistakes. Example: Two months later another bucket is made public for a quick demo.
- Move the files to another bucket and keep the same sharing habit => end-ok | 1 | The old exposure ends but the habit remains. Example: The new bucket is shared with allAuthenticatedUsers, which any Google account can use.

### end-win
end: win
text: The exposure is closed, the logs are reviewed, customers are told as required, and policy prevents a repeat.
takeaway: Contain first, keep evidence, follow the incident process and make the safe setting the default.

### end-ok
end: ok
text: The old exposure ends, but the habit that caused it remains.
takeaway: Fix the root cause with policy and detection, not only the single bucket.

### end-fail
end: fail
text: The data stays exposed or the evidence is lost.
takeaway: Never delete evidence or wait; contain the exposure and investigate.
