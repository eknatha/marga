---
title: Debugging and investigating AIOps output
minutes: 16
summary: How to check an AI assistant's answers during an incident: confirm the evidence, test the claim against data, and keep a person in charge of the action.
---

An AIOps tool can summarise alerts, suggest causes and propose fixes. Its answer is a hypothesis. Treat it the way you would treat a new colleague's guess: useful, worth checking, and not yet a fact.

## What you will learn

- Check an AI summary against the source evidence
- Spot a confident answer that has no support
- Compare a suggested cause with a timeline of changes
- Record misses so the tool and its limits improve

## Ask for the evidence

Every claim in a summary should point to something: a log line, a metric, a change record. If it does not, ask for the source. A claim with no source is a guess that happens to be well written.

## Test the claim

Turn the suggested cause into a question you can check in the data. If it says a deploy caused the errors, compare the error rate before and after the deploy time. If the data disagrees, the suggestion is wrong, however fluent.

## Compare with the timeline

Line up alerts, deploys, config changes and traffic on one timeline. A cause must come before its effects. Suggestions that name something that happened later, or in a different service, are suspect.

## Watch the false positives and misses

Count how often a suggestion was right, wrong, or missing. Keep the list. It tells you which alerts to trust, and it is the evidence for tuning or turning a feature off.

## Keep a person on the action

Reading is cheap and reversible. Restarting, scaling or rolling back is not. A person approves each action, with the evidence in front of them, and the tool logs who approved it.

```predict
Q: An assistant says a recent deploy caused a spike, and offers to roll it back. What do you check before agreeing?
???
That the spike started after the deploy time, that the evidence it cites exists, and what the rollback would affect.
> The suggestion is a hypothesis; check the timeline and the evidence first.
```

## Checking a claim against the data

```console
$ promtool query instant http://prometheus:9090 'sum(rate(http_requests_total{code=~"5.."}[5m]))'
5xx rate now: 0.2 per second
$ git log --since="2 hours ago" --oneline
a41f2c2 reduce cache size
$ kubectl rollout history deployment/checkout
REVISION  CHANGE-CAUSE
41        reduce cache size
```

The assistant blamed a deploy, but the error rate is low and the only recent change is a cache setting. The first look does not support rolling back. The output is a simulated illustration.

## How it fails

The summary is accepted because it reads well. The suggested action is run with no check. Wrong suggestions are not recorded, so the same error repeats. The tool is given write access too early.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Debugging and investigating AIOps output fits together
node: n1 | Ask for the evidence | 0 | 0 | Every claim in a summary should point to something: a log line, a metric, a change record. | Accepting a fluent summary without evidence. | process
node: n2 | Test the claim | 1 | 1 | Turn the suggested cause into a question you can check in the data. | Running a suggested action with no check. | observe
node: n3 | Compare with the timeline | 2 | 0 | Line up alerts, deploys, config changes and traffic on one timeline. | Not recording wrong suggestions. | process
node: n4 | Watch the false positives and misses | 3 | 1 | Count how often a suggestion was right, wrong, or missing. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | Keep a person on the action | 4 | 0 | Reading is cheap and reversible. Restarting, scaling or rolling back is not. | Giving the tool write access before it is trusted. | process
node: n6 | Checking a claim against the data | 5 | 1 | The assistant blamed a deploy, but the error rate is low and the only recent change is a cache setting. | Check the Common mistakes list below this diagram for what usually goes wrong here. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: The confident rollback

> **Incident:** During a slow-checkout alert an assistant named a deploy as the cause. The on-call engineer rolled back without checking. The real cause was a database lock, and the rollback added ten minutes of disruption.

```console
$ promtool query instant http://prometheus:9090 'max(pg_locks_waiting)'
pg_locks_waiting 41
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Testing the claim against the metrics and the timeline would have shown the locks and avoided a rollback that was never needed.

## Interview question

"Would you let an AIOps tool fix incidents by itself?" Not at first. I would let it read and suggest, check each claim against evidence, keep a person approving every action, record hits and misses, and widen its scope only where it has earned trust.

## Common mistakes

- Accepting a fluent summary without evidence
- Running a suggested action with no check
- Not recording wrong suggestions
- Giving the tool write access before it is trusted

```quiz
Q: How should you treat an AI suggestion about a cause?
+ As a hypothesis to test against the data
- As a confirmed fact :: It may be wrong however fluent.
- As noise to ignore :: It can be useful once checked.
- As an approval to act :: A person approves actions.
> Correct: As a hypothesis to test against the data. Re-read the matching lesson section for the full reasoning.

Q: What makes a claim in a summary trustworthy?
+ It points to evidence you can open and check
- It is long :: Length proves nothing.
- It sounds confident :: Tone is not evidence.
- It uses technical words :: Vocabulary is not evidence.
> Correct: It points to evidence you can open and check. Re-read the matching lesson section for the full reasoning.

Q: Why compare a suggested cause with a timeline?
+ A cause must come before its effects
- It is faster to print :: Not the reason.
- Timelines remove alerts :: They do not.
- It replaces monitoring :: It adds to it.
> Correct: A cause must come before its effects. Re-read the matching lesson section for the full reasoning.

Q: Why record the tool's wrong suggestions?
+ They show which suggestions to trust and justify tuning or limits
- To blame the tool :: The aim is evidence, not blame.
- To lower storage cost :: Unrelated.
- To avoid reviews :: It supports reviews.
> Correct: They show which suggestions to trust and justify tuning or limits. Re-read the matching lesson section for the full reasoning.
```

```cards
hypothesis :: a suggestion that needs checking
evidence link :: a pointer from a claim to a log, metric or change
timeline :: alerts, deploys and changes on one line
human approval :: a person confirms each action
```
