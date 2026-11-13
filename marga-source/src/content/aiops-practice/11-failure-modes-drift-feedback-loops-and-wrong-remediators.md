---
title: Failure modes: drift, feedback loops and wrong remediators
minutes: 14
summary: Learn how AIOps systems fail slowly and quietly: concept drift, feedback loops that reward their own mistakes, bias towards noisy services and automation that fixes the wrong thing.
---

Most AIOps failures are not crashes. The system keeps running and keeps producing confident output that is gradually less right. Knowing the patterns lets you look for them before they cost you an outage.

## What you will learn

- How drift makes good models go stale
- How feedback loops reinforce mistakes
- Why noisy services get attention they do not need and quiet ones get missed
- How a wrong remediator can mask or worsen a fault
- Monitors that catch each failure early

## Drift

Your system changes: new services, new traffic patterns, a migration, a seasonal peak. A detector trained or tuned on last quarter learns a world that no longer exists. **Data drift** means the inputs changed. **Concept drift** means the relationship between inputs and "this is a problem" changed. Signs: the false alarm rate rises, recall falls, or the detector goes quiet. Monitor the tool's own precision and recall each week, and track input distributions such as the number of active series and the typical level of key metrics.

## Feedback loops

If responders only look at what the tool flags, the tool only gets labels for what it flagged. Missed incidents never appear as training data, so it never learns to catch them. If an auto-remediation hides a symptom, the metric looks healthy and the tool learns that the action "works" even though the cause remains. Loops can also amplify: a recommender that sends the team to the loudest service makes that service the best documented, so it is flagged more.

Break loops by sampling: review a random slice of unflagged time ranges, include user-reported incidents as labels, and measure outcomes with signals independent of the action, such as customer error rates and tickets.

## Bias towards noisy services

A service with many metrics and alerts produces more events, more labels and more attention. Models and humans learn it well. A quiet, critical service with little telemetry gets little coverage, because there is little to learn from. Report coverage by service tier, not only overall. Add minimal good telemetry to critical quiet services.

## Wrong remediators

An action can match the symptom but not the cause. Restarting a leaking service clears the alert and loses the evidence. Scaling out a service hides a slow query. Failing over a database loses writes if replication lagged. Counter these with preconditions, verification of the true symptom and a count of repeats: if the same fix is needed again and again, escalate. Keep the evidence before acting, such as a heap dump or a log snapshot.

## Automation bias and skill fade

People trust confident tools. When the tool is right most of the time, they stop checking. When it is wrong, they miss it. And when automation handles routine incidents for months, engineers lose practice with the manual path. Counter this with periodic game days where the tool is off, sampling and auditing accepted suggestions, and keeping runbooks usable by hand.

## Monitors for the tools

```promql
# Share of automatic remediations that had to be undone, per action
sum by (action) (increase(remediation_rollbacks_total[7d]))
/
sum by (action) (increase(remediation_runs_total[7d]))
```

```promql
# Repeat firings of the same action on the same target within a day
count by (action, target) (increase(remediation_runs_total[1d]) > 2)
```

Alert when the rollback share for any action rises above its normal level, or when many targets need repeated fixes. Add the weekly precision and recall of detectors beside them, and a freshness check on training and baseline data.

```diagram
title: Slow failures in an AIOps system
node: world | Changing systems | 0 | 1 | New services, traffic and migrations. | The model never updated. | external
node: drift | Drift | 1 | 0 | Inputs or meaning of normal change. | No monitor on the tool's own accuracy. | process
node: loop | Feedback loop | 1 | 1 | The tool only learns from what it flagged. | No sampling of unflagged time. | process
node: bias | Coverage bias | 1 | 2 | Noisy services get attention, quiet critical ones do not. | Reporting only overall coverage. | process
node: rem | Wrong remediator | 2 | 1 | Fix matches the symptom, not the cause. | Evidence destroyed by the fix. | service
node: mon | Monitors and audits | 3 | 1 | Rollback share, repeat fixes, weekly precision and recall. | Nobody owns the review. | observe
edge: world | drift
edge: drift | mon
edge: loop | mon
edge: bias | mon
edge: rem | mon
edge: loop | rem
```

## Incident: The restart that taught the wrong lesson

> **Incident:** A service leaked memory for months. Automatic restarts kept it up, and the tool reported the action as highly effective.

```console
$ aiopsctl action-report --action restart-pod --service ingest --days 90
runs: 1640  verified-ok: 1612 (98%)  repeats-same-target-same-day: 1204
median uptime between restarts: 3h 40m
(this is a simulated illustration, not a real incident)
```

The 98 percent success rate hid that the same pods were restarted again and again, every few hours. The cause was never found because the restarts cleared the evidence. The team added a repeat-fix alert, captured a heap profile before each restart, and fixed the leak in a week.

## Common mistakes

- No monitor on the tool's own precision and recall
- Learning only from alerts the tool raised
- Reporting coverage only in total, not by tier
- Counting success without counting repeats
- Never practising without the tool

```quiz
Q: What is concept drift?
+ The link between signals and real problems changes over time
- A detector crashes :: A different failure.
- Data arrives late :: A data quality issue.
- A dashboard changes colour :: Irrelevant.
> A model trained on old behaviour becomes less accurate.

Q: How can a feedback loop hide missed incidents?
+ Missed incidents never become labels, so the tool never learns them
- It deletes the alerts :: Not the mechanism.
- It speeds up detection :: No.
- It removes seasonality :: No.
> Learning only from flagged events keeps blind spots.

Q: Why track repeat firings of the same action?
+ Repeated fixes mean the cause is still there
- They show the action is popular :: Misleading.
- They prove the action works :: It may be hiding a fault.
- They reduce cost :: Unrelated.
> Escalate and investigate repeats.

Q: How do you counter automation bias?
+ Audit accepted suggestions and run exercises without the tool
- Trust the tool more :: Increases the problem.
- Remove logging :: Hides errors.
- Stop reviewing :: Same.
> People must keep checking and keep practising.
```

```cards
Data drift :: The inputs to a model change over time
Concept drift :: The meaning of normal or problem changes over time
Feedback loop :: A system learning from its own outputs
Automation bias :: Over-trusting an automated suggestion
Coverage bias :: Better monitoring for noisy services than quiet ones
```
