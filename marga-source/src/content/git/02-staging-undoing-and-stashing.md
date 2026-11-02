---
title: Undoing changes safely: restore, amend, revert, reset and stash
minutes: 13
summary: Pick the right undo for the situation: discard edits, unstage, fix the last commit, reverse a shared commit, or park work with stash.
---

Everyone makes mistakes in Git: a wrong file staged, a typo in the last commit message, a change that should not have been committed at all. The fear of making them is what keeps beginners away from the tool. Git has a safe undo for almost every case, but they are different commands for different situations, and the dangerous ones are the ones that rewrite history others may already have.

## What you will learn

- Discard working tree edits and unstage files with git restore
- Fix the most recent commit with git commit --amend
- Undo a commit that others already have with git revert
- Understand soft, mixed and hard reset, and park work with git stash

## Undo before you commit

Two modern commands cover the common cases:

```bash
git restore backup.sh              # throw away edits in the working tree (cannot be undone)
git restore --staged backup.sh     # unstage, but keep the edits
git restore --source=HEAD~2 backup.sh   # bring back the file as it was two commits ago
```

The first one is destructive: edits that were never committed are gone, because Git never saw them as a snapshot. Read `git status` first; it prints the correct command as a hint. Older tutorials use `git checkout -- FILE` and `git reset HEAD FILE` for the same jobs.

## Fix the last commit

If you forgot a file or made a typo in the message and have **not pushed**, amend:

```bash
git add forgotten.sh
git commit --amend           # opens the editor to change the message too
git commit --amend --no-edit # keep the message, add the staged changes
```

Amend does not edit the old commit. It creates a new commit with a new hash and moves the branch to it, so any copy that someone else already fetched no longer matches. That is why rewriting history is fine for local work and a problem for shared work.

## Undo something that is already shared

When a commit is already on a shared branch, do not rewrite history. Add a new commit that reverses it:

```bash
git revert 3f9c2ab           # creates a new commit with the opposite change
git revert -m 1 7d1e0aa      # to reverse a merge commit, choose the mainline parent
```

The history stays honest ("this was changed, then changed back") and everyone can pull the fix normally. Revert is the right tool for production rollbacks of code, and the revert commit should say why.

## Reset: moving the branch

`git reset` moves the current branch pointer to another commit. The mode decides what happens to your files:

| Mode | Branch moves | Staging area | Working tree |
|------|--------------|--------------|--------------|
| `--soft` | yes | kept | kept |
| `--mixed` (default) | yes | reset | kept |
| `--hard` | yes | reset | **overwritten** |

```bash
git reset --soft HEAD~1     # undo the last commit, keep everything staged
git reset --hard origin/main # make my branch exactly match the remote (local work is lost)
```

Use `--hard` only when you are sure there is nothing uncommitted you want. Even after a hard reset, committed work is usually recoverable through the reflog (see the lesson on debugging Git).

## Park work with stash

You are in the middle of a change and need to switch tasks:

```bash
git stash push -m "half-done retry logic"
git switch hotfix/disk-alert
# ... fix, commit, switch back ...
git stash list
git stash pop        # reapply and drop the newest stash
```

By default stash saves tracked changes; add `-u` to include untracked files. A stash is local and easy to forget, so treat it as a short-term parking space and commit work in progress on a branch if it will sit for days.

```predict
Q: You pushed a commit that breaks the build and teammates have pulled it. Do you use reset --hard or revert?
???
Revert. It adds a new commit that reverses the change, so nobody has to repair a rewritten history.
> Never rewrite commits other people already have.
```

## Incident: The hard reset that erased a day of work

> **Incident:** An engineer tried to "clean up" before a meeting and ran a hard reset on the wrong branch.

```console
$ git status -s
 M deploy/values.yaml
 M deploy/ingress.yaml
$ git reset --hard origin/main
HEAD is now at 41ac9d2 Merge pull request 482
$ git status -s
$ git reflog | head -3
41ac9d2 HEAD@{0}: reset: moving to origin/main
7be3f10 HEAD@{1}: commit: Tune ingress timeouts
```

The two uncommitted files were lost for good, because Git had never saved them. The one commit was recovered from the reflog by checking out 7be3f10 on a new branch. The team added a habit of running git status and git stash before any reset, and shell aliases that print what a hard reset will discard.

## Common mistakes

- Using reset --hard casually
- Amending or force-pushing commits that others already pulled
- Reverting a merge without choosing the mainline parent
- Leaving work in a stash for weeks

```quiz
Q: Which command discards uncommitted edits to a file?
+ git restore FILE
- git revert FILE :: Revert works on commits.
- git commit --amend :: That changes the last commit.
- git stash list :: That only lists stashes.
> Restore on the working tree cannot be undone.

Q: Why use git revert for a shared commit?
+ It adds a new commit and does not rewrite history that others have
- It deletes the commit :: It keeps the old commit.
- It is faster than reset :: Speed is not the reason.
- It works without a repository :: It needs a repository.
> Shared history should only grow.

Q: What does git reset --soft HEAD~1 do?
+ Moves the branch back one commit and keeps the changes staged
- Deletes all local changes :: That is closer to --hard.
- Pushes to the remote :: Reset is local.
- Creates a tag :: Not related.
> Soft keeps staging and working tree.

Q: What does git stash push save by default?
+ Changes to tracked files
- Only untracked files :: Use -u for those.
- The whole remote :: Stash is local.
- Only commits :: Commits are already saved.
> Add -u to include untracked files.
```

```cards
Discard edits :: git restore FILE
Unstage :: git restore --staged FILE
Fix last commit (unpushed) :: git commit --amend
Undo a shared commit :: git revert HASH
Move branch, keep files :: git reset --soft/--mixed
Park work :: git stash push -m "note"
```
