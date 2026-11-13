---
title: Remediation patterns and approval tiers
minutes: 14
summary: Catalogue the safe automatic fixes (restart, scale, roll back, fail over), sort them into approval tiers by risk, and write each as a small, bounded, reversible action.
---

Automated remediation is where AIOps stops advising and starts acting, which is why it deserves the most care. The way to do it safely is not to avoid action but to classify actions by risk and match the approval to the risk.

## What you will learn

- The common remediation patterns and when each fits
- How to assign approval tiers by blast radius and reversibility
- How to write an action as a bounded, idempotent, reversible unit
- Why every action needs preconditions and a rate limit

## Common patterns

**Restart** a crashed or wedged process or pod. **Scale out** when saturation is the cause. **Roll back** a deploy or flag after a regression. **Fail over** to a replica or another region. **Clear** a full temp directory or rotate logs. **Rotate** a credential or certificate. **Drain** a bad node. Each has a typical trigger and a typical way to go wrong: restarting hides a leak, scaling out amplifies a database bottleneck, rolling back drops a needed migration.

## Approval tiers

Sort actions by two questions: how much can it affect, and can it be undone cleanly?

- **Tier 0, read only.** Gather evidence, open a ticket, post a summary. Always automatic.
- **Tier 1, low risk and reversible.** Restart one pod, scale a stateless service within a cap. Automatic with logging.
- **Tier 2, moderate.** Roll back a deploy, drain a node, fail over a replica. Needs a human approval click, with the evidence shown.
- **Tier 3, high risk.** Anything touching data, the whole fleet, or a customer-visible region. Human performs it, optionally guided by a runbook.

Tiers should be written down, reviewed and stored beside the action, not decided in someone's head during an incident.

## Anatomy of a safe action

Every action needs a name, an owner, **preconditions** (the checks that must be true before it runs), a **bounded scope** (one pod, not the deployment), a **timeout**, a **rate limit** and a **rollback or undo**. It must be **idempotent**: running it twice has the same effect as running it once. It must also refuse to run when the system state is not what it expected.

```yaml
action: restart-pod
owner: platform-team
tier: 1
trigger:
  alert: PodCrashLooping
  min_duration: 10m
preconditions:
  - target.restarts_last_hour >= 3
  - service.healthy_replicas >= 2        # never restart the last healthy pod
  - no_active_deploy: true
scope:
  max_pods_per_run: 1
  max_runs_per_hour: 3
  environments: [production, staging]
timeout: 120s
verify:
  - pod.ready within 90s
  - error_ratio < 0.02 for 5m
on_failure: page_oncall
```

The action refuses to act when it would remove the last healthy replica or during a deploy, caps how often it can run, and ends in a human page when verification fails.

## Rate limits and circuit breakers

A looping automation can do more damage than the fault. Cap runs per hour and per target. If the same action fires repeatedly for the same target, stop and escalate: repeated restarts are a symptom, not a cure. Add a global breaker that disables all automatic actions if too many run within a short window.

## Start with suggestions

Introduce each action in stages: first only log what it would do, then show it as a suggested button, then run it automatically for a small set of services, and finally widen. Track outcomes at each stage.

```diagram
title: Choosing how much autonomy an action gets
node: trig | Trigger | 0 | 1 | An alert or a detector finding. | Acting on a single noisy signal. | observe
node: pre | Preconditions | 1 | 1 | Checks that must hold before acting. | Skipping the check for the last healthy replica. | security
node: tier | Approval tier | 2 | 1 | 0 read, 1 auto, 2 human click, 3 human does it. | Tiers decided during the incident. | process
node: act | Bounded action | 3 | 0 | One target, timeout, rate limit, idempotent. | Scope set to the whole deployment. | service
node: human | Human approval | 3 | 2 | Evidence shown, one click to proceed. | Approving without reading. | external
node: ver | Verify | 4 | 1 | Did the symptom clear? Roll back if not. | No verification, so failure is silent. | observe
edge: trig | pre
edge: pre | tier
edge: tier | act
edge: tier | human
edge: act | ver
edge: human | ver
```

## Incident: The restart loop

> **Incident:** An auto-restart rule kept a leaking service alive for weeks and then restarted every pod at once during a traffic peak.

```console
$ autoremediate history --action restart-pod --days 14
service   runs  distinct-targets  peak-per-hour
api       212   12               41
(this is a simulated illustration, not a real incident)
```

The rule had no rate limit or precondition. When memory leaked faster than usual, it restarted all twelve pods within minutes. The team added a cap of three runs per hour, a minimum of two healthy replicas, and an alert whenever a service needs more than five automatic restarts a day.

## Common mistakes

- No preconditions or scope limits
- Actions that are not idempotent
- Approval tiers decided at the moment of the incident
- No rate limit or circuit breaker
- Automating before logging what it would do

```quiz
Q: How should approval be chosen for an action?
+ By its blast radius and how cleanly it can be undone
- By how new the tool is :: Not a risk factor.
- By who wrote it :: Not a risk factor.
- By how often it runs :: Frequency alone is not risk.
> High reach and hard reversal need a human.

Q: What does idempotent mean for an action?
+ Running it twice has the same effect as once
- It runs only once ever :: Not the meaning.
- It cannot be rolled back :: Unrelated.
- It runs faster :: Unrelated.
> Safe retries need idempotence.

Q: Why add a precondition on healthy replicas?
+ So the action never removes the last healthy instance
- To speed up restarts :: Not the aim.
- To skip logging :: Unrelated.
- To avoid approvals :: Unrelated.
> Preconditions stop an action making things worse.

Q: What should happen when the same action keeps firing for one target?
+ Stop and escalate, because it is a symptom
- Run it faster :: Makes it worse.
- Hide the alert :: Hides the problem.
- Raise the rate limit :: Removes the guard.
> Repeated automatic fixes mean the cause is still there.
```

```cards
Remediation :: An action taken to fix a fault, by a person or automatically
Approval tier :: A level of autonomy matched to the action's risk
Precondition :: A check that must pass before an action runs
Idempotent :: Safe to run repeatedly with the same result
Circuit breaker :: A switch that stops automation when it misbehaves
```
