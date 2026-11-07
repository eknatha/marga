---
title: Safe automation and auto-remediation
minutes: 15
summary: Automate routine fixes with limits, approvals and rollbacks, so automation reduces toil without becoming the cause of the next outage.
---

Many incidents end with the same few commands: restart a service, clear a disk, scale up, fail over. Automating them saves time and sleep. But automation acts fast and at scale, so a wrong rule can make an incident bigger in seconds. This lesson covers how to start small, add limits and keep humans in control until the evidence says otherwise.

## What you will learn

- Choose which fixes are safe to automate
- Add limits, cooldowns and approvals
- Design for rollback and visibility
- Measure whether automation helps

## Pick the right candidates

Good candidates are frequent, well understood, low risk and easy to verify: restarting a known stuck worker, rotating a log, clearing a cache. Poor candidates are rare, high impact or poorly understood, such as database failover or deleting data. Start from your runbooks and incident history.

## Verify before you act

Before the action, check the condition again: is the alert still firing, is the target the right one, is a change in progress? After the action, check that the problem is solved. If it is not, stop and escalate to a person instead of trying again and again.

## Limits that contain mistakes

Set a maximum number of actions per hour, a cooldown between actions, a cap on how many targets at once and a blast radius rule such as never more than ten percent of a fleet. A global kill switch stops every automation in one step.

## Approval levels

Introduce automation in stages: suggest the action, then run it with one-click approval, then run it unattended for the safest cases. Move up a level only after a run of correct decisions, and always keep the audit log.

## Visibility and rollback

Every automated action writes who or what did it, why, what it changed and how to undo it, in the incident channel and the audit log. Prefer actions that can be reversed. For those that cannot, require approval.

## A remediation rule with limits

```yaml
name: restart-stuck-worker
trigger:
  alert: WorkerQueueStalled
  for: 10m
preconditions:
  - alert_still_firing: true
  - no_active_deploy: true
  - target_count_max: 2
action:
  run: kubectl rollout restart deployment/worker -n jobs
limits:
  max_per_hour: 2
  cooldown: 30m
  kill_switch: automation/global
verify:
  after: 5m
  expect: queue_depth < 100
on_verify_fail: page_human
```

The rule only acts if the alert is still active and no deployment is running. It is limited to two restarts an hour and escalates to a person if the queue does not recover.

## How it fails

A rule has no cooldown and loops. It acts on the wrong environment. It hides a recurring problem because it always fixes the symptom. A kill switch does not exist. Nobody reviews what the automation did.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Safe automation and auto-remediation fits together
node: n1 | Pick the right candidates | 0 | 0 | Good candidates are frequent, well understood, low risk and easy to verify: restarting a known stuck worker, rotating a log, clearing a cache. | Automating rare, risky actions first. | process
node: n2 | Verify before you act | 1 | 1 | Before the action, check the condition again: is the alert still firing, is the target the right one, is a change in progress? | No verification after the action. | observe
node: n3 | Limits that contain mistakes | 2 | 0 | Set a maximum number of actions per hour, a cooldown between actions, a cap on how many targets at once and a blast radius rule such as never more than ten percent of a... | No cooldown or action limits. | process
node: n4 | Approval levels | 3 | 1 | Introduce automation in stages: suggest the action, then run it with one-click approval, then run it unattended for the safest cases. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | Visibility and rollback | 4 | 0 | Every automated action writes who or what did it, why, what it changed and how to undo it, in the incident channel and the audit log. | For those that cannot, require approval. | process
node: n6 | A remediation rule with limits | 5 | 1 | The rule only acts if the alert is still active and no deployment is running. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: The cleanup that deleted too much

> **Incident:** An automation was meant to delete old temporary files when a disk filled. A path variable was empty, so the command ran against a much larger directory, and it deleted data that other services needed.

```console
$ remediate run cleanup-tmp --dry-run
target path: ""   (EMPTY)
resolved delete scope: /var/data/*
result: ABORT, target path empty
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A dry run, a check that the target is not empty and a rule that deletes only inside a named directory would have stopped the action before it did any harm.

## Interview question

"What would you automate first on-call?" Frequent, low-risk, easily verified fixes, with preconditions, limits, a verify step, an audit log, a kill switch and a path from suggestion to approval to unattended mode.

## Common mistakes

- Automating rare, risky actions first
- No cooldown or action limits
- No verification after the action
- Hiding recurring faults instead of fixing them

```quiz
Q: Which fix is a good first candidate for automation?
+ Restarting a known stuck worker
- Deleting a production database :: Far too risky.
- Changing network design :: Too large.
- Failing over a primary database :: High impact, rare.
> Correct: Restarting a known stuck worker. Re-read the matching lesson section for the full reasoning.

Q: Why add a cooldown?
+ To stop the same action repeating in a loop
- To make it faster :: It slows repetition.
- To save disk :: Not the reason.
- To hide logs :: Not the reason.
> Correct: To stop the same action repeating in a loop. Re-read the matching lesson section for the full reasoning.

Q: What should happen if verification fails?
+ Stop and escalate to a person
- Repeat forever :: Dangerous.
- Delete the alert :: Hides the problem.
- Ignore it :: Leaves the fault.
> Correct: Stop and escalate to a person. Re-read the matching lesson section for the full reasoning.

Q: Why keep an audit log of automated actions?
+ People can see what was done, why and how to undo it
- It makes actions faster :: Not the reason.
- It replaces monitoring :: It does not.
- It removes approvals :: It does not.
> Correct: People can see what was done, why and how to undo it. Re-read the matching lesson section for the full reasoning.
```

```cards
auto-remediation :: automatic fix for a known fault
cooldown :: minimum wait between repeated actions
kill switch :: one control that stops all automation
dry run :: a rehearsal that shows what an action would do
```
