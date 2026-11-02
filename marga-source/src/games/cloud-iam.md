## The cloud key in the public repository
module: cloud-iam
level: Intermediate
minutes: 7
lesson: cloud-iam/debugging-access-denied-and-cloud-security-incidents
summary: A scanner finds a cloud key in a public repository. Contain it, find out what it did, and fix the design.
intro: At 09:40 a scanner reports a live cloud access key committed to a public repository three days ago. The key belongs to a deploy user with broad permissions.

### s1
text: The key is public and might be in use. What is your first move?
- Deactivate the key now and keep it for evidence, then review its activity => s2 | 2 | Containment stops damage while keeping the trail. Example: The key is set to Inactive in one command and the audit search starts.
- Delete the commit and hope => s2 | 1 | Copies of the repository already exist. Example: Forks and scrapers keep the key available.
- Wait to see if anything happens => s2 | 0 | Delay lets an attacker act. Example: Servers start in unused regions overnight.

### s2
text: Audit logs show calls from an unknown address creating servers and a new access key. What do you do?
- Terminate the servers, delete the attacker's key and user, and check policies and data copies => s3 | 2 | You remove attacker-created access and resources. Example: Two unknown users and six servers are removed.
- Only delete the servers => s3 | 1 | The attacker's key would still work. Example: Servers return an hour later.
- Reset the office Wi-Fi => s3 | 0 | Unrelated. Example: The calls continue from the internet.

### s3
text: The incident is under control. What lasting fix do you choose?
- Replace the key with a role, add secret scanning and guardrails that deny unused regions => end-win | 2 | You remove the stored credential and limit the blast radius. Example: The pipeline assumes a role for 15 minutes and unused regions are denied.
- Create a new long-lived key and tell people to be careful => end-ok | 1 | The same leak can happen again. Example: Six months later the new key appears in a log.
- Give the deploy user fewer words in its name => end-fail | 0 | Cosmetic. Example: Nothing changes.

### end-win
end: win
text: The credential is gone, the attacker's access is removed, and roles with guardrails replace stored keys.
takeaway: Contain first, then assess, remove, replace with roles and add guardrails.

### end-ok
end: ok
text: The incident is contained, but a stored key could leak again.
takeaway: Containment worked; remove stored credentials to prevent a repeat.

### end-fail
end: fail
text: The attacker keeps access and the bill keeps growing.
takeaway: Deleting evidence or waiting makes a leak worse.


## The wildcard that opened the bucket
module: cloud-iam
level: Intermediate
minutes: 7
lesson: cloud-iam/aws-iam-policies-roles-and-assume-role
summary: A build role was given s3:* on everything to silence an error. Check what it can really do and narrow it.
intro: A developer fixed a failing upload by granting a build role s3:* on all buckets. A reviewer asks what that role can do now.

### s1
text: How do you find out what the role can really do?
- Run the policy simulator and read the attached policies => s2 | 2 | You test the real decision instead of guessing. Example: The simulator shows s3:DeleteObject allowed on a customer bucket.
- Ask the developer to promise it is fine => s2 | 1 | Promises are not evidence. Example: The wildcard stays in place.
- Check the colour of the console => s2 | 0 | Unrelated. Example: No information gained.

### s2
text: The role can delete customer exports. What is the right policy?
- Allow only PutObject on the one bucket prefix the build needs => s3 | 2 | Narrow action and narrow resource. Example: The role can write reports and nothing else.
- Keep s3:* but add a comment => s3 | 1 | A comment does not restrict anything. Example: The role keeps full access.
- Make the role the account owner => s3 | 0 | Far broader. Example: Anything can now be changed.

### s3
text: How do you stop the wildcard from coming back?
- Policy checks in code review and an organisation guardrail denying destructive actions on data buckets => end-win | 2 | Prevent and cap. Example: A pull request with Action star fails the check.
- Trust everyone to remember => end-ok | 1 | Memory fails. Example: The next urgent fix repeats the pattern.
- Disable the simulator => end-fail | 0 | Removes visibility. Example: Reviewers lose evidence.

### end-win
end: win
text: The role is narrow, reviewed and capped by guardrails, so a future wildcard cannot delete data.
takeaway: Test with the simulator, grant the exact action and resource, and add guardrails.

### end-ok
end: ok
text: The wildcard is gone, but nothing prevents it returning.
takeaway: Narrow the policy and add a preventive check.

### end-fail
end: fail
text: The role can still delete customer data.
takeaway: A wildcard turns a build role into an administrator.

