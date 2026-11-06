---
title: Runbook automation and guardrails
minutes: 13
summary: Turn runbooks into safe automation with preconditions, dry runs, rate limits, approvals and rollback, and grow trust step by step.
---

Runbooks are the natural first automation target because the steps are already known. The danger is acting on bad information, so safe automation is mostly about checks, limits and the ability to undo.

## What you will learn

- The ladder from manual steps to auto-remediation
- Preconditions and independent signals
- Dry runs, rate limits and circuit breakers
- Logging, rollback and review

## The ladder

1. **Documented:** a clear runbook that people follow.
2. **Scripted:** a tested script a person runs.
3. **Suggested:** the system proposes the action and a person approves.
4. **Automatic:** low-risk, well-understood actions run by themselves with limits.

Only move up when the previous step has run reliably for a while.

## A guarded action

```python
import sys

def restart_unhealthy(service, state, dry_run=True):
    if not state.metrics_available():                       # do not act on missing data
        return "skip: metrics unavailable"
    unhealthy = state.unhealthy_instances(service)
    if len(unhealthy) > 0.2 * state.total(service):         # too many: likely a wider problem
        return "skip: more than 20% unhealthy, page a human"
    if state.restarts_last_hour(service) >= 3:              # rate limit
        return "skip: restart limit reached"
    for i in unhealthy[:1]:                                 # one at a time
        print("would restart" if dry_run else "restarting", i)
        if not dry_run:
            state.restart(i)
    return "ok"
```

## Guardrails

- **Preconditions** use several independent signals, never one.
- **Blast radius** limits: one instance at a time and a maximum per hour.
- **Circuit breaker:** stop automation after repeated failures.
- **Dry run** mode for testing, and **audit log** for every action.
- **Rollback** or a clear manual undo step.

Review automated actions weekly and delete the ones nobody trusts.

## Incident: The restart loop

> **Incident:** Auto-restart hit a healthy fleet when the metrics system failed.

```console
metrics: no data for 6 minutes
automation: instances unhealthy: 100%
restarted 48 of 48 instances
```

The script read missing data as failure and restarted everything, causing the outage it was meant to prevent. The team added a data-available check, a 20 percent limit, a one-at-a-time rule and a circuit breaker that pages a human.

## Common mistakes

- Acting on a single signal
- No limit on how many things change at once
- Skipping dry runs
- Automation with no audit log

```quiz
Q: What should automation check first?
+ That its input data is valid
- The time :: No.
- The colour :: No.
- The branch :: No.
> Missing data is not failure.

Q: What does a rate limit do?
+ Caps how often an action runs
- Speeds actions :: No.
- Hides logs :: No.
- Deletes data :: No.
> It limits blast radius.

Q: What is a circuit breaker?
+ It stops automation after repeated failure
- It restarts hosts :: No.
- It adds nodes :: No.
- It encrypts traffic :: No.
> A safety stop. The lesson section above explains why.

Q: What is the safest first automation step?
+ A tested script a person runs
- Fully automatic changes :: No.
- No documentation :: No.
- Random commands :: No.
> Build trust gradually.
```

```cards
Precondition :: A check that must pass before acting
Blast radius :: How much can be affected by one action
Dry run :: A mode that shows actions without doing them
Auto-remediation :: Automatic fixing of known issues
```
