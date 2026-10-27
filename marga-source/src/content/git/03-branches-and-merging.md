---
title: Branches and merging
minutes: 13
summary: Create branches for each piece of work, merge them back with fast-forward or merge commits, and resolve conflicts without panic.
---

On a team, two people change the same project at the same time. Without a way to separate their work, they overwrite each other. Branches are Git's answer: cheap, instant parallel lines of history that you combine later. Because a branch is only a pointer to a commit, creating one costs nothing, and the habit of one branch per task keeps `main` stable.

## What you will learn

- What a branch really is: a movable pointer to a commit
- Create and switch branches, and see where HEAD is
- Merge with fast-forward and with merge commits
- Resolve a merge conflict step by step

## A branch is a pointer

A branch is a small file containing the hash of one commit. When you commit on a branch, the pointer moves forward to the new commit. `HEAD` is the pointer to the branch you are on. Because nothing is copied, branching is instant even in huge repositories.

```bash
git branch                      # list local branches
git switch -c feature/retry     # create and move to a new branch
git log --oneline --graph --all --decorate
git switch main
git branch -d feature/retry     # delete a merged branch
```

`git switch` and `git restore` replace the older, overloaded `git checkout`. Branch names with a slash (`feature/`, `fix/`) group related branches and many teams add a ticket number.

## Merging

Merging combines the work of another branch into the current one:

```bash
git switch main
git merge feature/retry
```

If `main` has not moved since you branched, Git simply moves the pointer forward: a **fast-forward**, with no new commit. If both branches have new commits, Git creates a **merge commit** with two parents that ties the lines together. Use `git merge --no-ff` to always record a merge commit, which keeps the fact that a group of commits belonged together. Before merging, `git diff main...feature/retry` shows what the branch would add.

## Conflicts

A **conflict** happens when both branches changed the same lines. Git stops and marks the files:

```text
<<<<<<< HEAD
retries=3
=======
retries=5
>>>>>>> feature/retry
```

The part between `<<<<<<<` and `=======` is your side, the rest is theirs. Resolve it by editing the file to the correct final content, removing all marker lines, then:

```bash
git status                 # lists "both modified" files
git add config/backup.conf
git commit                 # concludes the merge
# or abandon it:
git merge --abort
```

Do not choose a side blindly. Ask the author, run the tests and read the surrounding code, because a merge can be textually clean and still wrong, for example when one branch renames a function that the other starts to use.

## Keeping branches healthy

Short-lived branches conflict less. Merge `main` into your branch (or rebase, see the next lesson) often, so differences stay small. Delete branches after they are merged. Avoid long-running branches that drift for months: the longer a branch lives, the more painful the merge becomes. Use `git merge --no-commit --no-ff other` to preview a merge, and a tool such as `git mergetool` or your editor's three-way view when conflicts are large.

```predict
Q: main did not change since you branched. What kind of merge is `git merge feature` and does it create a merge commit?
???
A fast-forward. The pointer just moves forward and no merge commit is created unless you use --no-ff.
> Fast-forward is possible only when history is a straight line.
```

## Incident: The conflict that was resolved wrongly

> **Incident:** A deploy script merged cleanly and failed in production an hour later.

```console
$ git merge release/2.3
Auto-merging deploy.sh
Merge made by the 'ort' strategy.
$ ./deploy.sh staging
ERROR: unknown option --region-id
$ git log -3 --oneline -- deploy.sh
8c0aa21 Rename --region-id to --region
4be7710 Add --region-id handling for blue/green
```

One branch had renamed an option while another had added a call using the old name. Git saw changes in different lines and merged without a conflict, but the combined result was broken. The team started running the test suite on the merge result in the pipeline, not only on each branch, and added a check that runs the script with the new options in staging before merging to main.

## Common mistakes

- Long-lived branches that drift
- Resolving conflicts without understanding both sides
- Leaving conflict markers in a file and committing it
- Merging without running tests on the result

```quiz
Q: What is a Git branch?
+ A movable pointer to a commit
- A full copy of the project folder :: Branches copy nothing.
- A remote server :: A remote is another repository.
- A tag that never moves :: Tags stay, branches move.
> This is why branches are cheap.

Q: When does a fast-forward merge happen?
+ When the target branch has no new commits since the branch point
- Whenever there is a conflict :: Conflicts need manual resolution.
- Only on remote branches :: It works locally.
- When using git stash :: Unrelated.
> History must be a straight line.

Q: What do the lines <<<<<<< and >>>>>>> mean?
+ They mark the two conflicting versions that you must resolve
- They are Git commands :: They are markers in the file.
- They show file permissions :: Not related.
- They mean the merge succeeded :: The merge stopped.
> Remove all markers once resolved.

Q: How do you abandon a merge in progress?
+ git merge --abort
- git branch -D main :: This deletes a branch.
- git init :: This creates a repository.
- git push --force :: This overwrites the remote.
> Abort returns to the pre-merge state.
```

```cards
Create and switch :: git switch -c NAME
See graph :: git log --oneline --graph --all
Merge :: git merge BRANCH
Always record a merge commit :: git merge --no-ff
Abort a merge :: git merge --abort
Delete merged branch :: git branch -d NAME
```
