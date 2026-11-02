---
title: Large repositories, submodules and worktrees
minutes: 13
summary: Keep big repositories fast with shallow and partial clones, sparse checkout and LFS; know when to use submodules; work on several branches at once with worktrees.
---

Repositories grow. A project that cloned in seconds takes minutes after years of history, large binaries and many contributors. CI jobs clone on every run, so slow clones become slow pipelines and real money. Git has several tools to keep large repositories usable, and a few ways to combine repositories. Knowing which to pick, and which to avoid, saves many headaches.

## What you will learn

- Shallow, partial and sparse clones for speed
- Large files with Git LFS, and when to keep binaries out
- Submodules and alternatives for sharing code
- Worktrees: several branches checked out at once

## Clone less

Not every job needs the full history.

```bash
git clone --depth 1 URL                    # shallow: only the latest commit
git clone --filter=blob:none URL           # partial: fetch file contents on demand
git clone --filter=blob:none --sparse URL
cd repo && git sparse-checkout set services/payments docs
```

A **shallow clone** is ideal for CI builds that only need the current files, but commands that need history (`git describe`, `git log`, blame, some versioning tools) will not work, so deepen it with `git fetch --deepen=50` or `--unshallow`. A **partial clone** keeps all commits but downloads file contents only when needed. **Sparse checkout** limits the working tree to chosen folders, which is how huge monorepos stay manageable.

## Large files

Git stores every version of every file. A 200 MB binary changed ten times is 2 GB of history. Options:

- Keep build artifacts and large data **out** of Git; use an artifact registry or object storage and record the version in a file.
- For binaries that must live with the code (design files, test data), use **Git LFS**: Git stores a small pointer, and the large content goes to a separate store.

```bash
git lfs install
git lfs track "*.psd"
git add .gitattributes
```

The tracking rules are saved in `.gitattributes`. Decide before the files are committed; moving existing large files to LFS needs a history rewrite. Run `git count-objects -vH` and `git rev-list --objects --all | sort -k2 | head` style checks, or a size report in CI, to notice growth early.

## Submodules and alternatives

A **submodule** embeds another repository at a fixed commit inside yours:

```bash
git submodule add https://code.example.com/ops/shared-scripts.git vendor/scripts
git clone --recurse-submodules URL
git submodule update --init --recursive
```

The parent records an exact commit of the child, which is good for reproducibility and a common source of confusion: people forget to update the submodule, commit in a detached state, or clone without `--recurse-submodules` and get empty folders. Alternatives are a package manager (publish the shared code as a versioned package), `git subtree` (copies the code into your history), or a monorepo. Prefer packages for libraries; use submodules when you truly need a pinned copy of another repository.

## Worktrees

Switching branches in the middle of work means stashing or committing. A **worktree** gives you another folder with a different branch checked out, sharing the same repository data:

```bash
git worktree add ../hotfix-1.4 hotfix/1.4
cd ../hotfix-1.4
# fix and test while the main folder keeps your feature work
git worktree list
git worktree remove ../hotfix-1.4
```

This is handy for urgent fixes, reviewing a pull request in a clean directory, and running long tests on one branch while you code on another. Housekeeping runs automatically, and `git maintenance start` can schedule background optimization for large repositories.

```predict
Q: A CI job only needs to build the current code, but the clone takes 6 minutes. Which options help?
???
A shallow clone (--depth 1), a partial clone, or sparse checkout of just the needed folders.
> Do not fetch history the job never uses.
```

## Incident: The pipeline that cloned for eleven minutes

> **Incident:** Builds became slower each month, and a pipeline run spent most of its time before the first build step.

```console
$ time git clone ssh://code.example.com/platform/mono.git
Receiving objects: 100% (3604211/3604211), 7.4 GiB
real 11m02s
$ time git clone --depth 1 --filter=blob:none ssh://code.example.com/platform/mono.git
real 0m19s
```

The job needed only the files of one service. The team changed the pipeline to use a shallow, partial clone with sparse checkout of the service folder and its shared libraries, which cut clone time to under 20 seconds. They also moved old release bundles out of the repository and added a size alert so growth is noticed early.

## Common mistakes

- Committing large binaries without LFS or an artifact store
- Cloning full history in every CI job
- Forgetting --recurse-submodules and building with empty folders
- Editing submodule contents in a detached state and losing the commit

```quiz
Q: What does git clone --depth 1 do?
+ Downloads only the most recent commit
- Clones the whole history :: That is the default.
- Deletes the remote :: It never does.
- Compresses local files :: Not its purpose.
> Good for CI that only needs files.

Q: What is a good place for large build artifacts?
+ An artifact registry or object storage, not the Git history
- The main branch :: History keeps every version.
- The .gitignore file :: That lists patterns.
- A commit message :: Not a place for files.
> Keep binaries out of history.

Q: A submodule folder is empty after cloning. What did you likely forget?
+ git clone --recurse-submodules (or git submodule update --init)
- git commit :: Not related.
- git stash :: Not related.
- git blame :: Not related.
> Submodules need an extra step.

Q: What is a worktree?
+ An additional working directory with another branch checked out from the same repository
- A backup copy of the server :: It is local.
- A type of tag :: It is not.
- A compression format :: It is not.
> Handy for hotfixes and reviews.
```

```cards
Fast CI clone :: git clone --depth 1 --filter=blob:none
Only some folders :: git sparse-checkout set DIR
Large binaries :: Git LFS or artifact store
Submodule clone :: git clone --recurse-submodules
Second working folder :: git worktree add PATH BRANCH
Repo size :: git count-objects -vH
```
