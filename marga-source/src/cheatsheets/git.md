---
title: Git
summary: Everyday commands for commits, branches, remotes, undoing mistakes, tags and recovery.
module: git
---

## Set up and first commits

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
git config --global pull.ff only          # safe pull default
git init                                  # new repository here
git clone URL                             # copy a repository
git status                                # what is changed, staged, untracked
git add FILE                              # stage a file
git add -p                                # stage pieces of files
git commit -m "Fix retry loop in backup.sh"
git commit --amend --no-edit              # add staged changes to the last commit (unpushed)
```

| Area | Meaning |
|------|---------|
| Working tree | The files you edit |
| Staging area (index) | What goes into the next commit |
| Repository | The saved history in `.git` |

> **Warning:** `git restore FILE` and `git reset --hard` throw away uncommitted edits for good. Run `git status` first, and stash if you are unsure.

## Look at history

```bash
git log --oneline --graph --decorate -15
git log -p -- FILE                        # changes to one file
git log -S"text"                          # commits that added or removed text
git log A..B                              # commits in B not in A
git show HASH                             # one commit in full
git diff                                  # working tree vs staging
git diff --staged                         # staging vs last commit
git diff main...feature                   # what the branch adds
git blame -L 40,60 FILE                   # who last changed each line
```

## Branches and merging

```bash
git branch                                # list branches
git switch -c feature/retry               # create and switch
git switch main
git merge feature/retry                   # merge into current branch
git merge --no-ff feature/retry           # always create a merge commit
git merge --abort                         # give up a merge
git rebase origin/main                    # replay my commits on the latest main
git rebase -i HEAD~4                      # tidy the last four commits
git rebase --abort
git branch -d feature/retry               # delete a merged branch
git cherry-pick HASH                      # copy one commit here
```

> **Warning:** Never rebase or amend commits that others have already pulled. It creates new commits, and their copies no longer match.

## Remotes

```bash
git remote -v
git fetch origin                          # download, change nothing local
git pull --ff-only                        # fetch and fast-forward only
git pull --rebase                         # fetch and replay my commits
git push -u origin feature/retry          # first push, set upstream
git push --force-with-lease               # safer forced update (own branches only)
git branch -vv                            # ahead or behind
```

> **Warning:** Plain `git push --force` can erase a colleague's commits. Use `--force-with-lease` on your own branch, and block force pushes on shared branches.

## Undo

| Goal | Command |
|------|---------|
| Discard edits to a file | `git restore FILE` |
| Unstage a file | `git restore --staged FILE` |
| Fix last commit message | `git commit --amend` |
| Reverse a shared commit | `git revert HASH` |
| Undo commit, keep changes staged | `git reset --soft HEAD~1` |
| Match the remote exactly (loses local work) | `git reset --hard origin/main` |
| Park work | `git stash push -m "note"` then `git stash pop` |
| Preview deleting untracked files | `git clean -n` |

## Tags and releases

```bash
git tag -a v1.4.0 -m "Release 1.4.0"      # annotated tag
git push origin v1.4.0
git describe --tags                       # v1.4.0-12-g3f9c2ab
git log v1.3.0..v1.4.0 --oneline          # what is in the release
git tag --contains HASH                   # which releases hold this fix
```

Semantic versioning: `MAJOR.MINOR.PATCH`. Breaking change raises MAJOR, new compatible feature raises MINOR, bug fix raises PATCH.

## Recover and investigate

```bash
git reflog                                # where HEAD has been
git branch rescue HASH                    # name a lost commit
git bisect start; git bisect bad; git bisect good v1.3.0
git bisect run ./test.sh                  # automatic search for the first bad commit
git fsck --lost-found                     # unreachable objects
git rm --cached FILE                      # stop tracking, keep the file
```

## Big repositories

```bash
git clone --depth 1 URL                   # latest commit only
git clone --filter=blob:none URL          # fetch file contents on demand
git sparse-checkout set DIR1 DIR2         # check out only these folders
git worktree add ../hotfix hotfix/1.4     # second working folder
git submodule update --init --recursive
git count-objects -vH
```

> **Warning:** A secret that was committed is compromised, even after you delete it. Revoke it first, then clean history, because old clones keep a copy.

## Safe habits

- Run `git status` before every commit, reset or checkout.
- Keep commits small, with a message that says why.
- Never rewrite commits that others have pulled.
- Never commit secrets. If one is committed, revoke it first.
- Protect `main`: pull requests, review, required checks, no force push.
