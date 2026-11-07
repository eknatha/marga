---
title: Root cause hints and incident assistants
minutes: 14
summary: Rank likely causes from changes and dependencies, and use language models to summarise safely while a human stays in charge.
---

During an incident the hardest question is what changed. Tools can speed the search by lining up recent changes, dependency health and anomalies, then ranking suggestions. Language models can add readable summaries and runbook search. The risk is false confidence: a plausible explanation that is wrong can send the team down the wrong path. This lesson shows how to use assistants as a fast second pair of eyes with evidence attached.

## What you will learn

- Rank candidate causes from change events, timing and dependencies
- Use language models for summaries and search with guardrails
- Require evidence and a confidence reason for each hint
- Keep a human decision at every step that changes production

## Start from change

Most incidents follow a change: a deployment, a configuration push, a flag, a certificate expiry or a traffic shift. List every change in the window before the first symptom, ordered by closeness in time and by relation to the failing service. Even without any model, this list is very effective.

## Add dependency health

Overlay the dependency graph. A service whose dependency started failing a moment earlier is a better suspect than one with no relation. Combine closeness in time, closeness in the graph and the size of the anomaly into a simple score, and show the reasons next to the rank.

## Language models as summarisers

A model can read the timeline, alerts and chat and write a clear status update, or find the matching runbook. It is good at language, and weaker at being right. Give it the evidence, ask it to quote sources, and show the quotes. Never let it invent a cause from nothing.

## Guardrails

Keep incident data private: send only what the policy allows. Label every model output as a suggestion. Log what was asked and answered for later review. Do not give the model write access to production. If it suggests an action, a person approves and runs it.

## Learn from outcomes

After each incident, record the real cause and whether the hint was right, missed or misleading. Measure how often the top three hints contained the cause. That number tells you whether to trust the tool more, tune it or turn it off.

## A hint report with evidence

```console
$ incident hints --service checkout --since 14:02
rank score  hint
1    0.82   deploy payments 3.9.0 at 13:58 (4 min before; payments is a dependency)
2    0.55   config change: payment_timeout_ms 3000 -> 800 at 13:57
3    0.21   certificate renewal for api.example.com at 12:10
evidence for 1: errors on payments rose 13:59, checkout errors followed 14:02
note: hints are suggestions, confirm before acting
```

Each hint shows its time gap, relation and evidence, so an engineer can confirm or reject it quickly. The output is a simulated illustration.

## How it fails

A model states a cause with no evidence. Private data is pasted into an outside service. The assistant is allowed to run commands. The team stops thinking and follows hints. Nobody records whether the hints were right.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Root cause hints and incident assistants fits together
node: n1 | Start from change | 0 | 0 | Most incidents follow a change: a deployment, a configuration push, a flag, a certificate expiry or a traffic shift. | Trusting a hint without checking evidence. | process
node: n2 | Add dependency health | 1 | 1 | Overlay the dependency graph. A service whose dependency started failing a moment earlier is a better suspect than one with no relation. | Pasting private data into tools without a policy. | process
node: n3 | Language models as summarisers | 2 | 0 | A model can read the timeline, alerts and chat and write a clear status update, or find the matching runbook. | Giving an assistant write access to production. | process
node: n4 | Guardrails | 3 | 1 | Keep incident data private: send only what the policy allows. | Do not give the model write access to production. | process
node: n5 | Learn from outcomes | 4 | 0 | After each incident, record the real cause and whether the hint was right, missed or misleading. | Never scoring hints against real causes. | process
node: n6 | A hint report with evidence | 5 | 1 | Each hint shows its time gap, relation and evidence, so an engineer can confirm or reject it quickly. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: The confident wrong answer

> **Incident:** During an outage an assistant suggested that a database was the cause. The team spent twenty minutes on the database. The real cause was a configuration change on a load balancer, which had been in the change list but ranked low.

```console
$ incident hints --service shop --since 09:40
1  0.74  database latency up at 09:41
2  0.39  load balancer config push at 09:39
$ incident timeline --service shop
09:39 lb config push   09:41 db latency up (caused by retry storm)
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. The ranking looked at symptoms, not at order of events. Showing the timeline next to the hints let the team see that the database was a result, not the cause.

## Interview question

"Would you let an AI assistant run incident response?" It can summarise, search runbooks and rank hints with evidence, but people decide and approve any change to production, and every output is a suggestion to verify.

## Common mistakes

- Trusting a hint without checking evidence
- Pasting private data into tools without a policy
- Giving an assistant write access to production
- Never scoring hints against real causes

```quiz
Q: What is a good first step in finding a cause?
+ List the changes made just before the first symptom
- Restart everything :: May hide the cause.
- Wait one hour :: Wastes time.
- Delete the logs :: Destroys evidence.
> Correct: List the changes made just before the first symptom. Re-read the matching lesson section for the full reasoning.

Q: What should an assistant show with each hint?
+ The evidence and reasons behind it
- Only a score :: Not checkable.
- A joke :: Not helpful.
- Nothing :: Not acceptable.
> Correct: The evidence and reasons behind it. Re-read the matching lesson section for the full reasoning.

Q: Who approves a production change an assistant suggests?
+ A person
- The assistant alone :: Too risky.
- Nobody :: Too risky.
- A random server :: Not a decision-maker.
> Correct: A person. Re-read the matching lesson section for the full reasoning.

Q: Why score hints after incidents?
+ To learn how often they contain the real cause and decide how far to trust them
- To rank engineers :: Not the aim.
- To delete runbooks :: Not the aim.
- To avoid writing reports :: Not the aim.
> Correct: To learn how often they contain the real cause and decide how far to trust them. Re-read the matching lesson section for the full reasoning.
```

```cards
change event :: a deployment, config push or flag change
hint :: a ranked suggestion with evidence
guardrail :: a rule limiting what a tool can see or do
human in the loop :: a person approves actions that change production
```
