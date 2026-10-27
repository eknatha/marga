---
title: Debugging production under pressure
minutes: 15
summary: Run an incident investigation with hypotheses, one change at a time, mitigation before root cause, clear roles and notes that make the review easy.
---

Debugging in production differs from debugging on a laptop. Users are affected now, you cannot pause the system, and several people are looking at it at once. The goal changes: first stop the harm, then understand the cause. A calm method keeps a team from making things worse.

## What you will learn

- Mitigate first, investigate second
- Working with hypotheses and one change at a time
- Roles in an incident and what to write down
- Reading recent changes as the first suspect
- Closing the loop: verification and follow-up

## Mitigate, then understand

The quickest safe action usually is not the deepest fix: roll back the last deploy, turn off a feature flag, shift traffic away from a bad zone, or add capacity. Do this first if it is safe and reversible, and then investigate while users are no longer harmed.

## Hypothesis loop

1. State what you see (symptom, start time, affected users).
2. List what changed near the start: deploys, flags, config, traffic, certificates, dependencies.
3. Pick the most likely and cheapest hypothesis to test.
4. Test it with a query or a read-only command.
5. Change one thing, and watch the same metric.

Write each hypothesis and the result in the incident channel. It prevents repeated work and builds the timeline for the review.

## Roles

| Role | Job |
|------|-----|
| Incident commander | Decides, assigns work, keeps the pace; does not debug |
| Operations lead | Runs the commands and changes |
| Communications lead | Updates stakeholders and the status page on a schedule |
| Scribe | Keeps a timestamped log of actions and findings |

On a small team one person holds two roles, but the commander should not be the one with hands on the keyboard.

## Useful questions

- What changed? What is different between affected and unaffected users?
- Is it getting worse, steady or improving?
- What is the blast radius, and can we reduce it?
- What would we expect to see if this hypothesis were true? Do we see it?

```bash
# Compare affected and unaffected quickly
kubectl rollout history deploy/shop
kubectl get events -A --sort-by=.lastTimestamp | tail -20
curl -s "$STATUS_URL/api/v1/changes?since=2h" | jq '.[].summary'
```

```predict
Q: Error rate rose at 10:02, and a deploy finished at 10:00. You are unsure it is the cause. What is the safest first step?
???
Roll back the deploy if rollback is safe, then check whether the error rate recovers.
> A rollback is quick, reversible, and doubles as a test of the hypothesis. Investigation continues afterwards from a stable system.
```

```diagram
title: Incident investigation loop
node: detect | Detect and declare | 0 | 1 | An alert or report is confirmed and an incident is declared with a commander. | Delay in declaring means uncoordinated, duplicated effort.
node: mit | Mitigate | 1 | 0 | Roll back, flag off, fail over or add capacity. | Digging for root cause while users are failing prolongs harm.
node: hyp | Hypothesise and test | 1 | 2 | List changes, pick the likeliest, test it cheaply. | Several simultaneous changes destroy the evidence.
node: verify | Verify recovery | 2 | 1 | Confirm user-facing metrics returned to normal. | Declaring victory on internal graphs while users still fail.
node: review | Blameless review | 3 | 1 | Write the timeline, causes and follow-up actions. | Skipping the review repeats the incident.
edge: detect | mit
edge: detect | hyp
edge: mit | verify
edge: hyp | verify
edge: verify | review
```

## Incident: three people, three changes

> **Incident:** Checkout latency triples at 16:20. Three engineers each make a change within five minutes.

```console
16:24 alice  restarted payments pods
16:26 bob    increased db pool 20 -> 50
16:28 chen   disabled the new recommendations flag
16:31 latency back to normal. which change fixed it?
```

Latency recovered, but nobody knew why. Bob's larger pool had also raised database load, and the problem returned the next day. In the review the team agreed on one operator making changes at a time, announced in the channel before each action, and a rule that a rollback comes before experiments.

## Common mistakes

- Several people changing things at once
- No written timeline
- Skipping the check that users have recovered
- Blame, which makes people hide information

```quiz
Q: In an active incident with a recent deploy, what usually comes first?
- A full root cause analysis :: It delays relief for users.
+ A safe, reversible mitigation such as rollback
- A redesign :: Not an incident action.
- A long meeting :: Meetings slow response.
> Stop the harm, then investigate.

Q: Why change one thing at a time?
+ So you can tell which action had which effect
- It is cheaper :: Cost is not the reason.
- It is required by law :: Not a legal rule.
- It makes graphs prettier :: Irrelevant.
> Parallel changes make cause and effect impossible to separate.

Q: What does the incident commander do?
- Types all the commands :: That is the operations role.
+ Coordinates, decides and assigns, and does not debug
- Writes the code fix alone :: That narrows the response.
- Waits for the review :: Commanding happens during the incident.
> Separating command from hands-on work keeps the whole picture visible.

Q: Why keep a timestamped log during an incident?
+ It supports handover, avoids repeated work and makes the review accurate
- It is only for managers :: It helps responders too.
- It slows the fix :: A short note costs little.
- It replaces monitoring :: It does not.
> Memory is unreliable under stress.
```

```cards
First move in most incidents? :: Mitigate safely, for example roll back
How many changes at a time? :: One, announced first
What does the commander not do? :: Hands-on debugging
First suspect? :: The most recent change
What ends an incident? :: Verified user recovery, then a blameless review
```
