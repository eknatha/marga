---
title: Team workflows: branching strategies, pull requests and reviews
minutes: 14
summary: Choose a branching strategy, run small reviewed pull requests, and protect main with required checks.
---

Git does not tell you how a team should work. Without agreed rules, five people push to main in five styles, reviews are rare, and releases are tense. A workflow is a small set of rules about branches, reviews and merges. The best ones are boring: short branches, small changes, automatic checks, and a main branch that is always releasable.

## What you will learn

- Compare trunk-based development, feature branches and release branches
- Write pull requests that are easy to review
- Protect main with required reviews and status checks
- Use CODEOWNERS and clear commit messages

## Three common strategies

**Trunk-based development**: everyone merges small changes to `main` at least daily, often behind feature flags. It needs good tests and a fast pipeline, and gives the least merge pain. **Feature branches** (a simple flow that works with any hosting): one short branch per change, reviewed through a pull request, then merged to `main` and deployed. **Release branches** (as in Gitflow): long-lived `develop` and `release/*` branches, useful when you must support several released versions at once, but slower and more complex. For web services and infrastructure code, trunk-based or short feature branches usually fit best; for installed software with several supported versions, release branches earn their cost.

## A pull request people can review

A pull request (also called a merge request) proposes merging one branch into another and is the place for discussion, review and automated checks. Good habits:

- Keep it small: a few hundred changed lines at most. Large changes get skimmed, not reviewed.
- Write what and why in the description, how you tested it, and link the ticket.
- Separate refactoring from behaviour changes.
- Answer comments with a commit or an explanation, and re-request review.

Reviewers should read for correctness, safety (what happens when this fails?), clarity and tests, and say which comments are blocking and which are suggestions. For infrastructure code, attach the plan output, because the diff of code does not show what will be created or destroyed.

## Protect the main branch

Hosting platforms let you set rules on `main` that nobody can bypass by accident:

```text
Require a pull request before merging
Require at least 1 approving review (2 for production config)
Require status checks: lint, unit tests, security scan
Require branches to be up to date before merging
Block force pushes and branch deletion
Require signed commits (optional)
```

The checks must run on the pull request, and the merge button stays disabled until they pass. A `CODEOWNERS` file maps paths to teams, so a change under `deploy/prod/` automatically requests review from the platform team:

```text
/deploy/prod/   @acme/platform-team
*.tf            @acme/infra-reviewers
```

## Commit and merge conventions

Pick one merge style (squash, rebase or merge commit) and use it consistently. Many teams adopt a message convention such as `type(scope): summary` (for example `fix(backup): retry on timeout`), because tools can then build changelogs and decide version numbers. Keep the first line under about 72 characters. The point of all these rules is the same: history that a stranger can read at 03:00 during an incident.

```predict
Q: A pull request changes 2,400 lines across 40 files. What is the practical problem and the usual remedy?
???
Reviewers cannot review it properly. Split it into smaller pull requests, separating refactoring from behaviour changes.
> Review quality falls quickly as size grows.
```

## Incident: The unreviewed hotfix

> **Incident:** A late-night fix was pushed straight to main because the rule was only a convention.

```console
$ git log --oneline -3 main
7fa90cd Hotfix: raise db pool size
$ git log -1 --format=%an,%cd 7fa90cd
sam, Thu Jan 5 23:48
$ curl -s https://shop.example.com/health
{"db":"error: too many connections"}
```

The fix raised the connection pool beyond what the database allowed and took the service down at the next restart. Nobody had reviewed it because direct pushes to main were possible. After the incident the team enabled branch protection with required review and checks, and added an expedited path: a pull request that needs one reviewer and runs the fast checks, so an urgent fix is still reviewed.

## Common mistakes

- Allowing direct pushes to main
- Huge pull requests
- Required checks that are flaky, so people bypass them
- Long-lived branches with unclear owners

```quiz
Q: What does trunk-based development ask of the team?
+ Small changes merged to main frequently, supported by tests and a fast pipeline
- Long-lived branches per person :: That is the opposite.
- No tests at all :: It needs strong tests.
- Only releases once a year :: It is about frequent integration.
> Frequent integration reduces merge pain.

Q: What is a pull request for?
+ Proposing a merge and holding review, discussion and automated checks
- Downloading a repository :: That is clone.
- Deleting old commits :: That is not its job.
- Creating a tag :: Not its purpose.
> It is the quality gate before main.

Q: What does CODEOWNERS do?
+ Maps paths to the people or teams who must review changes
- Encrypts files :: It does not.
- Stores passwords :: It does not.
- Speeds up clone :: It does not.
> Automatic review requests for sensitive paths.

Q: Which setting prevents history loss on main?
+ Blocking force pushes and branch deletion
- A longer commit message :: Not related.
- More branches :: Not related.
- A bigger repository :: Not related.
> Protect the shared branch.
```

```cards
Trunk-based :: small frequent merges to main
Feature branch :: short branch plus pull request
Release branches :: support several versions
Protect main :: required review, checks, no force push
Path ownership :: CODEOWNERS
PR size :: small, one purpose
```
