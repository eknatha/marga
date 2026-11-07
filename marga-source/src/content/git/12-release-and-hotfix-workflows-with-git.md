---
title: Release and hotfix workflows with Git
minutes: 12
summary: Cut releases from branches or tags, ship a hotfix without shipping unfinished work and keep long-lived branches in sync with cherry-picks.
---

The hardest release moment is the urgent fix. If you can recreate exactly what is in production from history, a small patch is routine. If you cannot, every fix is a risk.

## What you will learn

- Tags and release branches
- Hotfix flow from the release tag
- Cherry-picking fixes across branches
- Automating versions and changelogs

## Tag releases

```bash
git tag -s v2.8.0 -m "Release 2.8.0"
git push origin v2.8.0
git describe --tags --always
```

An **annotated, signed tag** records who released what and when. Build release artifacts from the tag, so production maps to an exact commit.

## Hotfix

```bash
git switch -c hotfix/2.8.1 v2.8.0         # start from what is in production
# ...fix, test...
git commit -am "Fix invoice rounding (CVE-free, refs #812)"
git tag -s v2.8.1 -m "Hotfix 2.8.1"
git push origin hotfix/2.8.1 v2.8.1
git switch main && git merge --no-ff hotfix/2.8.1     # bring the fix back
```

Starting from the release tag means the hotfix contains only the fix. Afterwards merge it forward so main is not missing it.

## Cherry-pick

```bash
git switch release/2.7
git cherry-pick -x 4b1c9e2
```

`-x` adds the original commit hash to the message, which helps trace where a fix came from. Backport the fix to each supported release branch, and resolve conflicts carefully, because the code may differ.

## Automate

Use **Conventional Commits** so tools can derive the next version and a changelog from commit messages. Release from CI, not from laptops, and protect release branches and tags so they cannot be rewritten.

```bash
git log v2.8.0..v2.8.1 --oneline
git tag --contains 4b1c9e2
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Release and hotfix workflows with Git fits together
node: n1 | Tag releases | 0 | 0 | An annotated, signed tag records who released what and when. | Building fixes from main without a release tag. | process
node: n2 | Hotfix | 1 | 1 | Starting from the release tag means the hotfix contains only the fix. | Forgetting to merge hotfixes back. | process
node: n3 | Cherry-pick | 2 | 0 | -x adds the original commit hash to the message, which helps trace where a fix came from. | Cherry-picks without recording the source. | process
node: n4 | Automate | 3 | 1 | Use Conventional Commits so tools can derive the next version and a changelog from commit messages. | Unprotected release tags. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The hotfix that shipped half the backlog

> **Incident:** A fix was built from main and included unfinished features.

```console
built from: main (a91d3c0)
changes since v2.8.0: 47 commits
billing-v2 code path included, flag default on
```

There was no release tag to branch from, so the team built the fix from main, which carried many unreleased changes. A rollback was needed. They began tagging every release and branching hotfixes from the tag.

## Common mistakes

- Building fixes from main without a release tag
- Forgetting to merge hotfixes back
- Cherry-picks without recording the source
- Unprotected release tags

```quiz
Q: Where start a hotfix from?
+ The release tag in production
- The newest main :: No.
- A random branch :: No.
- Another repo :: No.
> Only the fix should change.

Q: What does cherry-pick -x add?
+ The original commit hash to the message
- A tag :: No.
- A branch :: No.
- A signature :: No.
> Traceability. The lesson section above explains why.

Q: Why sign release tags?
+ They prove who released what
- They speed Git :: No.
- They save disk :: No.
- They remove history :: No.
> Integrity. The lesson section above explains why.

Q: Why merge hotfixes forward?
+ So main also has the fix
- To delete tags :: No.
- To squash history :: No.
- To hide fixes :: No.
> Avoid regressions. The lesson section above explains why.
```

```cards
Annotated tag :: Tag with message and metadata
Hotfix :: Urgent fix to a released version
Cherry-pick :: Applying one commit onto another branch
Conventional Commits :: Commit format that enables automation
```
