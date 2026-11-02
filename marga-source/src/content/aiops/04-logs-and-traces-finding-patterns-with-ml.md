---
title: Logs and traces: finding patterns with ML
minutes: 14
summary: Cluster log lines into templates, spot new or rare messages and link behaviour changes to deployments.
---

Logs are huge and mostly boring. The interesting line is often one you have never seen before. Machine learning and simple statistics can help you find it: group similar lines into templates, count them, and highlight what is new or suddenly frequent. Traces add timing, so slow outliers and changed paths become visible. As always, structured data makes the work easier.

## What you will learn

- Explain log templates and why clustering them helps
- Detect new and rare messages after a change
- Use trace data to spot slow or unusual paths
- Link patterns to deployments and configuration changes

## From lines to templates

Many log lines differ only in values: "user 4412 timed out after 3000 ms" and "user 8123 timed out after 2900 ms". Replace the variable parts with placeholders and you get one template. Counting templates turns millions of lines into a short list you can scan and compare over time.

## New and rare messages

After a release, list templates that did not exist before, and templates whose rate jumped. New error templates right after a deployment are strong hints. Rare messages at the start of an incident are worth reading first, because they tend to be the first sign of change.

## Count by version and host

Group counts by software version, region and host. If a template appears only on version 2.4.1, you have narrowed the search before reading a single line. This works with plain queries, with no model at all, if your logs carry the version label.

## Traces find the slow path

Traces record each step of a request with its duration. Compare the slowest requests with typical ones: which service, call or database query takes the extra time? Look for a changed path, such as a new retry or a call that used to be cached. The span tells you where.

## Tie it to change

Overlay deployments, configuration pushes and feature flag changes on your charts. When a pattern starts at the minute of a change, you have a candidate cause. The change log is the most valuable context for any detection method, and it costs very little to keep.

## New templates since the last release

```console
$ logstat templates --service checkout --since release:2.4.1 --new
count  template
912    payment gateway timeout after <NUM> ms, retry <NUM> of <NUM>
87     cache miss for key <KEY>, falling back to database
3      unexpected status <NUM> from tax service
$ logstat compare --version 2.4.0 2.4.1 --top 3
payment gateway timeout: 0/min -> 41/min
```

The tool lists message templates that first appeared after release 2.4.1. A jump from zero to 41 timeouts a minute narrows the search to one dependency. The output is a simulated illustration.

## How it fails

Logs have no version or request id, so grouping is impossible. A clustering model merges unrelated messages. Sensitive data in logs gets copied into new systems. Sampling drops the rare line you needed.

## Incident: The error nobody had seen before

> **Incident:** After a release, a new error line appeared at a low rate. It was buried among millions of lines and nobody noticed until the rate grew and customers complained. The line had never appeared before the release.

```console
$ logstat templates --service orders --since release:5.1.0 --new
count  template
64     serialization failed for field <NAME> in schema v<NUM>
$ logstat timeline --template 4f2a --bucket 10m
10:00 2   10:10 7   10:20 19   10:30 64
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A simple report of templates that are new since a release would have surfaced the line within minutes of the deployment, long before it became a customer problem.

## Interview question

"How do you find the needle in millions of log lines?" Group lines into templates, list new and rapidly growing ones after a change, group by version and host, and confirm with traces and the change log.

## Common mistakes

- Logs with no version, host or request id
- Sampling away rare errors
- Sending sensitive data into analysis tools
- Trusting clusters without reading examples

```quiz
Q: What is a log template?
+ A line with variable values replaced by placeholders
- A log file name :: Not a template.
- A server image :: Unrelated.
- A password :: Never.
> Correct: A line with variable values replaced by placeholders. Re-read the matching lesson section for the full reasoning.

Q: Which is a strong hint after a deployment?
+ A message template that did not exist before the release
- Any old message :: Not new.
- A longer log file :: Not a hint.
- A bigger disk :: Not a hint.
> Correct: A message template that did not exist before the release. Re-read the matching lesson section for the full reasoning.

Q: How do traces help?
+ They show which step of a request takes the extra time
- They encrypt requests :: Not their job.
- They remove errors :: They only observe.
- They replace logs entirely :: They complement them.
> Correct: They show which step of a request takes the extra time. Re-read the matching lesson section for the full reasoning.

Q: Why overlay changes on charts?
+ A pattern starting at the minute of a change points to a candidate cause
- It improves colours :: Not the reason.
- It deletes alerts :: It does not.
- It speeds the network :: Unrelated.
> Correct: A pattern starting at the minute of a change points to a candidate cause. Re-read the matching lesson section for the full reasoning.
```

```cards
log template :: log line with variable parts replaced by placeholders
rare message :: a line seen very few times
span :: one timed step in a trace
change log :: record of deployments and configuration changes
```
