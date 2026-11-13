---
title: Audit trails, kill switches and blast-radius limits
minutes: 13
summary: Put hard limits around automation: who and what acted, how to stop it instantly, and how to cap the damage a wrong decision can do.
---

Assume your automation will one day be wrong. The question is how much it can break before something stops it. Good limits turn a catastrophic mistake into a small, visible one.

## What you will learn

- What an audit record must contain
- How to design a kill switch that works during an outage
- How to cap blast radius with scope, rate and budget limits
- How to give automation least privilege

## The audit trail

Every automatic action writes an immutable record: the time, the trigger and the evidence that caused it, the exact action and parameters, the identity that performed it, the approval (who and when, if any), the verification result and the final state. Send records to a store the automation itself cannot edit. When something odd happens at 03:00, this record answers "what did the system do, and why" without guesswork. Auditors and postmortems need the same thing.

## Identity and least privilege

Automation should run under its own service identity, never a shared admin account or a person's credentials. Give each action only the permissions it needs, and scope them: restart pods in one namespace, not delete anything cluster-wide. Use short-lived credentials issued per run where you can. When the identity is narrow, even a bug or a compromised action has limited reach.

## Kill switches

A kill switch stops automation quickly and without a deploy. Build several levels: disable one action, disable everything for one service, and a global stop. A person should be able to use it from a phone in one step, and it should work even when the main platform is degraded, so keep the flag in a store that does not depend on the systems it controls. Automation must check the switch before each action, not only at startup. Test it regularly, because a switch that has never been used often does not work.

## Blast-radius limits

Limit how much any single decision can touch.

- **Scope:** one target or a small percentage of a fleet at a time.
- **Rate:** a maximum number of actions per hour per target and overall.
- **Budget:** a total allowance of risky actions per day. When it is spent, the system must ask a human.
- **Time:** a longer wait and a human check at peak traffic or during an existing incident.
- **Dependencies:** do not act on a service whose dependencies are already unhealthy.

```yaml
guardrails:
  global:
    kill_switch: flag://aiops/automation_enabled      # checked before every action
    max_actions_per_hour: 20
    freeze_windows:
      - "Fri 16:00 - Mon 07:00"
      - "2026-11-27 00:00 - 2026-11-30 23:59"
  per_service:
    max_fleet_percent_per_run: 10
    max_runs_per_hour: 3
    require_human_if:
      - active_incident: true
      - error_budget_remaining_below: 0.1
identity:
  service_account: aiops-remediator
  permissions: ["pods:delete:namespace=prod-api", "deployments:scale:max=2x"]
  credentials: short_lived_per_run
audit:
  sink: append-only-store
  fields: [time, trigger, evidence, action, params, identity, approver, verification, outcome]
```

This defines a global switch, a freeze window, fleet percentage limits, a human-approval rule during incidents, a narrow identity and a fixed set of audit fields.

## Review and expire

Review the audit log monthly: which actions ran most, which failed, which were overridden by humans. Remove permissions and actions nobody uses. Automation that nobody remembers is a quiet source of risk.

## Plan for the dark case

Decide ahead what happens if the automation itself fails or is disabled: runbooks must still work manually, and alerts must still reach people. Never let the pager depend on the thing it pages about.

```diagram
title: Layers that contain a wrong decision
node: dec | Automated decision | 0 | 1 | A detector or assistant proposes an action. | Trusted without limits. | service
node: kill | Kill switch | 1 | 0 | Off switch in an independent store. | Never tested, so it fails when needed. | security
node: lim | Scope and rate limits | 1 | 1 | Small percentage, few runs, daily budget. | Limits set high to avoid pages. | security
node: id | Least privilege | 1 | 2 | Narrow, short-lived service identity. | A shared admin account. | security
node: act | Action | 2 | 1 | Runs only if every layer allows it. | One layer assumed to be enough. | process
node: log | Audit trail | 3 | 1 | Immutable record of what, why and who. | Records the automation can edit. | store
edge: dec | kill
edge: dec | lim
edge: dec | id
edge: kill | act
edge: lim | act
edge: id | act
edge: act | log
```

## Incident: The switch that was not wired

> **Incident:** An automation began rolling back healthy deploys. An engineer reached for the kill switch and nothing changed.

```console
$ aiopsctl status
automation_enabled flag: false  (set 11:42)
last action: rollback checkout 11:47
reason: worker reads the flag only at startup
(this is a simulated illustration, not a real incident)
```

The switch was set but the worker cached it at startup and never read it again, so it kept acting. The team made every action check the flag first, added a weekly test that flips the switch and confirms actions stop, and added a global limit of 20 actions an hour.

## Common mistakes

- A kill switch that is checked only at startup
- Automation running with an admin identity
- Audit records the automation can modify
- No cap on actions per hour
- Never testing the stop path

```quiz
Q: What must an audit record explain?
+ What acted, why, with whose approval and with what result
- Only the time :: Not enough.
- The model weights :: Not the point.
- The team's mood :: Irrelevant.
> It should let someone reconstruct the decision afterwards.

Q: Why use a narrow service identity for automation?
+ A bug or compromise can then reach very little
- It speeds up actions :: Not the aim.
- It removes logging :: Unrelated.
- It avoids approvals :: Unrelated.
> Least privilege limits the damage.

Q: When must a kill switch be checked?
+ Before every action
- Only at startup :: Stale.
- Once a day :: Too rare.
- Never, it is advisory :: Useless.
> A cached switch can fail to stop a running system.

Q: What does a daily budget of risky actions do?
+ Forces a human decision after the allowance is used
- Increases speed :: No.
- Replaces the audit log :: No.
- Removes limits :: Opposite.
> It caps how much a wrong pattern can do in a day.
```

```cards
Audit trail :: An immutable record of what automation did and why
Kill switch :: A control that stops automation immediately
Blast radius :: How much can be affected by one action or failure
Least privilege :: Giving only the permissions an action needs
Freeze window :: A period in which automatic changes are not allowed
```
