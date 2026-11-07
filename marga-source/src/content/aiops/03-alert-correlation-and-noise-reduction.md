---
title: Alert correlation and noise reduction
minutes: 13
summary: Group related alerts into one incident, remove duplicates and use dependencies to point at the source of a storm.
---

During a real outage, one failing database can trigger hundreds of alerts from every service that depends on it. The person on call sees a wall of red and has to work out which alert is the cause and which are echoes. Correlation groups related alerts, and noise reduction removes the ones that never needed a human. Both can be done well with plain rules before adding machine learning.

## What you will learn

- Explain alert storms and why they slow response
- Deduplicate and group alerts using labels and time
- Use service dependencies to find the likely source
- Measure noise and track it down over time

## Why storms hurt

Each extra alert costs attention. When many fire at once, the engineer must read, sort and guess. The first alert is often the most useful, and it gets buried. A good system shows one incident with the likely cause on top and the echoes folded underneath.

## Deduplicate and group

Give every alert stable labels: service, environment, team and a fingerprint of the problem. Identical alerts collapse into one with a count. Alerts that share a service or cluster and start within a few minutes group together. This alone often cuts volume by more than half.

## Use topology

If you know that checkout calls payments, and payments calls the database, then a database fault explains alerts above it. Walk the dependency graph from the alerting services toward the shared dependency that is also unhealthy. Surface that one first and label the rest as downstream.

## Inhibit and silence by design

Inhibition rules suppress low-value alerts while a high-value one is active, for example, mute pod alerts when the whole node is down. Planned work should silence alerts with an expiry and a reason. Avoid permanent silences: they hide new problems.

## Measure and prune

Track alerts per incident, the share that led to an action, and alerts that always resolve alone. Retire or retune any alert that is mostly ignored. Noise is a debt that grows quietly, so give someone ownership of the number.

## Grouping and inhibition in Alertmanager

```yaml
route:
  receiver: team-pager
  group_by: [cluster, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
inhibit_rules:
  - source_matchers: [alertname = "NodeDown"]
    target_matchers: [severity = "warning"]
    equal: [cluster, node]
  - source_matchers: [alertname = "DatabaseDown"]
    target_matchers: [alertname =~ "Service.*Errors"]
    equal: [cluster]
receivers:
  - name: team-pager
```

Alerts for the same cluster and service are grouped for 30 seconds before the first page. When a database is down, service error alerts in the same cluster are inhibited so the cause stands out.

## How it fails

Alerts have no labels, so nothing can be grouped. Silences never expire. Inhibition hides a real second fault. Dependency data is out of date, so the cause shown is wrong. Nobody measures noise.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Alert correlation and noise reduction fits together
node: n1 | Why storms hurt | 0 | 0 | Each extra alert costs attention. When many fire at once, the engineer must read, sort and guess. | No ownership of alert noise. | process
node: n2 | Deduplicate and group | 1 | 1 | Give every alert stable labels: service, environment, team and a fingerprint of the problem. | Alerts without consistent labels. | process
node: n3 | Use topology | 2 | 0 | If you know that checkout calls payments, and payments calls the database, then a database fault explains alerts above it. | Inhibition rules that hide real faults. | observe
node: n4 | Inhibit and silence by design | 3 | 1 | Inhibition rules suppress low-value alerts while a high-value one is active, for example, mute pod alerts when the whole node is down. | Permanent silences. | process
node: n5 | Measure and prune | 4 | 0 | Track alerts per incident, the share that led to an action, and alerts that always resolve alone. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n6 | Grouping and inhibition in | 5 | 1 | Alerts for the same cluster and service are grouped for 30 seconds before the first page. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: Two hundred pages for one disk

> **Incident:** A shared storage volume filled up and many services began failing. The on-call engineer received around two hundred alerts in ten minutes and spent the first part of the incident reading them instead of looking at the disk.

```console
$ alertctl summary --window 10m
alerts received: 214
distinct fingerprints: 31
grouped into incidents: 2
likely source: storage-vol-7 (disk 100%), dependents: 29
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Grouping by service and dependency turns two hundred alerts into two incidents with one named likely source.

## Interview question

"How would you reduce alert noise during an outage?" Add stable labels, deduplicate, group by service and cluster, use dependency data to show the likely root, add inhibition rules, and track alerts per incident as a metric.

## Common mistakes

- Alerts without consistent labels
- Permanent silences
- Inhibition rules that hide real faults
- No ownership of alert noise

```quiz
Q: What is an alert storm?
+ Many alerts firing at once from one underlying fault
- A weather alert :: Unrelated.
- One alert with a long name :: Not a storm.
- A quiet period :: Opposite.
> Correct: Many alerts firing at once from one underlying fault. Re-read the matching lesson section for the full reasoning.

Q: What makes grouping possible?
+ Stable labels such as service, cluster and team
- Random alert names :: Cannot group.
- Alerts without labels :: Cannot group.
- Longer messages :: Do not help.
> Correct: Stable labels such as service, cluster and team. Re-read the matching lesson section for the full reasoning.

Q: How does dependency data help?
+ It points to the shared dependency that explains alerts above it
- It deletes alerts :: It does not.
- It slows detection :: It speeds triage.
- It replaces monitoring :: It adds to it.
> Correct: It points to the shared dependency that explains alerts above it. Re-read the matching lesson section for the full reasoning.

Q: Why avoid permanent silences?
+ They can hide new, real problems
- They make alerts louder :: They silence them.
- They cost money :: Not the reason.
- They break dashboards :: Not the reason.
> Correct: They can hide new, real problems. Re-read the matching lesson section for the full reasoning.
```

```cards
alert storm :: many alerts from one fault
grouping :: combining related alerts into one incident
inhibition :: suppress low-value alerts while a higher-value one is active
fingerprint :: stable identifier for the same alert
```
