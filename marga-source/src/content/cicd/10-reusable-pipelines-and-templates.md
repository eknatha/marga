---
title: Reusable pipelines and templates
minutes: 11
summary: Stop copying pipeline files between repositories: share steps as templates, version them, and keep teams consistent without blocking them.
---

Forty services each have their own copy of a build pipeline. When the security team needs a new scan step, forty files have to change, and thirty-one of them differ slightly. Reusable pipelines solve this the same way libraries solve repeated code: write once, version, and let teams call it.

## What you will learn

- Why copy and paste pipelines drift and hurt
- Shared templates and reusable workflows with inputs
- Versioning shared pipeline code so changes are safe
- Guard rails: what to enforce centrally and what to leave to teams

## The cost of copied pipelines

Copying a pipeline looks free on day one. Over time the copies diverge: one service pins a tool version, another does not, a third skips the scan "temporarily" and never turns it back on. When a fix is needed, you must find every copy, and each one needs its own review. Inconsistent pipelines also make audits hard, because you cannot say "all services run a vulnerability scan" with confidence.

## Templates with inputs

Most CI systems let one pipeline include another and pass inputs. The details differ, but the shape is the same: a central definition, and a short file in each service that says what to build.

```yaml
# in the service repository
include: shared/pipelines/build-and-test.yml@v3
variables:
  LANGUAGE: python
  PYTHON_VERSION: "3.12"
  DEPLOY_TARGET: staging
```

The shared template contains the steps: checkout, cache, build, test, scan, publish. Inputs let a team choose the language or the target, but they cannot remove the scan step. Keep inputs few and typed. A template with forty options is a configuration language nobody can read.

## Version the shared code

A change to a shared pipeline affects every user at once, so treat it like a library release. Tag versions (`v3`, `v3.2.1`), publish release notes, and let teams pin a major version. Test the template itself on a sample project before you tag it. Roll out breaking changes as a new major version, and give teams time and a migration note to move.

A safe pattern is *canary then fleet*: move two or three friendly services to the new version, watch their runs for a week, and then update the default.

## Guard rails, not handcuffs

Decide what must be the same everywhere: the security scan, artifact signing, the rule that production deploys need a reviewed commit on the main branch, and the audit log. Make those parts of the template, or enforce them with a required check on every repository.

Leave the rest to teams: extra test stages, extra environments, and tools specific to their language. If teams must fight the template to do their job, they will fork it, and you are back to copies. Measure adoption, for example the share of pipelines on the current version, and treat it as a service you run for the other teams.

```predict
Q: A shared template adds a new mandatory scan, and 12 pipelines fail on their next run. How could the rollout have been safer?
???
Release it as a new version, test on a few canary services, report findings without failing for a trial period, then make it required with notice.
> Shared changes need versioning, canaries and a soft launch.
```

## Incident: One edit, forty broken builds

> **Incident:** A platform engineer renamed a variable in the shared template. Within an hour, forty services could not deploy.

```console
$ ci run --pipeline checkout --branch main
error: variable DEPLOY_ENV is not defined (template build-and-test.yml@main)
$ grep -c "@main" services/*/ci.yml | grep -v ":0" | wc -l
40
```

Every service referred to the template by the moving name `main`, so the change reached all of them immediately. The fix was to revert the rename and to require version tags in `include` lines, with a lint check that rejects `@main`. Breaking changes now go out as a new major version, and a weekly report shows how many pipelines still use each version.

## Common mistakes

- Referring to a template by a moving branch name
- Giving the template dozens of options
- Making every team copy the file because the shared one is hard to change
- Enforcing nothing centrally, so the scan quietly disappears from some services

```quiz
Q: Why pin a shared pipeline to a version?
+ A change in the template then reaches a service only when the team moves to the new version
- It makes the pipeline faster :: Speed is not affected.
- It hides the template :: The template stays visible.
- It removes the need for tests :: It does not.
> Moving names change under you.

Q: Which parts are good candidates for central enforcement?
+ Security scans, artifact signing and production approval rules
- The text of commit messages :: That is a team habit.
- Which editor developers use :: Not a pipeline concern.
- Test names :: Teams decide these.
> Enforce what the organization must guarantee.

Q: What is a sign that a template has too many options?
+ Teams cannot tell what a build will do without reading the template
- It has a README :: Documentation is good.
- It has a version tag :: Versions are good.
- It runs tests :: That is its job.
> Keep inputs few and clear.

Q: What is a safe way to roll out a breaking template change?
+ Publish a new major version and move a few services first
- Edit main and watch what breaks :: This is how forty builds fail.
- Email everyone to copy the file :: That recreates copies.
- Disable the old pipeline for a week :: Teams are blocked.
> Canary, then fleet.
```

```cards
Why templates :: change one place, fix every pipeline
Pin shared pipelines to :: a version tag, never a moving branch
Central guard rails :: scan, signing, approval, audit
Few typed inputs :: easier to read and support
Adoption metric :: share of pipelines on the current version
```
