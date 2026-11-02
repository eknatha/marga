---
title: Release management, environments and feature flags
minutes: 14
summary: Separate deploying from releasing with feature flags, design environments and approvals that fit your risk, and manage flags, versions and rollbacks without chaos.
---

Early pipelines treat a release as one event: the code is deployed and users see it. Mature teams separate the two. They deploy code often and in small pieces, and they release a feature to users later, gradually, and with a switch that can turn it off in seconds. This reduces fear, shortens lead time and makes rollbacks boring.

## What you will learn

- The difference between deploying and releasing
- Types of feature flags and their lifecycle
- Environments, approvals and promotion
- Progressive delivery: percentages, rings and kill switches
- Flag debt and how to avoid it

## Deploy is not release

Deploying puts a new version on servers. Releasing makes a behaviour visible to users. With a flag, you can deploy code with the feature switched off, test it in production with staff, enable it for 1 percent of users, then 10 percent, then all. If something is wrong, you turn the flag off; no redeploy and no rollback of unrelated changes.

```python
if flags.enabled("new-checkout", user=user.id, default=False):
    return new_checkout(cart)
return old_checkout(cart)
```

The `default=False` matters: if the flag service is down, the code must fall back to a safe behaviour, not fail.

## Kinds of flags

| Kind | Purpose | Lifetime |
|------|---------|----------|
| Release flag | Hide unfinished or risky work | Days to weeks, then delete |
| Experiment flag | Compare variants | Until the result is known |
| Operational flag (kill switch) | Turn off an expensive or risky path in an incident | Long |
| Permission flag | Enable for a plan or customer | Long, part of the product |

Each flag needs an owner, a purpose and a removal date. Old release flags leave dead code and untested combinations, which is called flag debt. Review flags regularly and delete them.

## Environments and promotion

Keep environments few and similar: development, staging (production-like), production. Promote the same built artifact through them, and change only configuration. Do not rebuild for each environment. Approvals should match risk: automatic for low-risk changes with good tests; a human check for changes to payments or data schemas. Record who approved what, and when.

## Progressive delivery

- **Canary:** send a small share of traffic to the new version and watch error rate and latency.
- **Rings:** release to internal users, then a small group, then everyone.
- **Automatic rollback:** if a metric crosses a threshold during rollout, the system stops or reverts without a human.
- **Percentage rollouts by stable hash:** hash the user id, so a user keeps the same experience.

## Versions and rollbacks

Use semantic versions or build ids that map exactly to a commit. Keep the previous version ready, and make database changes backwards compatible (add a column first, switch code, remove the old column later) so a rollback of code is always possible.

```predict
Q: A release changes a database column name and the code at the same time. Why does a rollback fail?
???
The old code expects the old column name, which no longer exists, so rolling back the code breaks it.
> Use an expand and contract approach: add the new column, write to both, switch reads, and remove the old column in a later release.
```

## Incident: the feature that could not be switched off

> **Incident:** A new pricing calculation shows wrong totals to 30 percent of customers after a release, and turning it off takes two hours.

```console
$ flagctl list --stale
new-pricing       owner: pay-team   created: 2026-02-10   100% on
legacy-discount   owner: (none)     created: 2024-06-01   100% on
```

The change shipped without a flag, so the only remedy was a rollback that also removed other fixes. Afterwards the team required a flag for risky behaviour changes, added a kill switch for pricing, ran a canary with an automatic abort on error rate, and set a monthly flag clean-up.

## Common mistakes

- No safe default when the flag service fails
- Flags without owners or removal dates
- Rebuilding the artifact for each environment
- Database changes that block rollback

```quiz
Q: What is the main benefit of separating deploy from release?
+ Features can be switched on gradually and off quickly without a redeploy
- Builds become faster :: Build time is unchanged.
- Fewer tests are needed :: Tests are still needed.
- Servers cost less :: Not directly.
> Risk is controlled by the flag, not by the deploy.

Q: What should code do if the flag service is unreachable?
- Crash :: That turns a flag outage into an outage.
+ Use a safe default
- Enable every feature :: Unsafe.
- Wait forever :: It blocks requests.
> Defaults keep the application working.

Q: What is flag debt?
+ Old flags that remain in code, leaving dead branches and untested combinations
- A billing term :: Not in this meaning.
- A flag with a long name :: Unrelated.
- Unpaid licence fees :: Unrelated.
> Remove release flags after the rollout.

Q: How do you keep database changes compatible with a rollback?
- Rename columns in place :: It breaks old code.
+ Expand, migrate and contract in separate releases
- Delete old columns first :: It breaks old code.
- Avoid backups :: Unrelated.
> Both versions of the code must work with the schema at each step.
```

```cards
Deploy versus release? :: Deploy: code on servers. Release: users see it
What is a kill switch? :: An operational flag that turns off a risky path
What must every flag have? :: An owner, a purpose and a removal date
What is a canary? :: A small share of traffic on the new version
Safe schema change pattern? :: Expand, migrate, contract
```
