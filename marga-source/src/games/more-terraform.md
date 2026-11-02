## Two applies at the same time
module: terraform
level: Intermediate
minutes: 7
lesson: terraform/state
summary: Two engineers run apply on the same environment. Learn state locking, remote state and recovery.
intro: Two engineers run terraform apply for production within seconds of each other. One sees an error about a lock. The other sees resources created twice.

### s1
text: One run says "Error acquiring the state lock". What does it mean?
- Another operation holds the lock on the shared state; wait for it or find out who runs it => s2 | 2 | A lock stops two writers from corrupting state. Example: the message shows the lock ID, who and when, for example alex@laptop at 10:02.
- The state file is corrupt => s2 | 0 | A lock error is a safety feature. Example: the state itself is fine.
- Terraform is broken => s2 | 1 | It is working as designed. Example: the lock protects against exactly this case.

### s2
text: The other engineer's run crashed halfway. The lock remains. What do you do?
- Confirm no apply is running, then force-unlock using the lock ID and run plan again => s3 | 2 | Force-unlock is for stale locks only. Example: terraform force-unlock 8f2a-... after a call to the engineer confirms the process is gone.
- Delete the state file => end-fail | 0 | You would lose track of real resources. Example: Terraform tries to recreate servers that already exist.
- Force unlock and apply at once => s3 | 1 | You skip checking what the crashed run changed. Example: a half-applied change is repeated blindly.

### s3
text: Plan now shows a diff you did not expect: a load balancer will be created again. What does that suggest?
- The crashed run created it but state was not saved; import it or reconcile before applying => s4 | 2 | Reality and state differ. Example: terraform import aws_lb.main <arn> brings the existing resource into state.
- Apply and see => s4 | 0 | You might create a duplicate, with cost and name conflicts. Example: a second load balancer receives traffic.
- Destroy everything and start again => s4 | 1 | It causes an outage. Example: production disappears.

### s4
text: State lives on one engineer's laptop. How do you fix the root cause?
- Move state to a remote backend with locking and encryption, and restrict who can apply => s5 | 2 | Shared state with locks is how teams work. Example: an object storage bucket with versioning plus a lock table.
- Email the state file around => end-fail | 0 | State can contain secrets and goes stale. Example: two people edit different copies.
- Agree to take turns by chat => s5 | 1 | Turn-taking relies on discipline. Example: a message is missed at 02:00.

### s5
text: How do you reduce the chance of simultaneous applies?
- Run apply from the pipeline only, after plan review, one run at a time per environment => end-win | 2 | A single path for changes avoids races. Example: merge to main triggers a queue; production applies need one approval.
- Keep local applies for emergencies with no rule => end-ok | 1 | It reopens the door. Example: the next emergency has two people applying.
- Let everyone apply whenever => end-fail | 0 | This is how the incident happened. Example: two applies, two partial changes.

### end-win
end: win
text: State is remote and locked, applies run from one pipeline, and the duplicate resources were imported and cleaned up.
takeaway: State is shared truth. Protect it with a remote backend, locking and a single path for changes.

### end-ok
end: ok
text: The environment is consistent again, though the process still relies on people.
takeaway: Move the rules into the pipeline.

### end-fail
end: fail
text: State was lost or corrupted, and resources were duplicated or destroyed.
takeaway: Never delete or ignore state. It is how Terraform knows what exists.

## The change nobody planned
module: terraform
level: Advanced
minutes: 7
lesson: terraform/workflows-and-drift
summary: Plan shows changes nobody made in code. Learn drift, console edits and how to handle them.
intro: A routine plan for production shows 6 changes, but nobody has changed the code. One of them would remove a security group rule that opens a port.

### s1
text: The plan shows unexpected changes. What do you do first?
- Read the plan carefully and find out why each change appears => s2 | 2 | Unexpected changes mean the real world differs from code. Example: "~ ingress rule removed" suggests someone added it in the console.
- Apply to get back to green => s2 | 0 | Apply would remove a rule that someone may rely on. Example: a service that uses port 8443 stops working.
- Ignore the plan and skip this week => s2 | 1 | The drift stays and grows. Example: next month there are 20 changes.

### s2
text: Audit logs show a colleague opened port 8443 in the console during an incident. The rule is not in code. What now?
- Ask what it is for; if needed, add it to the code, otherwise remove it deliberately => s3 | 2 | Drift is either a missing code change or a mistake. Example: the rule serves a vendor health check, so you add it to Terraform with a comment.
- Delete it right now => end-fail | 0 | It might be needed for a live service. Example: the vendor monitor goes red.
- Leave it forever outside code => s3 | 1 | Unmanaged resources are surprises later. Example: nobody remembers why it exists.

### s3
text: Another change: a tag value differs on 40 resources because an automated tool adds a tag. Terraform wants to remove it every time. What is a good response?
- Use ignore_changes for that tag, or manage the tag in code, so the noise stops => s4 | 2 | Known external changes should be modelled. Example: lifecycle { ignore_changes = [tags["costcenter"]] }.
- Disable the tool => s4 | 1 | It may break reporting. Example: cost reports lose their tag.
- Accept noisy plans => s4 | 0 | Noise hides real changes. Example: the removed security rule is lost among 40 tag changes.

### s4
text: How do you detect drift before it surprises you?
- Run scheduled plans and alert on non-empty results => s5 | 2 | A regular plan is a drift detector. Example: a nightly plan job posts "3 changes detected" to the team channel.
- Ban the console => s5 | 1 | Rules without support get bypassed in emergencies. Example: someone uses it during an outage anyway.
- Check by hand once a year => end-fail | 0 | Too rare to be useful. Example: a year of drift is unmanageable.

### s5
text: Engineers still need the console in emergencies. What policy works?
- Allow it with logging, then reconcile into code within a day or two => end-win | 2 | Emergencies need speed and follow-up needs discipline. Example: a ticket is created automatically for each console change.
- Forbid it and punish => end-fail | 0 | People hide changes. Example: nobody tells you about the rule.
- Do not reconcile => end-ok | 1 | The code becomes a work of fiction. Example: plans stop being trusted.

### end-win
end: win
text: Drift is detected nightly, console edits are reconciled quickly, and plans are trusted again.
takeaway: Plan is a comparison of code with reality. When they differ, find out why before you apply.

### end-ok
end: ok
text: The immediate drift was handled, though the process for the next one is thin.
takeaway: Make detection and reconciliation routine.

### end-fail
end: fail
text: An apply removed a live rule, or drift grew until plans were ignored.
takeaway: Do not apply a plan you do not understand.

