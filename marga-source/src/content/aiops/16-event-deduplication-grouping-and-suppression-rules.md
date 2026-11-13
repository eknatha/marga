---
title: Event deduplication, grouping and suppression rules
minutes: 13
summary: Turn a stream of raw events into a few actionable incidents using fingerprints, time windows, grouping keys and suppression rules, and keep those rules safe to maintain.
---

Correlation starts before any machine learning. A good rules layer removes most noise cheaply, is easy to explain, and gives later models cleaner input. This lesson covers the building blocks and the ways they go wrong.

## What you will learn

- Build a stable fingerprint and use it to deduplicate
- Choose grouping keys and time windows
- Write suppression rules that expire and are reviewed
- Test a rule against history before it goes live

## Fingerprints

A fingerprint is a hash of the fields that define "the same problem": the alert name, the service, the environment and the failing component, but not the timestamp, the pod name or the current value. If the fingerprint is too specific, every event looks new. If it is too broad, different problems merge. Start with the labels a human would use to say "that is the same alert".

## Deduplication

When an event arrives with a known fingerprint, update the existing record: bump a counter and the last-seen time instead of creating a new alert. The responder sees one item that says "seen 41 times in 12 minutes", which is far more useful than 41 items.

## Grouping

Group related alerts into one incident by a shared key and a time window. Common keys are the cluster, the service, the host or the upstream dependency. The window matters: a short wait collects the burst, a long one delays the page. Prometheus Alertmanager uses `group_wait` for the first batch and `group_interval` for later changes.

## Suppression and maintenance windows

Suppression hides alerts that cannot be acted on: a host under planned maintenance, a test environment, a known issue with a ticket. Every suppression needs an owner, a reason and an expiry. A silence with no expiry is how a real outage gets ignored months later.

```yaml
route:
  group_by: [alertname, cluster, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers: [env = "staging"]
      receiver: ticket-only
inhibit_rules:
  - source_matchers: [alertname = "ClusterDown"]
    target_matchers: [severity =~ "warning|info"]
    equal: [cluster]
```

Alerts are grouped by name, cluster and service. Staging alerts create tickets instead of pages. While a whole cluster is down, lower-severity alerts in that cluster are inhibited.

## Testing rules

Replay a week of real events through the rule set and compare the output with what responders actually handled. Count events in, incidents out, and any incident that a human had to split or merge by hand. A rule that merges two unrelated outages is worse than one that leaves a little noise.

## Keeping rules healthy

Store rules in version control with review. Add a comment with the owner and the reason. Run a monthly report of silences and rules that have not matched anything, and remove them. Rules left alone become the hidden reason an alert never arrives.

```diagram
title: From raw events to incidents
node: ev | Raw events | 0 | 1 | Alerts, logs and checks from many tools. | No consistent labels to match on. | external
node: fp | Fingerprint | 1 | 0 | Hash of the fields that define the same problem. | Including the timestamp or pod name defeats it. | process
node: dd | Deduplicate | 1 | 2 | Update a count and last-seen time on a repeat. | Dropping repeats hides how often it happens. | process
node: grp | Group | 2 | 1 | Combine by cluster or service within a time window. | A long window delays the page. | process
node: sup | Suppress | 3 | 0 | Hide what cannot be acted on, with an expiry. | A silence with no owner or end date. | security
node: inc | Incident | 4 | 1 | One item with a count, a window and a likely source. | Merging unrelated faults into one. | service
edge: ev | fp
edge: fp | dd
edge: dd | grp
edge: grp | sup
edge: sup | inc
```

## Incident: The silence that outlived the maintenance

> **Incident:** An engineer silenced disk alerts for a database host during a migration. The silence had no end time.

```console
$ amtool silence query --expired=false
ID        Matchers                Ends At  Created By  Comment
8c1f20ab  host="db-07"            never    jsmith      migration
(this is a simulated illustration, not a real incident)
```

Three weeks later the disk on db-07 filled and no alert fired. After the postmortem the team required an end time on every silence, added a weekly report of active silences and put matchers in review.

## Common mistakes

- A fingerprint that includes the timestamp or pod name
- Silences without an owner or an expiry
- Grouping windows so long that pages are late
- Deploying rules without a replay test
- Rules nobody reviews

```quiz
Q: What belongs in a fingerprint?
+ Fields that define the same problem, not timestamps or pod names
- Every field of the event :: Then nothing deduplicates.
- Only the timestamp :: Every event differs.
- The alert value :: It changes constantly.
> Stable fields make repeats match.

Q: What does deduplication keep?
+ One record with a count and last-seen time
- Only the first event and nothing else :: Loses the repeat count.
- All events separately :: That is the noise.
- Nothing :: Then the alert is lost.
> A count shows how often it happens.

Q: What must every suppression have?
+ An owner, a reason and an expiry
- A long comment only :: Still no expiry.
- A broad matcher :: Increases risk.
- A secret name :: Irrelevant.
> Expiry stops a temporary silence becoming permanent.

Q: How do you test a grouping rule safely?
+ Replay past events and compare with what responders handled
- Enable it in production and watch :: Risky.
- Ask the vendor :: Does not test your data.
- Read the config twice :: Misses behaviour.
> Replay shows merges and splits before users feel them.
```

```cards
Fingerprint :: A hash of the stable fields that identify one problem
Deduplication :: Folding repeats of the same event into one record
Grouping :: Combining related alerts into one incident
Inhibition :: Muting some alerts while a more important one is active
Silence :: A time-limited mute for alerts that match certain labels
```
