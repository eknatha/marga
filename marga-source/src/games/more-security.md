## The access key in the chat
module: security
level: Beginner
minutes: 7
lesson: security/secrets-management
summary: A developer pasted a cloud access key in a team chat. Learn containment, rotation and prevention.
intro: A developer pastes a cloud access key into a public team channel to help a colleague. Someone notices an hour later. The key has admin rights.

### s1
text: The key was visible for an hour. What is the first action?
- Revoke or disable the key immediately, then investigate => s2 | 2 | Assume the key is compromised. Example: deactivate it in the cloud console in under a minute.
- Delete the chat message and carry on => s2 | 1 | Anyone who copied it still has the key. Example: a bot or person saved it.
- Wait to see if someone uses it => s2 | 0 | Waiting gives an attacker time. Example: a new admin user is created.

### s2
text: The key is disabled. What do you look at next?
- The audit log for everything that key did during and after the exposure => s3 | 2 | You must know whether it was used. Example: logs show API calls from an unknown address creating three servers.
- Nothing, the key is dead => end-fail | 0 | It may already have caused changes. Example: persistent access was added.
- Only the last five minutes => s3 | 1 | The exposure started an hour earlier. Example: early actions are missed.

### s3
text: Logs show someone created a new access user and launched servers. What is your plan?
- Remove the attacker's users and resources, rotate related credentials and check for other persistence => s4 | 2 | Clean up the access paths, not just the first key. Example: delete the new user, terminate the servers, and review roles and keys created recently.
- Delete only the servers => s4 | 1 | The new user can create more. Example: servers return tomorrow.
- Ignore it, servers cost little => s4 | 0 | They may mine crypto or hold data, and the access remains. Example: the bill is the smaller problem.

### s4
text: The developer is anxious. How do you treat them?
- Thank them for reporting early, explain the fix, and keep the review blameless => s5 | 2 | People report problems when it is safe to do so. Example: the developer helps write the prevention steps.
- Punish publicly => end-fail | 0 | Fear hides future incidents. Example: the next leak is concealed.
- Ignore the person => s5 | 1 | It loses a chance to learn. Example: the habit stays.

### s5
text: The credentials are safe again and the review is done. What prevents a repeat of this kind of leak?
- Use short-lived credentials and roles, secret scanning in chat and code, and least-privilege permissions => end-win | 2 | Reduce what a leak can do. Example: with temporary credentials that expire in an hour, the pasted key would have been useless by now.
- Tell everyone not to paste keys => end-ok | 1 | Reminders fade. Example: it happens again in three months.
- Use one shared key for all => end-fail | 0 | A shared key is worse. Example: one leak affects everything.

### end-win
end: win
text: The key was revoked in minutes, the attacker's access was removed, and short-lived credentials plus scanning make a repeat much less harmful.
takeaway: Assume a leaked secret is used. Revoke, check, clean up, and reduce the power of secrets.

### end-ok
end: ok
text: The incident ended with the leak fixed and the prevention partly done.
takeaway: Finish with automation, not reminders.

### end-fail
end: fail
text: The key stayed active or the attacker kept access.
takeaway: A secret that was visible is compromised.

## The login from another country at 3 a.m.
module: security
level: Intermediate
minutes: 7
lesson: security/detection-and-security-logging
summary: An alert shows an admin login from an unexpected location. Learn triage, containment and evidence.
intro: At 03:05 the security alert says an administrator account logged in from a country where you have no staff. The administrator is asleep.

### s1
text: An administrator account is active from an unexpected place in the middle of the night. What is your first step?
- Check the login details: time, address, device, method, and what happened after the login => s2 | 2 | Triage separates false alarms from attacks. Example: the log shows a login with no multi-factor prompt and a new device, followed by role changes.
- Assume it is a false alarm => s2 | 0 | An admin login is high value. Example: the attacker has hours.
- Wake the whole company => s2 | 1 | Escalation is needed in proportion to evidence. Example: you panic 200 people for a travelling employee.

### s2
text: The logs show the login happened without multi-factor and the session created a new access key. How do you contain it?
- Disable the account sessions and the new key, reset credentials, and force multi-factor => s3 | 2 | Cut off the access first. Example: revoke all active sessions and delete the new key within minutes.
- Only change the password => s3 | 1 | Existing sessions and keys stay valid. Example: the new key keeps working.
- Block the country at the firewall only => end-fail | 0 | Attackers use other locations. Example: the same attacker returns from another address.

### s3
text: Before cleaning up, what should you keep?
- Logs, snapshots and timestamps as evidence, stored safely => s4 | 2 | You may need them for analysis or legal steps. Example: export the audit log for the last seven days to protected storage.
- Nothing, clean everything => s4 | 0 | You destroy the story. Example: you cannot tell what data was accessed.
- Take screenshots only => s4 | 1 | Raw logs are better. Example: screenshots lack detail.

### s4
text: What do you check to find the extent of the access?
- What the account read or changed, other systems it can reach, and any new users, keys or rules => s5 | 2 | Scope guides the response. Example: it read the customer database backup and added a firewall rule.
- Only the login itself => s5 | 1 | The damage is after the login. Example: persistence is missed.
- Nothing more => end-fail | 0 | You do not know what was lost. Example: data was copied.

### s5
text: The incident is contained. How do you improve detection?
- Alert on admin logins without multi-factor, new devices and new access keys, and test the alert => end-win | 2 | Detection improves with each case. Example: an alert named "admin login from a new country" pages the security on-call.
- Wait for the next alert => end-ok | 1 | You reuse the same detection. Example: the next attack looks the same.
- Turn off alerts that wake people => end-fail | 0 | The alert worked. Example: silence would hide the next one.

### end-win
end: win
text: The compromise was found and contained within an hour, evidence was kept, and new alerts cover the gap.
takeaway: Triage, contain, preserve evidence, find the extent, then improve detection.

### end-ok
end: ok
text: The account was secured, though the scope of access was not fully checked.
takeaway: Always check what happened after the login.

### end-fail
end: fail
text: The attacker kept access or evidence was lost.
takeaway: Speed and care both matter in a security incident.

