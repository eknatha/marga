---
title: Senior skills: estimating and planning work
minutes: 11
summary: Give honest estimates as ranges with assumptions, break work into small slices, plan for operations and risk, and communicate changes early.
---

"How long will it take?" is the question every senior engineer must answer, and every estimate is partly a guess. The aim is not to be exact but to be useful: a range with stated assumptions, updated as you learn, so that others can plan around it.

## What you will learn

- Why estimates fail and how to reduce the error
- Giving ranges and confidence instead of single dates
- Slicing work and finding the risky parts first
- Planning for operations, review and the unknown

## Why estimates are wrong

People estimate the happy path and forget reviews, testing, deployment, waiting for others, meetings, incidents and the discovery of unknowns. They anchor on the first number they heard, and they feel pressure to give a short one. Work with new technology or unclear requirements is the most uncertain. Past data helps more than intuition: compare with similar tasks you finished and how long they really took.

## Give a range and state assumptions

Say "two to four weeks, most likely three, assuming the API owner reviews within two days and we reuse the existing auth module". A range tells the listener the uncertainty. A useful technique is three points: best case, likely and worst case. Convert the range into a commitment only when risk is reduced: "I'll know more after the spike on Thursday, and then I'll give a date I'd stake my name on." Tell people when an assumption breaks, as early as you notice.

```yaml
estimate:
  task: "Migrate billing jobs to the new scheduler"
  range_weeks: [3, 6]
  most_likely_weeks: 4
  confidence: medium
  assumptions:
    - "Scheduler team supports the retry feature by week 2"
    - "No change to the invoice format"
  risks:
    - "Hidden dependency on cron environment variables"
  first_step: "Two-day spike to list all jobs and dependencies"
  next_update: "Friday"
```

## Slice and de-risk

Break the work into slices that each deliver something testable, ideally in a few days. Do the riskiest or most uncertain parts first (a spike or prototype), so bad news arrives early. Avoid "90 percent done": define done as running in production with monitoring and a documented rollback. Include time for code review, tests, documentation, migration and cleanup, and for being on call. For shared work, map dependencies on other teams and ask them for their own dates.

## Plan for the unknown and say no clearly

Keep slack: a plan fully booked at 100 percent fails at the first surprise. A rough rule is to plan 60 to 70 percent of capacity for committed work, leaving the rest for incidents, support and learning. When asked to shorten a schedule, offer options instead of only refusing: reduce scope, add a phase, move the date, or add help (which has a startup cost). Make trade-offs visible: "We can ship by the 15th without the audit log, or by the 29th with it."

```predict
Q: A manager asks for a firm date on a task with an unfamiliar technology. What is a good response?
???
Offer a range, name the assumptions and risks, propose a short spike to reduce uncertainty, and promise a firmer date after it.
> Reduce uncertainty, then commit.
```

## Incident: The three-week migration

> **Incident:** An engineer estimated three weeks for moving a service to a new platform, and it took four months.

```console
$ ls jobs/ | wc -l
214
$ grep -l "legacy-env" jobs/* | wc -l
97
```

The estimate assumed 20 simple jobs, but there were 214, and nearly half read environment variables from the old platform. No one had counted them. The lead restarted with an inventory, grouped jobs by pattern, migrated the easiest group first and gave updated ranges every two weeks. The final plan was honest but late. The next project began with a two-day inventory spike, and its estimate was within 15 percent.

## Common mistakes

- Giving one number with no assumptions
- Estimating only coding time
- Leaving the riskiest part to last
- Planning at 100 percent capacity

```quiz
Q: How should you present an estimate?
+ As a range with assumptions and risks
- As a single exact date :: False precision.
- As "soon" :: Not useful.
- As a guess without notes :: Cannot be checked.
> Show uncertainty openly.

Q: Why do the riskiest part first?
+ Bad news arrives early while you can still change the plan
- It is easier :: Usually it is not.
- To avoid reviews :: Unrelated.
- To finish sooner always :: Not guaranteed.
> Early learning lowers the risk.

Q: What should be in the definition of done?
+ Running in production with monitoring and a rollback plan
- Code written :: Not enough.
- Pull request opened :: Not enough.
- Tests skipped :: Poor practice.
> Done means operable.

Q: Your manager wants the date moved earlier. What helps?
+ Offer scope, phase or date options and make trade-offs visible
- Agree silently and work nights :: Hides risk.
- Refuse without options :: Unhelpful.
- Cut tests :: Increases risk.
> Give choices, not just a no.
```

```cards
Estimate :: range, most likely value, assumptions and risks
Spike :: short experiment to reduce uncertainty
Slices :: small increments that can be tested
Done :: in production, monitored, with rollback
Slack :: plan below full capacity
```
