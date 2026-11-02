---
title: Remotes: clone, fetch, pull and push
minutes: 13
summary: Work with a shared repository: clone it, see what changed with fetch, update with pull, publish with push, and understand why a push is rejected.
---

A repository on your laptop is only useful to others if it is connected to a shared one. A remote is a named link to another copy of the repository, usually on a server or a code-sharing site. Most daily Git confusion ("why is my push rejected?", "what did pull just do?") comes from not seeing that your branches and the remote's branches are separate things that you synchronize on purpose.

## What you will learn

- Clone and inspect remotes, and what origin means
- Remote-tracking branches such as origin/main
- The difference between fetch and pull
- Push, upstream branches, rejected pushes and safe forcing

## Clone and remotes

```bash
git clone git@code.example.com:ops/deploy.git
cd deploy
git remote -v
git branch -vv
```

`git clone` copies the full history and creates a remote named `origin` pointing to where you cloned from. You can have more than one remote, for example `origin` for your fork and `upstream` for the original project. `git branch -vv` shows each local branch, the remote branch it tracks, and whether you are ahead or behind.

A remote can use SSH (`git@host:path`) or HTTPS (`https://host/path`). SSH uses your key pair and avoids typing passwords; HTTPS usually uses a token stored by a credential helper. Never put a token in the URL of a remote, because it ends up in `.git/config` and shell history.

## Remote-tracking branches

After a clone, Git keeps a read-only copy of the remote's branches as `origin/main`, `origin/feature-x` and so on. They only move when you talk to the remote. This is why your local `main` and `origin/main` can differ: one is your work, the other is your last known picture of the server.

```bash
git fetch origin            # update origin/* from the server, change nothing else
git log --oneline main..origin/main   # commits on the remote that I do not have
git log --oneline origin/main..main   # my commits not yet pushed
```

## Fetch versus pull

`git fetch` downloads new commits and updates remote-tracking branches. It never touches your working tree, so it is always safe. `git pull` is `fetch` followed by an integration step: by default a merge, or a rebase if you ask for it.

```bash
git pull --ff-only      # fail instead of creating a surprise merge commit
git pull --rebase       # replay my local commits on top
git config --global pull.ff only   # make the safe behaviour the default
```

A habit that avoids surprises: `git fetch`, look at what arrived with `git log`, then integrate. If you see an unexpected merge commit after a pull, it means you and the remote both had new commits.

## Push and rejected pushes

```bash
git push -u origin feature/retry    # first push: create the branch and set its upstream
git push                            # later pushes need no arguments
```

A push succeeds only if it is a fast-forward of the remote branch. If someone else pushed first, you see `! [rejected] (non-fast-forward)`. Do not reach for `--force`. Fetch, integrate their commits (rebase or merge), run your tests and push again. If you really rewrote your own feature branch, use `git push --force-with-lease`, which fails if the remote has commits you have not seen. Many teams protect `main` so that nobody, including administrators, can force-push to it.

```predict
Q: `git pull` produced a merge commit you did not expect. What does that tell you?
???
Both your local branch and the remote had new commits, so pull merged them. Use fetch first, or pull --rebase or --ff-only to control it.
> Pull is fetch plus an integration step.
```

## Incident: The push that overwrote a release branch

> **Incident:** A hurried engineer saw a rejected push and fixed it the quick way.

```console
$ git push origin release/3.2
 ! [rejected]        release/3.2 -> release/3.2 (non-fast-forward)
$ git push --force origin release/3.2
 + a91c3e0...22d7f10 release/3.2 -> release/3.2 (forced update)
$ git log --oneline origin/release/3.2 -2
22d7f10 Bump version to 3.2.4
```

The force push removed two security fix commits from the release branch that a colleague had pushed an hour earlier. The commits were found in the colleague's clone and restored. The repository now blocks force pushes on release/* and main, and the contributing guide tells people to fetch and rebase when a push is rejected.

## Common mistakes

- Pulling without knowing whether it merges or rebases
- Using --force to get past a rejected push
- Putting access tokens in remote URLs
- Forgetting to set the upstream so push and pull need arguments

```quiz
Q: What does git fetch change?
+ Remote-tracking branches such as origin/main, not your working tree
- Your current files :: Fetch leaves them alone.
- The remote server history :: Fetch only downloads.
- Your commit messages :: It does not touch them.
> Fetch is always safe.

Q: What is git pull?
+ A fetch followed by a merge or rebase
- Only a download :: That is fetch.
- A push with extra checks :: Push publishes, pull brings in.
- A way to delete branches :: Not related.
> Know which integration your pull performs.

Q: Why is a push rejected as non-fast-forward?
+ The remote branch has commits that you do not have
- The branch name is too long :: Not the reason.
- Your commit message is empty :: Not the reason.
- Git is out of date :: Not the reason.
> Integrate first, then push.

Q: What does git push -u origin BRANCH do?
+ Pushes the branch and sets it as the upstream of the local branch
- Deletes the remote branch :: Delete uses --delete.
- Forces the push :: That is --force.
- Creates a tag :: Not related.
> Upstream lets plain push and pull work.
```

```cards
See remotes :: git remote -v
Download without merging :: git fetch
What am I ahead or behind :: git branch -vv
Safe pull :: git pull --ff-only
First push of a branch :: git push -u origin NAME
Safer force :: git push --force-with-lease
```
