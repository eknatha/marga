---
title: Organizing skills for a team
minutes: 12
summary: Share skills across a team with naming, ownership, review, versioning and a catalog so people find and trust them.
---

One skill is easy to manage. Fifty skills written by ten people create overlap, drift and risk. The solution is the same discipline you use for code: ownership, review and a place to find things.

## What you will learn

- Naming and scoping to avoid overlap
- Ownership, review and versioning
- A catalog that people can search
- Retiring and auditing skills

## Naming and scope

Use a clear pattern such as `team-area-task`, and write descriptions that state when to use the skill and when not to. Overlapping descriptions cause the wrong skill to trigger. Merge duplicates rather than keeping variants.

## Repository and review

```text
skills/
  CODEOWNERS
  platform/
    triage-api-latency/
    rotate-certificates/
  data/
    backfill-checklist/
  catalog.md
```

```bash
git log --oneline -- skills/platform/triage-api-latency | head
./tools/check-skills.sh   # lint front matter, links and scripts
```

Keep skills in version control. Require a review from the owning team for changes, run a lint check for front matter and broken links, and test with a few sample prompts. Use tags or version numbers so a team can pin a known good version.

## Catalog

Publish a catalog with each skill's name, description, owner, last review date and risk level. People search it before writing a new skill.

## Retire and audit

Review skills on a schedule, such as every quarter. Remove skills nobody uses and flag skills that run scripts or touch production for a security review. Record who may install which skills.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Organizing skills for a team fits together
node: n1 | Naming and scope | 0 | 0 | Use a clear pattern such as team-area-task, and write descriptions that state when to use the skill and when not to. | No owner for a skill. | process
node: n2 | Repository and review | 1 | 1 | Keep skills in version control. Require a review from the owning team for changes, run a lint check for front matter and broken links, and test with a few sample prompts. | Skills with production access and no review. | external
node: n3 | Catalog | 2 | 0 | Publish a catalog with each skill's name, description, owner, last review date and risk level. | Duplicate skills with unclear differences. | observe
node: n4 | Retire and audit | 3 | 1 | Review skills on a schedule, such as every quarter. | Never removing old skills. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Three skills for one job

> **Incident:** Overlapping skills made Claude choose inconsistently.

```console
skills: deploy-service, deploy-app, release-helper
all three describe deploying to production
rollback steps differ between them
```

Each team had written its own skill. Claude chose by description and sometimes picked one with an outdated rollback step. The platform team merged them into one with an owner, tests and a deprecation note on the others.

## Common mistakes

- Duplicate skills with unclear differences
- No owner for a skill
- Skills with production access and no review
- Never removing old skills

```quiz
Q: What causes the wrong skill to trigger?
+ Overlapping descriptions
- Short names :: No.
- Good tests :: No.
- A catalog :: No.
> Descriptions guide selection.

Q: Who should review a production skill?
+ The owning team and security
- No one :: No.
- Any user :: No.
- Only the author :: No.
> Risk needs review. The lesson section above explains why.

Q: Why version skills?
+ Teams can pin a known good version
- Files get bigger :: No.
- It hides changes :: No.
- It removes tests :: No.
> Version control helps rollback.

Q: What does a catalog show?
+ Owner, description and review date
- Passwords :: No.
- Pod logs :: No.
- Cluster size :: No.
> It helps discovery. The lesson section above explains why.
```

```cards
Skill owner :: Person or team responsible for a skill
CODEOWNERS :: File that assigns reviewers by path
Catalog :: A searchable list of available skills
Deprecation :: Marking something to be retired
```
