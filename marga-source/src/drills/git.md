## Push rejected
level: junior
You try to push your branch and Git refuses.

```text
! [rejected]        feature/retry -> feature/retry (non-fast-forward)
error: failed to push some refs to 'code.example.com:ops/deploy.git'
hint: Updates were rejected because the tip of your current branch is behind
```
? What is the right next step?
+ Fetch, integrate the remote commits with rebase or merge, run the tests and push again
- Add --force to the push
- Delete the branch and recreate it
- Run git reset --hard HEAD~5
why: The remote has commits you do not have. Forcing would overwrite a colleague's work. Integrate first.

## Detached HEAD after checking out a tag
level: junior
You made a fix after checking out a release tag.

```text
$ git checkout v1.4.0
Note: switching to 'v1.4.0'.
You are in 'detached HEAD' state.
$ git commit -am "Fix backup path"
```
? How do you keep the new commit?
+ Create a branch right there with git switch -c hotfix/1.4
- Switch to main without doing anything
- Run git gc to save it
- Delete the tag
why: Commits made in a detached HEAD belong to no branch and become unreachable once you switch away. A branch pointing at the commit keeps it.

## The lost commit
level: mid
After a reset you cannot see yesterday's work.

```text
$ git reset --hard origin/main
$ git log --oneline -3
41ac9d2 Merge pull request 482
```
? Where do you look first?
+ git reflog, then create a branch at the hash of the lost commit
- Clone the repository again
- Run git stash pop
- Ask for the remote to be restored
why: The reflog records where HEAD pointed before the reset. A branch at that hash makes the commit reachable again.

## A conflict marker in production
level: mid
A deploy fails with a syntax error in a config file.

```text
<<<<<<< HEAD
retries=3
=======
retries=5
>>>>>>> feature/retry
```
? What happened and how do you prevent it?
+ A conflict was committed with the markers still in the file; add a check in the pipeline that fails on marker lines
- Git generated the markers by itself during deploy
- The server has a corrupted disk
- The file needs a different encoding
why: Someone ran git add on a conflicted file without editing it. A lint or grep for conflict markers in CI catches it before merge.

## Which release broke it?
level: mid
A regression appeared somewhere between two versions with 180 commits.

```text
v3.1.0  works
v3.2.0  fails the totals report
```
? What is the fastest way to find the responsible commit?
+ git bisect between v3.1.0 and v3.2.0, ideally with a script for git bisect run
- Read every commit message from top to bottom
- Revert every commit one by one
- Rewrite the history of v3.2.0
why: Bisect uses a binary search, about eight steps for 180 commits, and a script makes it repeatable.

## Secret in history
level: senior
A scanner reports a live credential in a commit from last week on a shared repository.

```text
rule: aws-access-key
file: config/prod.env
commit: 5b2c9de (7 days ago)
```
? What is the correct order of actions?
+ Revoke and rotate the credential, check its use, then rewrite history and add prevention
- Delete the file in a new commit and close the alert
- Rewrite history first and rotate the key next week
- Make the repository private and keep the key
why: A leaked credential must be assumed copied. Rotation removes the risk; history cleanup and prevention come after it.

## Wrong branch commit
level: junior
You committed three changes on main by mistake, and main is protected on the server.

```text
$ git status
On branch main
Your branch is ahead of 'origin/main' by 3 commits.
$ git push
remote: error: protected branch hook declined
```
? What is the safest way to move the commits to a feature branch?
+ Create a branch at the current commit with git branch feature/x, then reset main to origin/main
- Delete the repository and clone again
- Force push to main
- Run git stash drop
why: A new branch label keeps the three commits. Resetting main to the remote state then removes them from main without losing work.

## Submodule folder is empty
level: mid
A build fails because a vendored directory has no files after a fresh clone.

```text
$ git clone ssh://code.example.com/ops/deploy.git
$ ls vendor/scripts
$ cat .gitmodules
[submodule "vendor/scripts"]
```
? What do you run?
+ git submodule update --init --recursive (or clone with --recurse-submodules)
- git gc --aggressive
- git stash pop
- git reset --hard HEAD
why: A normal clone creates empty submodule folders. Initializing and updating the submodules downloads the pinned commits.
