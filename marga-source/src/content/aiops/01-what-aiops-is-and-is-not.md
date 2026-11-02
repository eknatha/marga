---
title: What AIOps is and is not
minutes: 12
summary: AIOps applies statistics and machine learning to operations data. Learn what it can do, what it cannot, and how to judge a tool honestly.
---

AIOps means using algorithms to help run systems: spotting unusual metrics, grouping noisy alerts, pointing at likely causes and automating routine fixes. The promise is less noise and faster recovery. The risk is a black box that adds a new thing to debug. This lesson sets realistic expectations so you can adopt the useful parts and skip the hype.

## What you will learn

- Define AIOps and list its common uses
- Separate problems algorithms solve well from those they do not
- Explain why good telemetry comes before any AIOps tool
- Judge a tool by measurable results

## What it covers

Four jobs appear again and again: anomaly detection on metrics and logs, alert correlation and noise reduction, root cause hints, and automated or assisted remediation. Newer tools add language models that summarise incidents and search runbooks. Each job is a separate problem with its own limits.

## What it needs first

Algorithms can only learn from the data you give them. If metrics are missing, logs are unstructured, service names are inconsistent and changes are not recorded, no tool can recover the picture. Clean telemetry, a service catalogue and a change log are the foundation. Doing that work first often removes much of the need.

## Where it helps

It helps where humans cannot keep up: thousands of metrics with daily patterns, alert storms that bury the one that matters, and repetitive checks during an incident. It struggles where the system is new, behaviour changes constantly, or the failure has never happened before.

## Where it does not

A model cannot know your business rules, a planned launch or why traffic doubled. It cannot replace on-call judgement. It can mislead when it sounds confident. Treat every output as a hint with a reason you can check, not an answer.

## Judging a tool

Define measures before you start: alerts per incident, time to acknowledge, time to find the cause, false positives, missed incidents. Run it beside your current process for a few weeks. Keep it if the numbers improve and engineers trust it. Drop it if they ignore it.

## A baseline you can measure

```console
$ ./incident_stats.sh --from 2026-01-01 --to 2026-03-31
incidents:                       42
alerts fired:                    6180
alerts per incident (median):    71
pages per week per person:       19
time to acknowledge (median):    6 min
time to identify cause (median): 38 min
false pages (no action needed):  57%
```

Numbers like these are what a tool must improve. Without a baseline, nobody can say whether it helped. The output is a simulated illustration.

## How it fails

A tool is bought before telemetry is fixed. Results are not measured, so people argue from opinion. A model flags everything as unusual and is muted. A confident suggestion is trusted without checking.

## Incident: A tool that learned the wrong normal

> **Incident:** A team trained an anomaly detector on three quiet weeks. When a busy sales period began, it flagged every metric as abnormal. The on-call engineers muted it, and later a real fault went unnoticed.

```console
$ aiops-tool status
anomalies open: 412
training window: 2026-02-02 to 2026-02-22
note: no seasonal patterns learned
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A detector must learn from a window that includes normal busy and quiet periods, and its alert volume must be watched like any other service, or it becomes noise itself.

## Interview question

"Would you buy an AIOps platform?" Start with the problem and a baseline, check that telemetry and change data are good, trial it beside current practice, and measure alert noise, time to cause and false positives before deciding.

## Common mistakes

- Buying a tool before fixing telemetry
- Having no baseline to compare against
- Trusting confident suggestions without checking
- Training a detector on an unrepresentative window

```quiz
Q: Which job is part of AIOps?
+ Grouping many alerts into one incident
- Writing the application :: That is development.
- Buying servers :: That is procurement.
- Choosing a logo :: Unrelated.
> Correct: Grouping many alerts into one incident. Re-read the matching lesson section for the full reasoning.

Q: Why fix telemetry before adopting AIOps?
+ Algorithms can only learn from the data they are given
- Telemetry is optional :: Tools depend on it.
- Tools replace telemetry :: They cannot.
- It lowers cloud prices :: Not the reason.
> Correct: Algorithms can only learn from the data they are given. Re-read the matching lesson section for the full reasoning.

Q: How should you judge an AIOps tool?
+ Compare measured results such as alert noise and time to cause with a baseline
- By the vendor's slides :: Not evidence.
- By how modern it looks :: Not a measure.
- By the number of dashboards :: Not a measure.
> Correct: Compare measured results such as alert noise and time to cause with a baseline. Re-read the matching lesson section for the full reasoning.

Q: What is a risk of AIOps?
+ Confident output that nobody checks
- It removes all alerts forever :: It cannot.
- It needs no data :: It needs a lot.
- It never makes mistakes :: It does.
> Correct: Confident output that nobody checks. Re-read the matching lesson section for the full reasoning.
```

```cards
AIOps :: using algorithms to help run systems
alert noise :: alerts that need no action or repeat the same fault
baseline :: measured starting numbers used to judge a change
false positive :: an alert for something that is not a problem
```
