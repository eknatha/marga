---
title: Incident communication and stakeholder management
minutes: 12
summary: Communicate during outages with clear status updates, severity levels, an internal channel structure, customer messaging and a calm handover, so technical work is not slowed by confusion.
---

During an incident, the technical fix is only half of the job. Customers want to know whether they are affected, executives want to know the impact, other teams need to know whether to act, and responders need quiet. Poor communication prolongs outages, damages trust and burns out the people fixing the problem. Good communication is a skill you can practise like any other.

## What you will learn

- Severity levels and what each triggers
- Separating the response channel from the updates channel
- The shape of a good status update
- Customer-facing messages and status pages
- Handovers, long incidents and the aftermath

## Severity levels

Define levels by impact, not by cause, and say what each level triggers (who is paged, who must join, how often updates go out).

| Level | Example impact | Response |
|-------|----------------|----------|
| Sev 1 | Core service down for many users, data loss, security breach | Page everyone needed; commander assigned; updates every 30 minutes |
| Sev 2 | Major feature degraded for some users | On-call plus owners; updates every hour |
| Sev 3 | Minor issue with a workaround | Normal working hours; ticket |

Anyone may raise severity; lowering it should be a decision of the incident commander. If unsure, start high and reduce.

## Channels

Use a dedicated incident channel for responders, with a pinned summary: what is happening, who is commander, where the dashboard and the document are. Keep side conversations out. A separate updates channel (or a mailing list) carries the periodic summaries for everyone else, so executives and support do not interrupt responders to ask for news. The communications lead owns that channel and the status page, so the commander and the engineers can concentrate.

## A good status update

Short, factual and on a schedule, even when there is nothing new ("no change, next update at 15:30"). Include:

1. **Impact:** who is affected and how, in plain words.
2. **Status:** what we know and what we are doing.
3. **Next update:** a time.

> 14:20 UTC: Some customers cannot complete payments (about 30 percent of attempts fail). We have identified a faulty change released at 13:50 and are rolling it back. Next update at 14:50 or sooner.

Avoid guesses about the cause, internal jargon, blame, and promises about when it will be fixed unless you are sure. Do not paste raw logs.

## Customers

Post on the status page early, within minutes of confirming impact. Say what customers can do (a workaround, retry later). When resolved, say so and what happens next. For serious incidents, follow with a plain account of what happened and what is being changed. If legal or contract rules apply, for example data breach notification, involve the right people early.

## Long incidents and handover

After a few hours, people make mistakes. Rotate roles, hand over with a written summary (state, hypotheses tried, pending actions), and let people rest. The commander should step back from debugging, and a fresh commander can take over with a clean view.

## Afterwards

Send a final summary, thank those involved, schedule the postmortem within a few days while memory is fresh, and track actions to completion. People who handled an incident well in difficult conditions deserve to hear it.

```predict
Q: An executive asks in the responders' channel for an estimate of the fix time. What should the commander do?
???
Point them to the updates channel, give them a short answer through the communications lead, and keep the response channel for responders.
> Protect the responders' attention while keeping stakeholders informed on a schedule.
```

## Incident: the silent outage

> **Incident:** A checkout bug affects customers for 90 minutes. Engineers fix it quickly, but support learns about it from angry social media posts.

```console
14:05 detected   14:12 fix started   15:35 resolved
status page: first update at 15:50
```

The team had no communications role, the status page needed approval from someone who was asleep, and nobody told support. Afterwards they named a communications lead in the on-call rota, allowed the on-call engineer to post an initial status message, created templates for first updates, and added support to the updates channel.

## Common mistakes

- No update schedule
- Speculating about the cause or blaming a person
- Everyone talking in the response channel
- No handover in long incidents

```quiz
Q: What three things should a status update include?
+ Impact, current status, and when the next update comes
- Names of people, logs and a joke :: Not useful.
- Root cause, fix time and blame :: Often unknown or harmful.
- Code diff, dashboards and tickets :: Too technical.
> Predictable, plain updates build trust.

Q: Why have a communications lead during a serious incident?
+ Engineers can focus while stakeholders still get regular updates
- To add bureaucracy :: It reduces distraction.
- To write code :: Unrelated.
- To decide the fix :: That is the commander and responders.
> Separation of roles speeds up the fix.

Q: When should the first customer-facing update go out?
+ As soon as impact is confirmed, within minutes
- After the root cause is known :: Too late.
- Next day :: Too late.
- Only if customers complain :: Too late.
> An early acknowledgement reduces confusion.

Q: What helps in an incident longer than a few hours?
+ Rotating roles with a written handover
- Fewer breaks :: Tiredness causes mistakes.
- More people in one channel :: Adds noise.
- Skipping the summary :: Loses context.
> Rest and clear handover keep quality high.
```

```cards
Severity is defined by what? :: Impact, not cause
Two channels? :: Response (responders) and updates (everyone else)
Status update parts? :: Impact, status, next update time
Who owns the status page? :: The communications lead
What ends an incident? :: Final summary and a scheduled postmortem
```
