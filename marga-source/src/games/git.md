## The push that overwrote the release fix
module: git
level: Intermediate
minutes: 7
lesson: git/remotes-fetch-pull-and-push
summary: A rejected push tempts you to force it. Decide how to integrate, protect shared branches and recover lost commits.
intro: It is Friday evening and you must ship a one-line change to the release branch. Your push is rejected as non-fast-forward. A colleague pushed to the same branch an hour ago, and the release goes out in thirty minutes.

### s1
text: Git says the push was rejected because the remote branch has commits you do not have. What do you do?
- Fetch, look at the new commits, rebase or merge them into your branch, run the tests and push => s2 | 2 | You keep the colleague's work and test the combination. Example: git fetch origin, then git log HEAD..origin/release/3.2 shows a security fix that your change must sit on top of.
- Push with --force so it goes through => s3 | 0 | A forced push replaces the remote branch with yours and drops commits you never saw. Example: The colleague's security fix disappears from release/3.2 and the release ships without it.
- Delete the remote branch and push yours again => s3 | 0 | This removes everyone else's work from the shared branch. Example: Other open pull requests target a branch that no longer exists and must be recreated.

### s2
text: After rebasing you see two conflicting lines in deploy.sh. What next?
- Read both sides, ask the author if unclear, edit the file to the correct result, add it and continue the rebase => s4 | 2 | You resolve with understanding instead of guessing. Example: One side renamed a flag to --region and the other still uses --region-id, so the final file uses --region in both places.
- Keep your side of every conflict to save time => s4 | 0 | Keeping only your side discards the other change. Example: The renamed flag is lost and deploy.sh fails in staging with an unknown option error.
- Commit the file with the markers and fix it after the release => s4 | 0 | Markers in a script break it immediately. Example: The shell reports a syntax error at the line with the seven angle brackets.

### s3
text: The release branch now lacks the colleague's fix and they notice it a few minutes later. What do you do?
- Tell the team, find the lost commit hash from their clone or the server reflog, and restore it onto the branch => s4 | 2 | Honesty and the reflog let you recover committed work. Example: git branch rescue 9ad41e0 from the colleague's clone, then cherry-pick it onto release/3.2.
- Say nothing and hope the fix was not needed => end-fail | 0 | A silent loss of a security fix is far worse than a quick admission. Example: The vulnerable code ships and is found by a scanner a week later.
- Rewrite the colleague's commit from memory => s4 | 1 | It might work but loses the original authorship and details. Example: A small edit differs from the reviewed fix and the tests fail.

### s4
text: The release is out. How do you stop this from happening again?
- Protect release and main branches (no force push, required review and checks) and teach fetch-then-integrate => end-win | 2 | Rules stop honest mistakes. Example: The platform rejects any force push to release/* and shows the error to the engineer immediately.
- Ask people to be more careful => end-ok | 1 | Good intentions are not a control. Example: Two months later another rushed forced update drops a commit.
- Disable pull requests so there are fewer steps => end-fail | 0 | Fewer controls means more risk. Example: Direct pushes go to main without review and a broken change is deployed.

### end-win
end: win
text: The release shipped with both changes, the branch is protected from force pushes, and the team uses fetch, integrate, test and push as the normal routine.
takeaway: A rejected push is information. Integrate the remote changes instead of overwriting them, and enforce it with branch protection.

### end-ok
end: ok
text: The release shipped and the lost commit was restored, but the process still depends on people being careful.
takeaway: Protect shared branches with settings, not with reminders.

### end-fail
end: fail
text: A needed fix was lost or hidden, and the release shipped without it.
takeaway: Never overwrite shared history, and report mistakes at once so they can be repaired.

## The key in the repository
module: git
level: Advanced
minutes: 7
lesson: git/hooks-signing-and-secrets-in-history
summary: A cloud access key has been committed. Decide the order: revoke, investigate, clean history and prevent a repeat.
intro: A scanner alerts you that a cloud access key appears in a configuration file committed five days ago to a repository that many people have cloned. A colleague suggests deleting the file and moving on.

### s1
text: The alert is real and the key is valid. What is the very first action you take in the next five minutes?
- Revoke or deactivate the access key and start a new one for the service => s2 | 2 | Treat the key as already copied, so make it useless first. Example: aws iam update-access-key --status Inactive stops any use of the leaked key within seconds.
- Delete the file in a new commit and push => s3 | 0 | The key remains in older commits and every clone. Example: git log -p still shows the line with the key, and so does every teammate's clone.
- Rewrite history before doing anything else => s3 | 1 | Cleaning history is useful but the key still works until it is revoked. Example: While you rewrite the repository for an hour, the key remains valid and active.

### s2
text: The key is now inactive. What do you check next?
- The audit log for activity with that key since the commit, including new users, keys and compute => s4 | 2 | You find out whether the exposure was used and what the attacker changed. Example: CloudTrail shows RunInstances calls from an unknown address on the second day after the commit.
- Nothing, the key is dead so the problem is over => s4 | 0 | An attacker may have created access that survives revocation. Example: A new access key was created on another user and is still active.
- The brand colours of the dashboard => s4 | 0 | This does not help the investigation. Example: Time is lost while unknown resources keep running.

### s3
text: A teammate runs the scanner on the old commit and shows that the key still works. What now?
- Revoke it now and continue with the audit log review => s2 | 2 | Late is better than never, and the key was live the whole time. Example: The deactivated key returns an authentication error on the next API call.
- Argue that the key is probably unused => end-fail | 0 | Public or widely cloned keys are tried by automated scanners within minutes. Example: The account shows crypto-mining instances started at 02:00.

### s4
text: You found no misuse beyond the scanner alerts. Do you still rewrite the history?
- Yes, with git filter-repo, force-push with lease, and ask everyone to re-clone or reset their copies => s5 | 2 | It removes the secret from the shared record and from new clones. Example: git filter-repo --path config/prod.env --invert-paths, then a short message in the team channel with the reset steps.
- No, never touch history under any circumstances => s5 | 1 | The key is revoked so the risk is small, but the old value still sits in history and may confuse scanners. Example: Every future scan keeps reporting the same finding in the old commit.
- Yes, but force-push without telling anyone => s5 | 0 | Surprise rewrites break colleagues' branches. Example: Pull requests show hundreds of unrelated commits after the rewrite.

### s5
text: The incident is closed. Which prevention is the strongest for the long term?
- Secret manager and short-lived credentials, plus push protection and pipeline scanning, with a local pre-commit check as a convenience => end-win | 2 | No static key to leak, and enforcement where it cannot be skipped. Example: The CI job assumes a role for 15 minutes and the repository contains no key at all.
- A reminder email to all developers => end-ok | 1 | Awareness helps but leaves the same hole open. Example: A new joiner commits a token in the next quarter.
- Only a local pre-commit hook => end-ok | 1 | Hooks can be skipped with --no-verify or not installed. Example: A contractor with a fresh laptop never installs the hook.

### end-win
end: win
text: The key was revoked within minutes, the audit showed no damage, history was cleaned with notice, and static keys were replaced with short-lived credentials and server-side scanning.
takeaway: Revoke first, investigate, clean up, then prevent. Remove the secret from the system, not just from the file.

### end-ok
end: ok
text: The incident was contained, but the controls that prevent a repeat are still thin.
takeaway: Prevention needs enforcement on the server and in the pipeline.

### end-fail
end: fail
text: The key stayed active or misuse was ignored, and the account was abused.
takeaway: Treat committed secrets as compromised from the moment they are pushed.
