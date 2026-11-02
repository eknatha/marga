---
title: Incident response
minutes: 16
summary: Run incidents with clear roles, severity levels and communication, mitigate first and diagnose second, and hand over cleanly.
---

At 03:12 an alert fires. The next hour decides how much a problem costs. Teams that handle incidents well are not smarter than others. They rehearsed a process so nobody has to invent one under stress.

## What you will learn

- Incident roles and who does what
- Severity levels
- The sequence: detect, triage, mitigate, resolve
- Communication during an incident

## Roles

On anything beyond a trivial incident, split the work so one person is not debugging, deciding and answering questions at once.

| Role | Responsibility |
|------|---------------|
| **Incident commander (IC)** | Runs the response, makes decisions, assigns work. Does *not* debug |
| **Operations lead** | Investigates and applies changes to the systems |
| **Communications lead** | Posts updates to stakeholders and customers on a fixed rhythm |
| **Scribe** | Records a timeline of what was seen and done, with timestamps |

For small incidents one person may hold several roles, but the IC role should still be explicit: "I am IC." If the IC begins digging into the problem, they should hand command to someone else first.

## Severity

Define levels in advance so nobody argues during the incident. An example scheme:

| Level | Impact | Response |
|-------|--------|----------|
| **SEV1** | Major outage or data loss; most users affected | Page everyone needed, all hands, updates every 15-30 minutes |
| **SEV2** | Significant degradation; some users or a key feature affected | Page on-call, updates every 30-60 minutes |
| **SEV3** | Minor impact; workaround exists | Handle in working hours |

When in doubt, declare the higher level. It is cheap to downgrade and expensive to escalate late.

## The sequence

1. **Detect.** An alert, a customer report or a colleague. Acknowledge it so others know someone owns it.
2. **Triage.** How bad is it, who is affected, is it getting worse? Assign severity and open a dedicated channel.
3. **Mitigate.** **Stop the harm first.** Roll back, fail over, disable a feature flag, shift traffic, scale up. Do not wait for the root cause.
4. **Diagnose.** Once users are no longer hurt, find out why, working from evidence.
5. **Resolve.** Confirm the metrics recovered and stayed recovered.
6. **Follow up.** Schedule the postmortem and track the actions.

> **Tip:** Ask early: "What changed?" Most incidents trace back to a recent deployment, configuration change, dependency, or traffic pattern. Checking the deployment log and change calendar first finds many causes in minutes.

Here is what that first check looks like in practice on a Kubernetes service:

```console
$ kubectl rollout history deployment/shop-api -n shop | tail -3
$ kubectl get events -n shop --sort-by=.lastTimestamp | tail -8
$ kubectl get deploy shop-api -n shop -o jsonpath='{.metadata.annotations.deployment\.kubernetes\.io/revision}'
```

If the newest revision was rolled out minutes before the alert fired, that is your first suspect, and `kubectl rollout undo deployment/shop-api -n shop` is the mitigation.

Prefer mitigations that are **reversible, well understood and fast**. A rollback to a known good version beats a clever hot fix written at 3 a.m.

## Communication

- Use **one channel** for the incident and keep debate out of the status updates.
- Post updates on a **schedule**, even when the update is "no change, still investigating, next update at 03:45".
- State **impact, status and next step**: facts, not guesses.
- Keep a running **timeline** with timestamps for the postmortem.

A good update:

```text
03:30 UTC - SEV2 - Checkout errors
Impact: about 15% of checkout attempts fail with an error page.
Status: Cause identified as release 3.2.0. Rollback in progress.
Next update: 03:45 UTC or sooner if status changes.
```

## Handover and fatigue

Long incidents need fresh people. Hand over explicitly with a summary: what is broken, what has been tried, current theory, who is doing what. Rotate the IC after a few hours, and make sure people eat and rest. Tired people make mistakes that turn a bad night into a worse one.

## Incident: two people fix the same thing differently

> **Incident:** Checkout is failing. One engineer rolls back the release. Another, unaware, scales the database up. A third restarts the API Pods. Errors continue, and nobody can tell which action helped or hurt.

Uncoordinated changes destroy your ability to learn what worked and can make things worse. The first action of a good IC is to establish control:

```text
IC: I'm taking command of this incident. Freeze all changes unless I approve them.
IC: Ops lead is Dana. Dana, you make changes to production. Everyone else reports findings to the scribe.
IC: Hypothesis: release 3.2.0. Dana, roll back now. We will watch error rate for 5 minutes.
```

One change at a time, announced before it is made, with a metric to watch afterwards. The rollback restores service within four minutes, and because only one change was made, the cause is clear. The other changes (the database scale-up) are queued for review rather than left in place without understanding.

```diagram
title: The shape of an incident
node: det | Detect | 0 | 1 | An alert or a customer report starts the incident. | A slow detection means longer impact.
node: tri | Triage and declare | 1 | 1 | Set severity, name an incident lead and open a channel. | Without a lead everyone investigates and nobody decides.
node: mit | Mitigate | 2 | 0 | Restore service first: rollback, failover or disable a feature. | Digging for root cause first prolongs the outage.
node: com | Communicate | 2 | 2 | Regular updates to stakeholders and a status page. | Silence creates extra interruptions.
node: rev | Review | 3 | 1 | A blameless review with action items and owners. | Without follow-up the same incident returns.
edge: det | tri
edge: tri | mit
edge: tri | com
edge: mit | rev
edge: com | rev
```

## Common mistakes

- Debugging before mitigating
- Several people changing production at once
- Silence: no updates for stakeholders
- No clear incident commander
- Running a long incident without handover or rest

```quiz
Q: What should happen first in most incidents?
- Find the root cause
+ Mitigate the impact, for example by rolling back
- Write the postmortem
- Assign blame
> Stop the harm first; the cause can be studied once users are safe.

Q: What is the incident commander's job?
- Debug the problem personally
+ Coordinate the response, make decisions and assign work
- Write all the code
- Talk to customers only
> The IC keeps the overall picture and delegates the hands-on work.

Q: Why define severity levels beforehand?
- To impress auditors
+ So response expectations are agreed and not argued during the incident
- To reduce monitoring
- To avoid postmortems
> Pre-agreed levels drive who is paged and how often updates go out.

Q: What is a useful first diagnostic question?
- Who wrote the code?
+ What changed recently?
- How much will it cost?
- Is it Friday?
> Most incidents follow a change in code, configuration, dependencies or load.
```

```cards
Why mitigate before diagnose? :: To stop user harm quickly; root cause analysis can follow
Four incident roles? :: Incident commander, operations lead, communications lead, scribe
What belongs in a status update? :: Impact, status, next step and time of the next update
Why one change at a time? :: So you can tell what helped and avoid compounding the problem
```
