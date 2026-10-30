## The canary that looked fine
module: cicd
level: Advanced
minutes: 7
lesson: cicd/deployment-strategies
summary: A canary release passed because the wrong metric was watched. Decide what to measure and when to stop.
intro: A new version goes to five percent of users. CPU is normal and no errors are logged, yet support tickets about checkout begin to arrive.

### s1
text: The canary shows normal CPU and no errors. Do you promote it?
- Check user-facing signals first: checkout success, latency and business metrics => s2 | 2 | Healthy hosts can still deliver a broken experience. Example: Checkout completion on the canary is 91 percent against 97 percent on the stable version.
- Promote it, the metrics are green => end-fail | 0 | Green infrastructure metrics are not proof of a working product. Example: Everyone then gets the broken checkout.
- Wait another day with no extra checks => s2 | 1 | More time helps only if you are watching the right signal. Example: A day later the same unwatched metric is still bad.

### s2
text: Checkout is worse on the canary. What next?
- Stop the rollout, send traffic back to the stable version and investigate => s3 | 2 | Rolling back limits damage while you learn. Example: Setting the canary weight to 0 returns all users to the stable version in seconds.
- Increase traffic to gather more data => s3 | 0 | More users hit the fault. Example: Going to 25 percent multiplies affected customers fivefold.
- Debug on the canary while it serves users => s3 | 1 | It keeps customers affected during diagnosis. Example: Users keep failing while you read logs.

### s3
text: You find a cause: a payment call returns an unexpected field. How do you fix it?
- Fix with a test that covers the case, then run a new canary => s4 | 2 | A regression test and another cautious rollout avoid repeating the miss. Example: A contract test for the payment response fails on the old build and passes on the fix.
- Patch and release to everyone => s4 | 0 | Skipping the canary repeats the risk. Example: A second error reaches everyone.
- Skip the tests, the fix is small => s4 | 1 | Small fixes can fail too. Example: The patch fixes one field and breaks another.

### s4
text: How do you improve the canary checks themselves?
- Automate analysis of user-facing metrics with clear thresholds for promote and abort => end-win | 2 | Automatic judgement is consistent and fast. Example: The canary aborts if checkout success is more than 1 percent lower than stable over ten minutes.
- Keep watching dashboards by eye => end-ok | 1 | Humans miss slow trends. Example: A slow decline is unnoticed for an hour.
- Remove the canary step to save time => end-fail | 0 | You lose the safety net. That does not deal with the real cause. Example: The next bad release hits everyone.

### end-win
end: win
text: The canary is judged by user-facing metrics and aborted quickly, so only a few users saw the bug.
takeaway: Measure what users feel and automate promote or abort.

### end-ok
end: ok
text: The release is safe, but manual watching can miss the next slow decline.
takeaway: Automate the judgement. Review the lesson and try the game again.

### end-fail
end: fail
text: The wrong metric allowed a broken release to reach everyone.
takeaway: A green host is not a working product.

## The secret in the build log
module: cicd
level: Intermediate
minutes: 6
lesson: cicd/pipeline-security
summary: A pipeline printed a token into its log. Contain it, rotate it and stop it happening again.
intro: A developer turned on debug output in a deploy job. The log now shows an environment variable containing the deploy token, and the log is visible to all contributors.

### s1
text: You find a token in a build log. What is the first action?
- Revoke or rotate the token immediately => s2 | 2 | Anything visible in a log should be treated as exposed. Example: The provider console revokes the token in seconds, and a new one is issued.
- Delete the log and carry on => end-fail | 0 | The token may already be copied, and deletion does not make it safe. Example: Log archives and notifications already hold copies.
- Ask the team not to look => s2 | 0 | This does nothing to protect the token. Example: Anyone with access can still read it.

### s2
text: After rotation, what do you check? Choose the move you would make next.
- Audit logs for use of the old token and whether anything changed => s3 | 2 | You need to know whether it was abused. Example: The audit log shows no calls from unknown addresses between the log and the rotation.
- Nothing, the token is changed now => s3 | 1 | Rotation stops future use but does not tell you about past use. Example: A resource was created with it an hour earlier and nobody checks.
- Search only the pipeline => s3 | 0 | Abuse happens elsewhere. Example: The activity is in the cloud audit log.

### s3
text: Why did the token appear, and how do you fix the design?
- Debug output printed the environment. Mask secrets, avoid printing the environment and use short-lived credentials => s4 | 2 | Masking and short lifetimes limit what a log can leak. Example: The CI masks registered secrets, and the job uses an OIDC token valid for 10 minutes.
- Tell people not to enable debug mode => s4 | 1 | Reminders do not scale. Example: The next person turns it on while debugging.
- Store the token in the repository instead => s4 | 0 | This makes exposure worse. Example: A token in the repository is readable by everyone and kept in history.

### s4
text: What prevents the next leak? Choose the move you would make next.
- Scan logs and commits for secrets, restrict who can read logs and review pipeline changes => end-win | 2 | Several layers catch mistakes before they matter. Example: A secret scanner fails the job if a token pattern appears in output.
- Rely on careful developers => end-fail | 0 | People make mistakes under pressure. Example: The next debug session leaks again.
- Turn off all logging => end-ok | 1 | You lose the ability to debug failures. Example: A failing deploy now has no log to read.

### end-win
end: win
text: The token was rotated within minutes, use was audited, and short-lived credentials with masking mean a log leak is far less useful.
takeaway: Rotate first, audit, mask and use short-lived credentials.

### end-ok
end: ok
text: The leak is handled, but warnings alone will not stop the next one.
takeaway: Build technical guards. Review the lesson and try the game again.

### end-fail
end: fail
text: The token stayed valid and exposed. Read each choice explanation to see why.
takeaway: Treat any visible secret as stolen.

