## The state file in the wrong hands
module: terraform
level: Advanced
minutes: 6
lesson: terraform/secrets-and-sensitive-data
summary: A Terraform state file with secrets was readable by many people. Contain it and redesign access.
intro: An audit finds the state bucket readable by the whole engineering group. The state contains a database password.

### s1
text: The state holds a database password and many people can read it. First move?
- Restrict access to the state now and plan to rotate the password => s2 | 2 | Reduce exposure immediately, then deal with the secret. Example: The bucket policy is limited to the pipeline role and a small admin group.
- Delete the state file => end-fail | 0 | You lose the mapping to real infrastructure. Example: Terraform then wants to recreate everything.
- Do nothing, the password is marked sensitive => s2 | 1 | Sensitive hides output, not the value inside state. Example: The plain value is still in the file.

### s2
text: Who might have read it, and what do you check?
- Access logs on the bucket for reads of the state file => s3 | 2 | Logs show who read it and when. Example: Object access logs list reads by user over the last 90 days.
- Nothing to check => s3 | 0 | Assuming safety is wrong. That does not deal with the real cause. Example: An old account read it last month.
- Ask people if they looked => s3 | 1 | Useful but not reliable. It helps only in part. Example: People forget or do not know.

### s3
text: How do you handle the password itself? Choose the move you would make next.
- Rotate it, and have the database manage it or fetch it from a secrets manager => s4 | 2 | Rotation removes the exposed value and the new design avoids storing it. Example: The password is generated in a secrets manager and the application reads it at runtime.
- Keep the same password => s4 | 0 | It may already be copied. Example: Anyone who read the old state still has it.
- Move it to a variable file in the repository => s4 | 0 | Worse exposure. Example: The password is committed to version control.

### s4
text: What is the long-term design for state access?
- Encrypt state, enable versioning and locking, grant least privilege and avoid secrets in resources where possible => end-win | 2 | Layered controls limit damage. Example: A remote backend with KMS encryption and access limited to the pipeline.
- Rely on the sensitive flag => end-fail | 0 | It does not protect the state file. Example: The value is in the state in plain text.
- Keep state on laptops => end-ok | 1 | Local state is lost easily and hard to protect. Example: A stolen laptop exposes the state.

### end-win
end: win
text: Access is restricted, the password rotated and secrets kept out of state where possible, with logs showing nobody abused the exposure.
takeaway: Treat state as a secret and reduce what goes into it.

### end-ok
end: ok
text: Access is tighter, but the design still stores secrets in state.
takeaway: Keep secrets out of state. Review the lesson and try the game again.

### end-fail
end: fail
text: State remained exposed and the password unchanged.
takeaway: Restrict, check and rotate. Review the lesson and try the game again.

## The module upgrade that changed production
module: terraform
level: Intermediate
minutes: 6
lesson: terraform/modules
summary: A shared module was updated and plans for several environments changed unexpectedly. Control module upgrades.
intro: Someone updated the shared network module. The next plan in production shows security group rules being replaced.

### s1
text: Production plan shows changes nobody asked for. What do you do?
- Stop and read the plan to see which module change causes it => s2 | 2 | Understand before applying. Example: The plan shows the new module version replaces rules to add a description field.
- Apply and fix later => end-fail | 0 | You may remove access that services need. Example: Replaced rules briefly drop traffic.
- Ignore the plan output => s2 | 0 | Plans are there to be read. Example: A destroy hidden in the output is missed.

### s2
text: How were environments affected at once? Choose the move you would make next.
- The module source used a branch name, so all environments took the latest => s3 | 2 | Unpinned sources mean unplanned upgrades. Example: source = git::...//network?ref=main follows main.
- Terraform is random => s3 | 0 | It followed the configuration. Example: The source pointed to a moving target.
- The cloud changed => s3 | 1 | Unlikely. It helps only in part. Example: The cloud API did not change.

### s3
text: What is the safe fix? Choose the move you would make next.
- Pin the module to a version tag and upgrade each environment on purpose, starting with a test one => s4 | 2 | Controlled upgrades limit risk. Example: ref=v1.4.0 in production and ref=v1.5.0 in test first.
- Pin to main => s4 | 0 | Main is not a version. That does not deal with the real cause. Example: Still changes under you.
- Copy the module into each environment => s4 | 1 | It removes sharing and creates drift. Example: Fixes must now be copied by hand.

### s4
text: How do you protect critical resources from surprises?
- Use prevent_destroy where fitting, review plans and use policy checks on destroy and replace => end-win | 2 | Guardrails catch dangerous plans. Example: A policy check fails any plan that destroys a production database.
- Trust the author => end-ok | 1 | Mistakes happen. It helps only in part. Example: A small change has a large effect.
- Skip plan review for small modules => end-fail | 0 | Small changes can have big effects. Example: A rename replaces a resource.

### end-win
end: win
text: Modules are pinned, upgrades are staged and policy checks block dangerous plans.
takeaway: Pin versions and promote upgrades deliberately.

### end-ok
end: ok
text: The module is pinned, but plan review still depends on people.
takeaway: Add automated checks. Review the lesson and try the game again.

### end-fail
end: fail
text: An unplanned upgrade hit production. Read each choice explanation to see why.
takeaway: Never follow a moving branch. Review the lesson and try the game again.

