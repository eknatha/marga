---
title: Dashboards and runbooks for on-call
minutes: 12
summary: Design the few dashboards and runbooks an on-call engineer actually needs, and keep them accurate.
---

The page fires at 03:00, and the engineer opens a dashboard with sixty graphs and a runbook last edited two years ago. Both are present and neither helps. Good on-call material is small, current and organized around the questions an engineer asks in the first five minutes.

## What you will learn

- The questions an on-call dashboard must answer
- A layered design: overview, service and deep dive
- Runbooks that start from the alert and give concrete steps
- Keeping both current

## Design from the first five minutes

When an alert fires, the engineer asks: Is it real? How bad? Since when? What changed? Where is the problem? The top-level dashboard should answer the first three at a glance: request rate, error rate and latency against the SLO, with deploy markers on the graphs. Put the most important numbers at the top, use consistent time ranges, and show thresholds so a graph says "bad" without anyone calculating.

## Layers

Use three levels and link them:

1. **Overview** for the whole product: golden signals per service, one row each, red or green.
2. **Service dashboard**: rate, errors, duration, saturation (CPU, memory, connections, queue depth), and dependencies.
3. **Deep dive**: the panels used only in an investigation, such as per-endpoint latency or database locks.

Each alert links directly to the right service dashboard, with the time range and filters already set. Avoid giant dashboards with every metric; a panel that no one has looked at in a quarter should go.

## Runbooks that work

A runbook is tied to one alert. It should open with what the alert means and how to confirm it, then give numbered steps with commands to copy, and say what is safe to do and when to escalate.

```text
Alert: CheckoutErrorRateHigh
Meaning: more than 2% of checkout requests fail for 10 minutes.
Confirm: dashboard "checkout" -> error panel; run: kubectl -n shop get pods
Step 1: if a deploy happened in the last hour, roll back: kubectl rollout undo deploy/checkout
Step 2: if payments timeouts rise, enable fallback: set flag payments.fallback=true
Escalate: if not resolved in 20 minutes, page the payments team
Owner: checkout team, reviewed 2026-01-05
```

Write for a tired reader. Short sentences, exact commands, no assumed knowledge.

## Keep them honest

Stale material is worse than none, because people trust it. Give each dashboard and runbook an owner and a review date. Update the runbook as part of every postmortem action. After an incident, ask the responders which panel they wished they had and which runbook step was wrong, and fix both within a week. Test runbooks in game days: someone who did not write it follows it step by step, and the gaps show up quickly.

```predict
Q: An alert fires and the linked runbook describes a service that was replaced last year. What process failure does this show?
???
Nobody owns the runbook or reviews it. Runbooks need an owner, a review date, and updates after incidents and migrations.
> Material that is not maintained decays silently.
```

## Incident: The 03:00 dashboard

> **Incident:** An engineer needed 25 minutes to find that a rollout was the cause of an error spike, although the deploy was visible in the pipeline.

```console
$ grafana-cli dashboards list | wc -l
214
$ ./check-links.sh runbooks/
runbooks/checkout.md: dashboard https://.../d/old-checkout -> 404
```

The alert linked to a dashboard that had been deleted, and the new one had no deploy markers. The team trimmed the overview to one row per service, added deploy annotations from the pipeline, made each alert link to a service dashboard with the right filters, and added a link checker to the pipeline that fails when a runbook points to a missing page.

## Common mistakes

- One huge dashboard for everything
- Alerts without a runbook link
- Runbooks with commands that no longer work
- No owner or review date

```quiz
Q: Which question should the top dashboard answer first?
+ Is the service healthy against its objectives right now?
- Which engineer wrote the code? :: It does not help triage.
- How many servers exist? :: It is not about health.
- What is the monthly bill? :: It is not an on-call question.
> Rate, errors and latency come first.

Q: What belongs at the start of a runbook?
+ What the alert means and how to confirm it
- The team history :: Not useful at 03:00.
- A long theory section :: Readers are tired.
- Only escalation contacts :: Confirm and act first.
> Confirm, act, escalate.

Q: How do you keep runbooks current?
+ Give them owners and review dates, and update them after every incident
- Write them once :: They decay.
- Store them on a laptop :: Nobody finds them.
- Delete them after a year :: Some are still needed.
> Maintenance is part of the job.

Q: Why add deploy markers to graphs?
+ They show whether a change coincides with a problem
- They make graphs prettier :: That is not the purpose.
- They reduce metric volume :: They do not.
- They replace alerts :: They do not.
> What changed is the first question.
```

```cards
First dashboard questions :: real, how bad, since when, what changed
Dashboard layers :: overview, service, deep dive
Runbook skeleton :: meaning, confirm, steps, escalate, owner
Keep it current :: owners, review dates, post-incident updates
Add to graphs :: deploy markers
```
