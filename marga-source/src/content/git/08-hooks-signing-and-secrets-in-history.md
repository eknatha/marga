---
title: Hooks, signed commits and secrets in history
minutes: 14
summary: Catch mistakes with hooks, prove who made a commit with signing, and respond correctly when a secret has been committed.
---

A developer commits a cloud access key by accident. Deleting the file in the next commit does not help, because Git keeps the old version in history and anyone with a clone has it. This lesson covers prevention (hooks and scanning), proof of authorship (signing) and the correct, ordered response when prevention fails. The order matters: revoke first, clean later.

## What you will learn

- Client-side hooks and the pre-commit approach
- Server-side protection and secret scanning
- Signed commits and tags
- Responding to a leaked secret: revoke, rewrite, notify

## Hooks

Hooks are scripts that Git runs at certain moments. They live in `.git/hooks`, which is not shared by clone, so teams manage them with a tool or a shared directory.

```bash
# .git/hooks/pre-commit  (must be executable)
#!/bin/sh
if git diff --cached --name-only | grep -E "\.env$|id_rsa$"; then
  echo "Refusing to commit a secret file"; exit 1
fi
```

Common hooks: `pre-commit` (lint, format, scan), `commit-msg` (check the message format) and `pre-push` (run fast tests). The `pre-commit` framework lets you list hooks in a `.pre-commit-config.yaml` file that everyone installs with one command. Hooks can be skipped with `--no-verify`, so they help honest people, and the real enforcement belongs on the server and in the pipeline.

## Server-side protection

Run the same checks in the pipeline on every pull request, and turn on **push protection** or secret scanning on the hosting platform so that known token formats are blocked or reported. Add a scanner such as a secrets-detection tool to the pipeline, scan the full history periodically, and treat any finding as an incident. Keep real secrets in a secret manager and use short-lived credentials, so a leak is less damaging.

## Signed commits

Anyone can set `user.name` to anything, so the author line proves nothing. A signature proves the commit came from the holder of a key. Git can sign with GPG or, more simply, with an SSH key:

```bash
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
git log --show-signature -1
```

The hosting platform shows a "verified" badge when it knows your public key, and a branch rule can require signed commits. Signing matters most for release tags and for repositories that deploy automatically.

## A secret was committed: the order of actions

1. **Revoke and rotate the secret immediately.** Assume it is already copied. Rewriting history without revoking leaves a working credential in the wild.
2. Check logs for use of the secret during the exposure.
3. Remove it from history if needed, using a rewriting tool such as `git filter-repo`:

```bash
git filter-repo --path config/prod.env --invert-paths
git push --force-with-lease --all
```

4. Ask everyone to re-clone or reset, because old clones and forks still contain it. Ask the hosting provider to purge cached views of the old commits.
5. Add a prevention (hook, push protection, ignore rule) and write a short review of how it happened.

Cleaning history is secondary; the credential must be dead before you start.

```predict
Q: You delete a committed password file and push. Is the password safe?
???
No. It remains in history and in every clone. You must rotate the password first, then optionally rewrite history.
> Deleting in a later commit does not erase the earlier version.
```

## Incident: The key in the config file

> **Incident:** A scanner raised an alert on a repository that had been public for three days.

```console
$ git log --all --oneline -S"AKIA" -- config/
5b2c9de Add backup settings
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAEXAMPLE --max-results 3
RunInstances   2026-01-04T02:11:09Z  region ap-south-1
```

An access key was in a settings file, and someone had used it to start compute instances. The team revoked the key within minutes, terminated the instances and then rewrote the history. They installed push protection, added a pre-commit scan, moved secrets to a secret manager and made the CI role assumable with short-lived credentials so no static key exists to leak.

## Common mistakes

- Rotating nothing and only deleting the file
- Relying on a local hook that can be skipped
- Rewriting history without telling the team
- Using shared long-lived keys in repositories

```quiz
Q: What is the first step after a secret is committed?
+ Revoke and rotate the secret
- Delete the file in a new commit :: History still has it.
- Wait for review :: Delay increases risk.
- Rename the branch :: Does nothing.
> Assume the secret is already copied.

Q: Why are local hooks not enough?
+ They can be skipped or not installed, so enforcement belongs on the server and in the pipeline
- They are too slow :: Speed is not the point.
- They cannot read files :: They can.
- They are not part of Git :: They are.
> Defence in depth.

Q: What does a signed commit prove?
+ That the commit was made by the holder of the signing key
- That the code is correct :: Signatures do not test code.
- That the commit is old :: Not related.
- That the repository is private :: Not related.
> It authenticates the author, not the quality.

Q: Which tool can rewrite history to remove a file everywhere?
+ git filter-repo
- git add :: It stages files.
- git status :: It reports state.
- git fetch :: It downloads.
> Then force-push and have everyone re-clone.
```

```cards
Pre-commit hook :: script that can block a commit
Enforce for real :: pipeline checks and push protection
Sign commits :: gpg.format ssh, commit.gpgsign true
Secret leaked :: revoke first
Remove from history :: git filter-repo
Find when text was added :: git log -S"text"
```
