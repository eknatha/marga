---
title: Debugging Git problems: reflog, bisect, blame and recovery
minutes: 14
summary: Recover lost commits with the reflog, find the commit that broke something with bisect and blame, and understand detached HEAD and other confusing states.
---

At some point Git will show you something frightening: "detached HEAD", a branch that vanished, a commit you cannot find, a build that broke between two releases. In nearly every case the data is still there. Git almost never deletes committed work immediately, and it also keeps a private journal of where your branches pointed. Knowing how to read that journal and how to search history turns panic into a routine investigation.

## What you will learn

- Find and recover lost commits with git reflog
- Locate the commit that introduced a bug with git bisect
- Answer who changed this and why with blame and log -S
- Understand detached HEAD, wrong-branch commits and unfinished operations

## Recover with the reflog

The **reflog** records every time `HEAD` or a branch moved on your machine: commits, resets, rebases, checkouts. It is local and expires after weeks, but it is the safety net for almost every "I lost my work" moment.

```bash
git reflog -15
# 41ac9d2 HEAD@{0}: reset: moving to origin/main
# 7be3f10 HEAD@{1}: commit: Tune ingress timeouts
git branch rescue 7be3f10      # give the lost commit a name again
git switch rescue
```

Any commit you can name by hash is safe once a branch points to it. This works for commits, not for uncommitted edits, which Git never saw. A deleted branch is also recoverable: find its last hash in the reflog and recreate it with `git branch NAME HASH`. For commits that are in no reflog at all, `git fsck --lost-found` lists unreachable objects.

## Find the guilty commit with bisect

You know version 1.3 worked and the current one does not, with 200 commits between. `git bisect` does a binary search and needs only about eight steps:

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.3.0         # this one worked
# Git checks out a commit in the middle. Test it, then say good or bad.
git bisect good
git bisect bad
# ... until it prints: 3f9c2ab is the first bad commit
git bisect reset
```

Better still, automate it: `git bisect run ./test.sh`, where the script exits 0 for good and non-zero for bad. A small reproducible test is the most valuable thing to write during any regression hunt.

## Who changed this, and why

```bash
git blame -L 40,60 deploy.sh        # who last changed each line
git log -S"max_retries" --oneline   # commits that added or removed this text
git log -G"retry.*=" -p -- deploy.sh
git log --follow -- scripts/backup.sh   # history across renames
git show 3f9c2ab                    # the full change and message
```

Blame shows the last commit to touch a line, which may only be a reformat. Use `git blame -w -C` to ignore whitespace and detect moved code, and follow the commit message and linked ticket to learn the reason. The aim is to understand why the code is the way it is before you change it, not to blame a person.

## Confusing states

**Detached HEAD**: you checked out a commit or tag, not a branch. Commits made here belong to no branch. If you want to keep them, run `git switch -c new-branch` right away. **Committed on the wrong branch**: create a branch at the current commit with `git branch feature`, then move the wrong branch back with `git reset --hard origin/main` (after making sure the new branch exists). **Unfinished operations**: `git status` tells you when you are in the middle of a merge, rebase or cherry-pick and which command continues or aborts it. **Untracked clutter**: `git clean -n` previews what `git clean -fd` would delete. Read `git status` first; Git usually tells you the next safe command.

```predict
Q: You ran a hard reset and lost two commits. What is the first command to try, and what will it show?
???
git reflog. It lists where HEAD pointed before, including the hashes of the lost commits that you can branch from.
> Committed work can nearly always be recovered.
```

## Incident: Which release broke the report?

> **Incident:** The monthly billing report began producing wrong totals, and nobody knew which of 214 commits since the last good release was responsible.

```console
$ git bisect start v2.8.0 v2.7.0
Bisecting: 107 revisions left to test after this (roughly 7 steps)
$ git bisect run ./check_totals.sh
running ./check_totals.sh
...
3d51f8a is the first bad commit
    Round currency in the aggregate query
```

A small script that compared the report with known totals was enough for git bisect run to find the commit in seven steps: a change that rounded values too early. The fix was a one-line change and the script became a regression test in the pipeline. Without bisect, the team would have read hundreds of diffs.

## Common mistakes

- Panicking and re-cloning instead of checking the reflog
- Committing in detached HEAD and losing the work
- Using blame to assign fault instead of to learn the reason
- Running git clean -fd without the -n preview

```quiz
Q: Where do you find hashes of commits you lost after a reset?
+ In git reflog
- In the .gitignore file :: It lists ignore patterns.
- In the remote URL :: Not related.
- In git remote -v :: Not related.
> The reflog journals HEAD movements.

Q: What does git bisect do?
+ Binary-searches history to find the first bad commit
- Squashes commits :: That is rebase.
- Deletes branches :: Not its job.
- Signs tags :: Not its job.
> About log2(N) tests.

Q: You commit in detached HEAD. How do you keep the work?
+ Create a branch there: git switch -c NAME
- Delete the repository :: No.
- Run git clean :: That deletes files.
- Wait for garbage collection :: That may lose it.
> Any commit with a branch pointing to it is safe.

Q: Which command finds commits that added or removed a given text?
+ git log -S"text"
- git status :: Shows current state.
- git remote :: Lists remotes.
- git tag :: Lists tags.
> Pickaxe search through history.
```

```cards
Journal of moves :: git reflog
Recover a lost commit :: git branch NAME HASH
Find the first bad commit :: git bisect start / good / bad / run
Who changed a line :: git blame -L a,b FILE
Search history for text :: git log -S"text"
Preview deletion :: git clean -n
```
