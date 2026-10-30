## The playbook that changed every run
module: ansible
level: Beginner
minutes: 5
lesson: ansible/playbooks-tasks-and-idempotence
summary: A playbook reports changes on every run and restarts a service each time. Make it idempotent.
intro: Each night run shows "changed=12" even when nothing changed, and the web service restarts every time.

### s1
text: The play always reports changed. What do you check first?
- Which tasks use shell or command without a guard, since those always report changed => s2 | 2 | Raw commands do not know the desired state. Example: A shell task that runs "echo line >> file" appends on every run.
- Add ignore_errors to everything => end-fail | 0 | It hides failures and fixes nothing. Example: Real errors pass silently.
- Run it less often => s2 | 1 | It avoids the symptom, not the cause. Example: The drift still appears at the next run.

### s2
text: How do you replace a shell append with something safe?
- Use lineinfile or template, which compare the file to the desired state => s3 | 2 | Modules describe the end state and report change only when needed. Example: lineinfile adds the line once and reports ok afterwards.
- Keep shell and add a comment => s3 | 0 | A comment does not change behaviour. Example: The file still grows each run.
- Delete the file and recreate it each time => s3 | 1 | It works but causes needless change and restarts. Example: The service restarts nightly again.

### s3
text: The service restarts on every run. Why, and what is the fix?
- The restart task is unconditional; use a handler notified only when the config changes => s4 | 2 | Handlers run only after a real change. Example: notify: restart nginx on the template task, and nothing on an unchanged run.
- Remove the restart and never reload => s4 | 0 | Config changes would not take effect. Example: New settings sit unused until the next reboot.
- Restart in a cron job => s4 | 1 | It adds a second moving part. Example: Restarts happen at times unrelated to changes.

### s4
text: How do you prove the playbook is idempotent?
- Run it twice, expect changed=0 the second time, and use check mode with diff in CI => end-win | 2 | The second run is the test. Example: CI fails if the second run reports any change.
- Read it carefully => end-ok | 1 | Reading helps but misses subtle cases. Example: A reviewer misses a command task.
- Trust that modules are always idempotent => end-fail | 0 | Command and shell are not. That does not deal with the real cause. Example: Changed counts creep up again.

### end-win
end: win
text: Tasks use modules, handlers restart only on change and CI proves a second run changes nothing.
takeaway: Describe the end state, then run twice.

### end-ok
end: ok
text: Most tasks are fixed, but nothing proves they stay idempotent.
takeaway: Add a second-run check. Review the lesson and try the game again.

### end-fail
end: fail
text: Errors were hidden and drift continued. Read each choice explanation to see why.
takeaway: Fix the cause, not the output.

## The vault password in the repository
module: ansible
level: Intermediate
minutes: 6
lesson: ansible/vault-secrets-and-safe-practice
summary: A vault password file was committed next to the encrypted secrets. Contain it and fix the process.
intro: A reviewer notices .vault_pass in the repository next to group_vars/all/vault.yml.

### s1
text: The password is in the repo history. What do you do first?
- Treat the secrets as exposed: rotate them and the vault password, then clean the history => s2 | 2 | Removing a file does not remove it from history. Example: New database and API credentials are issued before the old ones are revoked.
- Delete the file in a new commit => s2 | 1 | It stays in older commits. Example: Anyone can check out the earlier version.
- Do nothing, the repo is private => end-fail | 0 | Private repos still leak to many people and tools. Example: A contractor clone keeps the password.

### s2
text: How do you re-encrypt safely? Choose the move you would make next.
- Rekey the vault with a new password and update every place that uses it => s3 | 2 | Rekeying changes the key for stored data. Example: ansible-vault rekey with the new password file kept outside the repo.
- Keep the old password => s3 | 0 | It is exposed. That does not deal with the real cause. Example: The old encrypted copies remain decryptable.
- Switch to plain text => s3 | 0 | It removes protection. That does not deal with the real cause. Example: Secrets are visible to every reader.

### s3
text: Where should the new vault password live?
- In a secrets manager or CI secret, supplied at run time, and .gitignore blocks the file => s4 | 2 | The key stays outside the code. Example: CI injects the password through an environment variable and a script reads it.
- In a shared chat message => s4 | 0 | Chat history is not a vault. That does not deal with the real cause. Example: The password lingers in search.
- In the README => s4 | 0 | It is public to every reader. Example: Anyone opening the repo can read it.

### s4
text: How do you catch this next time? Choose the move you would make next.
- Add secret scanning and a pre-commit hook, and review who can read the vault => end-win | 2 | Automated checks catch mistakes early. Example: The hook rejects commits containing .vault_pass or a private key.
- Ask people to be careful => end-ok | 1 | Reminders fail on a busy day. It helps only in part. Example: Another file slips in.
- Disable the scanner for speed => end-fail | 0 | It removes the safety net. That does not deal with the real cause. Example: The next leak is unnoticed.

### end-win
end: win
text: The secrets were rotated, the vault rekeyed, the password moved out of the repo and scanning added.
takeaway: Rotate first, then fix the process.

### end-ok
end: ok
text: The leak is contained, but prevention is thin.
takeaway: Add scanning and hooks. Review the lesson and try the game again.

### end-fail
end: fail
text: The exposed secrets stayed valid. Read each choice explanation to see why.
takeaway: Rotate anything that leaked. Review the lesson and try the game again.

