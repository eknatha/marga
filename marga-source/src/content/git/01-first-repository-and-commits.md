---
title: Your first repository: snapshots, commits and history
minutes: 12
summary: Understand what version control records, make your first commits with a clear message, read the history, and keep generated files out with .gitignore.
---

You have a folder of scripts and a file called deploy_final_v2_REAL.sh next to deploy_final_v3.sh. Nobody knows which one runs in production or what changed between them. Version control replaces that folder-copy habit with a complete, searchable history of every change, who made it and why. Git is the tool almost every team uses for it, and its core idea is small enough to learn in one sitting.

## What you will learn

- What Git stores: snapshots, commits and a history you can search
- The cycle: edit, stage with git add, save with git commit
- Read the history with git log, git diff and git show
- Keep build output and secrets out of the repository with .gitignore

## Snapshots, not copies of files

Git is a **distributed** version control system. Every copy of a repository (a **clone**) holds the full history, so you can commit, compare and browse the past without a network. Each **commit** is a snapshot of the whole project at one moment, plus a message, an author, a timestamp and a pointer to its parent commit. Commits are identified by a long hash such as `3f9c2ab...`, and the first seven characters are usually enough to name one. Because every commit points to its parent, the history is a chain you can walk backwards.

Git stores content efficiently by keeping identical files once, so snapshots are cheap. Think of the history as a list of save points you can return to or compare at any time.

## Create a repository and commit

Tell Git who you are once, then start a repository:

```bash
git config --global user.name "Asha Rao"
git config --global user.email "asha@example.com"
git config --global init.defaultBranch main

mkdir backup-tools && cd backup-tools
git init
echo "#!/bin/sh" > backup.sh
git status
git add backup.sh
git commit -m "Add backup script skeleton"
```

`git init` creates a hidden `.git` directory that holds the whole history; delete it and the project is just files again. `git status` is the command you will run most, because it tells you what is changed, what is staged and what is untracked. The commit includes only what you staged with `git add`, not everything in the folder.

## The three areas

Files move through three places. The **working tree** is the files you edit. The **staging area** (also called the index) is what will go into the next commit. The **repository** is the saved history. `git add` copies a change from the working tree into the staging area, and `git commit` turns the staged set into a permanent snapshot. This two-step design lets you edit ten files and commit them as two clean, separate changes: stage the first group, commit, then stage the rest.

`git add -p` lets you stage individual pieces of a file, which is how experienced people keep commits focused.

## Read the history

```bash
git log --oneline --graph --decorate -10
git show 3f9c2ab
git diff                 # working tree vs staging
git diff --staged        # staging vs last commit
git log -p -- backup.sh  # every change to one file
```

A good commit does one thing and its message says why. Write a short summary line in the imperative ("Fix retry loop in backup.sh"), leave a blank line, then explain the reason if it is not obvious. Months later, `git log` and `git blame` are your documentation of why the code looks the way it does, so a message like "update" wastes that chance.

## Leave things out with .gitignore

Some files do not belong in history: compiled output, virtual environments, logs, editor settings and above all secrets. List patterns in a `.gitignore` file at the top of the repository:

```text
__pycache__/
*.log
.venv/
dist/
.env
terraform.tfstate*
```

Ignore rules only affect files Git is not yet tracking. If a file was committed before you ignored it, it stays tracked until you remove it from the index with `git rm --cached FILE`. Add the `.gitignore` in your very first commit, because it is much easier to avoid a bad file than to remove it from history later.

```predict
Q: You edit backup.sh and run `git commit -m "fix"` without `git add`. What does Git say?
???
It reports "no changes added to commit" and makes no commit, because nothing is staged.
> Commits contain only staged changes; `git commit -a` stages tracked files for you but is a shortcut, not a habit to rely on blindly.
```

## Incident: Two gigabytes of build output

> **Incident:** A new teammate cloned the deployment repository and waited twenty minutes for a download that should have been seconds.

```console
$ git clone ssh://code.example.com/ops/deploy.git
Receiving objects: 100% (48211/48211), 1.92 GiB | 2.1 MiB/s
$ git count-objects -vH | grep size-pack
size-pack: 1.88 GiB
$ git log --oneline --stat -3 | head
9ad41e0 Add release bundles
 release/app-1.4.tar.gz | Bin 0 -> 412308120 bytes
```

Someone had committed compiled release bundles several times, and because Git keeps every version forever, each bundle stayed in history even after being deleted in later commits. Removing them from history required rewriting the repository (covered in the lesson on secrets and history). The lasting fix was a .gitignore for the dist directory and a rule that release artifacts go to an artifact store, not to source control.

## Common mistakes

- Committing generated files, logs or secrets
- Writing messages like "update" or "fix stuff"
- Making one huge commit that mixes unrelated changes
- Skipping git status before committing

```quiz
Q: What is staged by git add?
+ The changes that will be included in the next commit
- The whole remote repository :: Staging is local.
- Only deleted files :: Any change can be staged.
- The commit message :: The message is given at commit time.
> The staging area is the draft of the next commit.

Q: Where is the full history stored?
+ In the .git directory of each clone
- Only on a central server :: Git is distributed.
- In the working tree files :: Those are only the current files.
- In the .gitignore file :: That file lists ignore patterns.
> Every clone has the complete history.

Q: Which command shows what is staged compared with the last commit?
+ git diff --staged
- git diff :: That compares working tree and staging.
- git init :: That creates a repository.
- git clone :: That copies a repository.
> Know which two sides each diff compares.

Q: A file was committed before being added to .gitignore. What happens?
+ It stays tracked until you remove it from the index with git rm --cached
- It is deleted automatically :: Ignore rules do not delete tracked files.
- Git refuses all commits :: Commits still work.
- It is hidden from history :: History is unchanged.
> Ignore rules apply to untracked files only.
```

```cards
Create a repository :: git init
Stage a change :: git add FILE (or git add -p)
Save a snapshot :: git commit -m "message"
See state :: git status
Compact history :: git log --oneline --graph
Stop tracking but keep the file :: git rm --cached FILE
```
