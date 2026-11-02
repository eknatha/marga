## What is the difference between git fetch and git pull?
level: junior
Fetch downloads new commits and updates the remote-tracking branches such as origin/main, but does not change your working tree or your local branches, so it is always safe. Pull is a fetch followed by an integration step, a merge by default or a rebase if configured. I like to fetch first, look at what arrived with git log, and then integrate. Setting pull.ff to only avoids surprise merge commits.

## What are the working tree, the staging area and the repository?
level: junior
The working tree holds the files you edit. The staging area, or index, holds the changes selected for the next commit, set with git add. The repository is the saved history in the .git directory. The staging area lets you build clean, focused commits out of a messy set of edits, for example by staging pieces of a file with git add -p.

## How do you undo a commit that has already been pushed to a shared branch?
level: junior
I use git revert, which creates a new commit that applies the opposite change. History is not rewritten, so teammates can pull normally and the record shows both the change and the rollback. Reset or amend followed by a force push would rewrite shared history and break other people's copies, so I avoid that on shared branches.

## What is a merge conflict and how do you resolve it?
level: junior
A conflict happens when two branches changed the same lines and Git cannot decide which version to keep. Git marks the file with conflict markers. I read both sides, edit the file to the correct final content, remove the markers, run git add on the file and commit to finish the merge, or abort with git merge --abort. Afterwards I run the tests, because a clean textual merge can still be logically wrong.

## What is the difference between merge and rebase?
level: mid
Merge joins two histories with a merge commit and keeps exactly what happened. Rebase replays my commits on top of another branch as new commits, producing a linear history. Rebase is good for updating my own unpushed feature branch and for tidying commits with interactive rebase. The rule is never to rebase commits that others have pulled, because it rewrites them and their copies no longer match.

## When would you use git reset --hard, and what is the risk?
level: mid
I use it to make a local branch exactly match a known state, for example origin/main after a bad local experiment. The risk is that it overwrites the working tree, so uncommitted edits are lost permanently. Committed work stays recoverable through the reflog for some time. I check git status and often stash first.

## How do you recover a commit you think you lost?
level: mid
Run git reflog, which journals where HEAD and branches pointed, find the hash of the lost commit, and create a branch there with git branch rescue HASH. This works for committed work, including after reset, rebase or a deleted branch. Uncommitted edits were never saved by Git and cannot be recovered this way. For unreachable objects git fsck --lost-found can help.

## How would you find which commit introduced a bug?
level: mid
I use git bisect with a known good commit or tag and a known bad one. Git checks out the commit in the middle and I test it, answering good or bad, so about log2 of the number of commits steps find the first bad commit. Writing a small script that exits non-zero on failure lets git bisect run do it automatically, and the script then becomes a regression test.

## How do you handle a secret that was committed to a repository?
level: senior
First revoke and rotate the secret, assuming it is already copied, and check logs for misuse. Then remove it from history with git filter-repo if needed, force-push, and ask everyone to re-clone, as old clones and forks still hold it. Ask the platform to purge cached commits. Finally add prevention: pre-commit scanning, push protection, a secret manager and short-lived credentials, plus a short review of how it happened.

## What branching strategy would you choose for a team deploying a web service several times a day?
level: senior
Trunk-based development or very short feature branches merged through small, reviewed pull requests, with required status checks, protected main, no force pushes, and feature flags for unfinished work. The pipeline builds an artifact from the merged commit and promotes the same artifact through environments. Release branches only make sense if several versions must be supported at once, because they add merge cost and delay feedback.

## How do you keep a very large repository fast for developers and CI?
level: senior
For CI, use shallow and partial clones with sparse checkout so jobs download only what they need, and cache between runs. Keep binaries and build output out of the history, using an artifact store or Git LFS when they must be versioned. Run git maintenance, watch repository size, and consider splitting or restructuring if one repository serves unrelated teams. Use CODEOWNERS and path-based checks so a monorepo stays reviewable.
