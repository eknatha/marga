---
title: Tags, releases and version numbers
minutes: 12
summary: Mark releases with annotated tags, number them with semantic versioning, and handle hotfixes and changelogs.
---

In production, someone asks, "which exact code is running?" A branch name is no answer, because branches move. A **tag** is a permanent name for one commit, and a version number on a tag is how teams, pipelines and customers talk about releases. Getting tags and versions right makes rollbacks, audits and incident analysis much simpler.

## What you will learn

- Lightweight and annotated tags, and why releases use annotated ones
- Semantic versioning: MAJOR.MINOR.PATCH
- Release branches and hotfixes
- Changelogs and finding what is in a release

## Tags

A tag is a fixed name for a commit. A **lightweight** tag is only a pointer. An **annotated** tag is a full object with a tagger, date and message, and can be signed. Use annotated tags for releases.

```bash
git tag -a v1.4.0 -m "Release 1.4.0: add retry to backup job"
git tag -s v1.4.1 -m "Hotfix, signed"     # signed with your key
git push origin v1.4.0                      # tags are not pushed by default
git push origin --tags
git show v1.4.0
git describe --tags                         # e.g. v1.4.0-12-g3f9c2ab
```

`git describe` turns any commit into a readable name: the last tag, how many commits since, and the short hash. Many pipelines use it to stamp the version into builds. Do not move or delete a published tag; deployed artifacts already refer to it. If a release is wrong, publish a new version.

## Semantic versioning

Semantic versioning (SemVer) uses `MAJOR.MINOR.PATCH`:

- **PATCH** for backward-compatible bug fixes (1.4.0 to 1.4.1)
- **MINOR** for backward-compatible new features (1.4.1 to 1.5.0)
- **MAJOR** for breaking changes (1.5.0 to 2.0.0)

A pre-release is written `2.0.0-rc.1`. The numbers are a promise to the people who depend on you: a minor upgrade should not break them. Services that nobody installs themselves sometimes use dates (`2026.01.05`) or build numbers; choose one scheme and write it down.

## Releases and hotfixes

A simple flow: develop on short branches, merge to `main`, tag the release commit, build the artifact from that tag, and deploy the same artifact everywhere. If you need to fix an old version, branch from its tag:

```bash
git switch -c hotfix/1.4 v1.4.0
# fix, commit, then
git tag -a v1.4.1 -m "Fix backup path"
git switch main && git cherry-pick HASH   # bring the fix forward
```

`git cherry-pick` copies one commit onto another branch. Always make sure the fix also reaches `main`, or the bug returns in the next release.

## Changelogs and questions you can answer

Keep a human-written changelog that lists notable changes per version under headings such as Added, Changed, Fixed and Security. Generating it from commit messages works if messages are disciplined. Tags let you answer production questions quickly:

```bash
git log --oneline v1.3.0..v1.4.0       # what is in this release
git tag --contains 3f9c2ab              # which releases contain this fix
git diff v1.4.0 v1.4.1 --stat           # what the hotfix changed
```

```predict
Q: A customer on 1.4.0 reports a bug fixed in a commit on main. How do you find which released versions contain the fix?
???
Use git tag --contains COMMIT to list the tags that include that commit.
> Tags make "is it in this release?" a one-line question.
```

## Incident: The tag that moved

> **Incident:** Two builds both said version 2.1.0, and they behaved differently.

```console
$ git rev-parse v2.1.0
9e0b7c1
$ git ls-remote --tags origin v2.1.0
4c18aa2    refs/tags/v2.1.0
$ docker image inspect shop:2.1.0 --format "{{index .Config.Labels \"commit\"}}"
9e0b7c1
```

A developer had deleted and recreated the tag v2.1.0 on a different commit after a late fix. Production still ran the image built from the first commit, while the new tag pointed to different code. The team banned moving tags (the server now rejects tag updates), started stamping the commit hash into every image, and decided that a mistake means releasing 2.1.1.

## Common mistakes

- Moving or deleting published tags
- Lightweight tags for releases
- Breaking changes in a minor version
- Hotfixes that never reach main

```quiz
Q: Which tag type should releases use?
+ Annotated tags
- Lightweight tags only :: They lack tagger and message.
- No tags :: Then releases are not identifiable.
- Branch names :: Branches move.
> Annotated tags carry metadata and can be signed.

Q: Under SemVer, which change increments MAJOR?
+ A backward-incompatible change
- A bug fix :: That is PATCH.
- A new compatible feature :: That is MINOR.
- A documentation update :: Usually no version change.
> Major signals breaking changes.

Q: Are tags pushed by git push by default?
+ No, push them explicitly or with --tags
- Yes, always :: They are not.
- Only lightweight tags :: Neither kind is.
- Only on main :: Not related.
> git push origin v1.4.0.

Q: What does git tag --contains HASH show?
+ Which tags include that commit
- The author of the commit :: Use log or blame.
- The remote URL :: Not related.
- The size of the repository :: Not related.
> Great for checking if a fix shipped.
```

```cards
Create release tag :: git tag -a vX.Y.Z -m "msg"
Publish a tag :: git push origin vX.Y.Z
Name any commit :: git describe --tags
Contents of a release :: git log vA..vB
Is this fix released? :: git tag --contains HASH
Copy a fix :: git cherry-pick HASH
```
