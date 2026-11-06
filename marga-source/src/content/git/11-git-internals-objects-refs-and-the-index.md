---
title: Git internals: objects, refs and the index
minutes: 12
summary: Look inside a repository to see blobs, trees, commits, refs and the index, and understand why Git commands behave the way they do.
---

Day-to-day Git commands hide a simple data model. Looking at it once makes rebase, reset, detached HEAD and recovery far less mysterious.

## What you will learn

- Blobs, trees, commits and tags
- Refs, HEAD and branches as pointers
- The index and what git add really does
- Using plumbing commands to inspect and recover

## Objects

```bash
mkdir demo && cd demo && git init -q
echo "hello" > a.txt && git add a.txt && git commit -qm "first"
git cat-file -t HEAD           # commit
git cat-file -p HEAD           # tree, author, message
git cat-file -p 'HEAD^{tree}'  # the files in that snapshot
git cat-file -p "$(git rev-parse HEAD:a.txt)"   # the file contents
```

A **blob** holds file contents, a **tree** lists names and blobs or other trees, a **commit** points to a tree and parent commits and a **tag** names a commit. Each is stored under the hash of its content, so identical content is stored once and any change gives a new hash.

## Refs and HEAD

```bash
cat .git/HEAD                  # ref: refs/heads/main
cat .git/refs/heads/main       # the commit hash
git branch feature             # creates a 41-byte file
git update-ref refs/heads/rescue 3f2a9c1
```

A **branch** is a file containing a commit hash. **HEAD** normally contains the name of the current branch, and committing moves that branch forward. In **detached HEAD** state, HEAD holds a hash directly, so new commits are not on any branch.

## The index

```bash
git ls-files --stage
git diff --cached              # index versus last commit
git write-tree                 # turns the index into a tree object
```

The **index** is the staging area, a list of paths and blob hashes that will become the next commit's tree. `git add` writes a blob and updates the index. `git commit` writes a tree from the index and a commit object.

## Recovery

```bash
git reflog                     # where HEAD and branches have been
git fsck --lost-found          # unreachable commits
git branch recovered a1b2c3d   # make them reachable again
```

Unreachable objects remain until garbage collection, usually for weeks, so lost commits are often recoverable.

## Incident: The branch that seemed to vanish

> **Incident:** A deleted branch still held unmerged work, which was recovered.

```console
$ git branch -D feature/billing
Deleted branch feature/billing (was 9e41c7b).
reflog: 9e41c7b HEAD@{3}: commit: add invoice export
```

The developer deleted the branch before merging and panicked. Git had printed the hash of the tip. A new branch created at that commit restored the work immediately, and the team added a habit of reading the deletion message.

## Common mistakes

- Thinking branches are copies of files
- Panicking after deleting a branch
- Committing in detached HEAD and moving away
- Running gc aggressively before checking the reflog

```quiz
Q: What is a branch?
+ A pointer to a commit
- A copy of all files :: No.
- A server :: No.
- A tag type :: No.
> A tiny file with a hash.

Q: What does a commit point to?
+ A tree and its parent commits
- Only a diff :: No.
- A branch :: No.
- A remote :: No.
> Snapshots form history.

Q: What is the index?
+ The staging area for the next commit
- A remote :: No.
- A log :: No.
- A tag :: No.
> git add updates it. The lesson section above explains why.

Q: How recover a lost commit?
+ Find it with reflog and branch from it
- It is gone forever :: No.
- Reinstall Git :: No.
- Delete .git :: No.
> Objects stay until gc.
```

```cards
Blob :: Object holding file contents
Tree :: Object listing files and directories
HEAD :: Pointer to the current branch or commit
Reflog :: Local history of where refs pointed
```
