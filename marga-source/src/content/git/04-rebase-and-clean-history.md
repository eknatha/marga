---
title: Rebase and a clean history
minutes: 13
summary: Use rebase to keep a linear history, tidy your own commits with interactive rebase, and know the rule for when not to rebase.
---

Merging is safe but the history of a busy project fills with merge commits and "fix typo" commits that make it hard to read. Rebase lets you replay your work on top of the latest main and tidy it before others review it. It is powerful and it is the command that has caused the most Git horror stories, because it rewrites history. The rules are simple and worth learning properly.

## What you will learn

- What rebase does and how it differs from merge
- Update a feature branch with git rebase main
- Tidy local commits with interactive rebase (squash, reword, fixup)
- The golden rule: never rebase commits that others have built on

## Rebase replays your commits

Suppose `main` moved on while you worked on `feature`. A merge ties the two lines with a merge commit. A **rebase** instead takes your commits, sets them aside, moves your branch to the tip of `main`, and replays your commits one by one on top. The result looks as if you had started your work from the latest `main`.

```bash
git switch feature/retry
git fetch origin
git rebase origin/main
```

The replayed commits are **new commits** with new hashes, though they have the same changes and messages. If a replayed commit conflicts, Git stops; resolve the files, `git add` them, and run `git rebase --continue`. `git rebase --abort` returns you to where you started.

## Interactive rebase

Before asking for a review, clean up your own work:

```bash
git rebase -i HEAD~4
```

Git opens a list of the last four commits:

```text
pick 1a2b3c4 Add retry loop
pick 5d6e7f8 Fix typo
pick 9a8b7c6 Add tests for retry
pick 0f1e2d3 Fix test name
```

Change the word at the start of each line: `reword` to edit a message, `squash` to merge into the previous commit and combine messages, `fixup` to merge and discard the message, `drop` to remove a commit, or reorder lines to reorder commits. Save and close, and Git rewrites the history. A small number of meaningful commits ("Add retry loop", "Add tests") is far easier to review than ten snapshots of your day.

The shortcut `git commit --fixup HASH` followed by `git rebase -i --autosquash` marks and moves fixes automatically.

## The golden rule

Never rebase commits that exist in a shared branch others have pulled. Rebase creates new commits, so a teammate's copy of the old ones no longer matches, and their next pull produces duplicates and confusing conflicts. It is safe to rebase your own, unpushed work or a branch only you use. If you rebased a branch you had already pushed, the push is rejected, and you need `git push --force-with-lease`, which refuses to overwrite commits you have not seen. Use it only on your own feature branches, never on `main`.

## Merge or rebase?

Both are valid, and teams choose a policy. Common choices: rebase your feature branch on `main` to keep it current, then merge with a pull request using **squash** (one commit per feature) or **merge commit** (keeps the branch history). Linear history makes `git bisect` and `git log` easier to read; merge commits preserve exactly what happened. Pick one policy per repository, write it in the contributing guide, and let the platform enforce it.

```predict
Q: You rebased a feature branch that a colleague also pulled, then force-pushed. What do they see on their next pull?
???
Duplicate commits or conflicts, because the history they have no longer matches the rewritten one.
> Rebase makes new commits. Only rebase work nobody else has based changes on.
```

## Incident: The force push that removed a colleague's commit

> **Incident:** Two engineers worked on the same branch and one rebased and force-pushed.

```console
$ git push --force origin feature/alerts
+ 4e2fa1b...d19c07a feature/alerts -> feature/alerts (forced update)
$ git log --oneline origin/feature/alerts -3
d19c07a Tune alert thresholds
$ # Priya's commit "Add runbook link" is no longer on the branch
```

The force push replaced the branch and dropped a commit that the colleague had pushed a few minutes earlier. The commit was recovered from the colleague's local clone and the reflog on the server. The team switched to git push --force-with-lease, which would have refused, and agreed that shared branches are never rebased.

## Common mistakes

- Rebasing a branch that others use
- Using git push --force instead of --force-with-lease
- Squashing everything into a single huge commit
- Rebasing in the middle of a conflict without understanding the state

```quiz
Q: What does git rebase main do on a feature branch?
+ Replays the branch commits on top of the latest main as new commits
- Deletes the feature branch :: Branch stays.
- Merges main with a merge commit :: That is merge.
- Pushes to main :: It is local.
> Rebase rewrites the commits.

Q: Which interactive rebase keyword combines a commit into the previous one and discards its message?
+ fixup
- pick :: Pick keeps the commit.
- reword :: Reword changes the message.
- drop :: Drop removes the commit entirely.
> Squash keeps messages, fixup discards them.

Q: When is it unsafe to rebase?
+ When others have already pulled and built on those commits
- When the branch is local only :: That is safe.
- When using interactive mode :: Interactive mode is fine.
- When there is a .gitignore :: Not related.
> Never rewrite shared history.

Q: Why prefer --force-with-lease to --force?
+ It refuses to overwrite remote commits you have not seen
- It is faster :: Speed is the same.
- It works without a remote :: It needs a remote.
- It creates a backup tag :: It does not.
> A small safeguard against losing others' work.
```

```cards
Update branch on latest main :: git rebase origin/main
Tidy last N commits :: git rebase -i HEAD~N
Abort a rebase :: git rebase --abort
Safer force push :: git push --force-with-lease
Rule :: do not rebase shared history
```
