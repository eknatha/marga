---
title: Writing skills for runbooks and operations
minutes: 12
summary: Turn operational procedures into skills that guide Claude through checks in a safe order, with scripts, stop points and clear scope.
---

Runbooks are procedures people forget under stress. A skill puts the procedure where Claude can follow it consistently, with the exact commands your team trusts. The craft is making it specific and safe.

## What you will learn

- Structuring a skill around an operational procedure
- Writing exact, read-only checks first
- Marking stop points for human approval
- Capturing findings for the record

## A runbook skill

```markdown
---
name: triage-api-latency
description: Use when an API service has high latency or error rates and you need a safe first-response triage in Kubernetes. Do not use for database-only problems.
---

# Triage API latency

Follow these steps in order. Run read-only commands only.

1. Confirm scope: which service, which environment, since when.
2. Check recent changes: `kubectl rollout history deploy/<name> -n <ns>`.
3. Check saturation: `kubectl top pod -n <ns>` and node pressure.
4. Check errors: run `scripts/error_rate.sh <service>`.
5. Summarize findings with evidence before proposing any change.

## Stop points
Ask the user for approval before any restart, scale, rollback or config change.
```

The **description** tells Claude when to load it, so name the situation and what is out of scope. The body is the ordered procedure.

## Scripts and references

Put repeatable queries in `scripts/` so results are consistent, and put long reference material such as service maps in `references/`, loaded only when needed. Make scripts read-only by default and print clear output with the commands they ran.

## Safety

List what the skill must never do without approval: restarts, deletes, data changes and production access. Avoid embedding secrets, and describe where credentials come from. State what to record: the commands run, outputs and conclusions, so the user can paste them into an incident ticket.

## Test it

Try it on a known past incident and check that Claude follows the order, uses the scripts and stops at approvals. Improve the description if it does not trigger in the right situations.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Writing skills for runbooks and operations fits together
node: n1 | A runbook skill | 0 | 0 | . | Skills that mix diagnosis and changes without a stop. | process
node: n2 | Stop points | 1 | 1 | Ask the user for approval before any restart, scale, rollback or config change. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n3 | Scripts and references | 2 | 0 | Put repeatable queries in scripts/ so results are consistent, and put long reference material such as service maps in references/, loaded only when needed. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | Safety | 3 | 1 | List what the skill must never do without approval: restarts, deletes, data changes and production access. | Putting secrets in the skill. | process
node: n5 | Test it | 4 | 0 | Try it on a known past incident and check that Claude follows the order, uses the scripts and stops at approvals. | Vague descriptions that trigger in the wrong cases. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: The skill that restarted a service

> **Incident:** A vague skill told Claude to fix problems and it restarted a production service.

```console
Step: "fix the failing pods"
$ kubectl rollout restart deploy/api -n prod
users saw 30 seconds of errors
```

The skill said to fix issues without separating diagnosis from action. The author rewrote it with read-only checks first, an explicit stop before any change and a requirement to show evidence for each proposed action.

## Common mistakes

- Skills that mix diagnosis and changes without a stop
- Vague descriptions that trigger in the wrong cases
- Putting secrets in the skill
- Not testing against a real incident

```quiz
Q: What belongs before any change in an ops skill?
+ Read-only checks
- A restart :: No.
- A delete :: No.
- A deploy :: No.
> Diagnose first. The lesson section above explains why.

Q: What does the description do?
+ Tells Claude when to use the skill
- Stores secrets :: No.
- Runs scripts :: No.
- Creates pods :: No.
> It drives triggering.

Q: What should be a stop point?
+ Restart, rollback or config change
- Reading logs :: No.
- Listing pods :: No.
- Printing help :: No.
> Risky actions need approval.

Q: Where do repeatable queries go?
+ Scripts in the skill
- Chat history :: No.
- Environment variables :: No.
- Git tags :: No.
> Scripts give consistent output.
```

```cards
Description :: Text that tells Claude when to use a skill
Stop point :: A step requiring human approval
Read-only check :: A command that does not change state
Evidence :: Command output that supports a conclusion
```
