## The token in the public repository
module: vault
level: Intermediate
minutes: 7
lesson: vault/incident-response-rotating-and-revoking-secrets
summary: A Vault token appears in a public commit. Contain it, find out what it touched, and rotate what was exposed.
intro: A scanner alerts you that a Vault token was pushed to a public repository forty minutes ago. You do not know who owns it, what it can reach, or whether it has been used.
### s1
text: The scanner alert is real and the token may still be valid. What is your first action?
- Look up the token by its accessor from the audit log and revoke it => s2 | 2 | Revoking cuts off access quickly, and the accessor is a safe handle. Example: vault token revoke -accessor 7c1a3d6e removes the token and its child tokens.
- Seal Vault to be safe => end-fail | 0 | Sealing stops every application and is a last resort. Example: All pipelines fail at once and unsealing waits for key holders.
- Delete the commit and hope nobody saw it => end-fail | 0 | The token is still valid and may already be copied. Example: A forked copy of the repository still holds the token.
### s2
text: The token is revoked. What else must you revoke?
- Leases that the token created, for example dynamic database credentials, by prefix if needed => s3 | 2 | Revoking a token also revokes its leases, and a prefix sweep catches the rest. Example: vault lease revoke -prefix database/creds/orders-ro drops every active temporary user.
- Nothing, the token is gone => s3 | 0 | Credentials created earlier may still work until their lease ends. Example: A database user created ten minutes ago can still log in.
### s3
text: How do you find out what the token accessed?
- Search the audit log for the accessor and list the paths and client addresses => s4 | 2 | The audit log records every request, with secret values hashed. Example: grep for the accessor shows one read of secret/data/test/app from an unknown address.
- Ask the developer what they think it read => end-fail | 0 | Memory is not evidence. Example: The developer says nothing, but the log shows three reads.
### s4
text: The token read two static secrets. What now?
- Treat both as exposed: replace them at the source, update KV, and restart the consumers => s5 | 2 | A read secret must be considered copied. Example: The vendor API key is regenerated in the vendor dashboard and written to KV as a new version.
- Leave them, since the token was revoked quickly => end-fail | 0 | The attacker may already hold the values. Example: The old API key is used from a foreign IP the next day.
### s5
text: Service is stable. How do you reduce the chance of a repeat?
- Shorten token TTLs, narrow the policy, add secret scanning to repositories, and prefer dynamic secrets => end-win | 2 | It reduces both the chance and the damage of a leak. Example: CI tokens now last 15 minutes and a pre-commit scanner blocks pushes with tokens.
- Write a reminder in the wiki not to commit tokens => end-ok | 1 | Awareness helps little without controls. Example: Two months later another token is pushed.
- Rotate Vault's root key and carry on => end-fail | 0 | It does not address how the token leaked. Example: The same pattern of leaks continues.
### end-win
end: win
text: The token was revoked, exposed secrets were replaced, and controls reduce the next leak.
takeaway: Contain, read the audit log, rotate what was read, then fix the cause.
### end-ok
end: ok
text: The immediate problem is solved but little protects against a repeat.
takeaway: Process change needs controls, not reminders.
### end-fail
end: fail
text: Access continued or exposed secrets were left in place.
takeaway: Never leave a leaked credential active, and assume readable secrets are exposed.
