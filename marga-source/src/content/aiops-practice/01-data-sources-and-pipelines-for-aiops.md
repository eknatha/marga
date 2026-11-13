---
title: Data sources and pipelines for AIOps
minutes: 13
summary: Design the event, metric, change and topology stores an AIOps system reads from, with consistent identity, timestamps and retention, so every later model has trustworthy input.
---

AIOps projects fail more often on data than on algorithms. Detectors, correlators and assistants all need to answer "which service, at what time, what changed", and they can only do it if the underlying data agrees on those words.

## What you will learn

- The four data families an AIOps system needs
- How to give every record a common service identity
- Why timestamps and clocks need explicit handling
- How to set retention and sampling without losing what models need

## Four data families

**Time series** (metrics) answer how much and how fast. **Events** (alerts, incidents, tickets) answer what a human or tool was told. **Changes** (deploys, config, flags, infrastructure) answer what we did. **Topology** (services, dependencies, owners) answers how things connect. Logs and traces sit beside these as detail you drill into. A system with only metrics can detect but cannot explain.

## One identity for everything

Pick a canonical service name and put it on every record: metric label, alert label, log field, trace attribute, deploy event, ticket. Use a registry, such as a service catalog, as the source of truth and reject or flag unknown names. If the metric says `checkout-svc`, the alert says `Checkout` and the deploy says `checkout-api`, no correlator can join them. Add the environment, region and team in the same way.

## Time

Use UTC and ISO 8601 everywhere internally. Keep both the event time and the ingest time, because lag between them matters: a detector that runs on data that arrives five minutes late is detecting the past. Make sure hosts use NTP. Clock skew of a few seconds will reorder a deploy and an error spike and send a correlator to the wrong cause.

## Quality gates

Check data at ingestion: required labels present, values in a sane range, no duplicate series, no sudden drop in volume. A collector that silently stops looks identical to a calm system. Emit a freshness metric per source and alert when a source goes quiet.

## Retention and sampling

Models need history to learn seasonality: at least several weeks of metrics, ideally a year for annual patterns. Keep raw high-resolution data for days, then downsample with care. Averaging drops the peaks you want to detect, so store min, max and a few percentiles when you roll up. Keep incident records and their labels indefinitely, since they are small and valuable.

```yaml
# A normalised event record shared by alerts, changes and tickets
event:
  id: evt-20261103-0141
  kind: change            # alert | change | incident | ticket
  service: checkout       # must exist in the service catalog
  environment: production
  team: payments
  event_time: "2026-11-03T14:01:07Z"
  ingest_time: "2026-11-03T14:01:09Z"
  source: argocd
  summary: "Sync checkout to 4.18.2"
  links:
    diff: "https://git.example.com/checkout/compare/4.18.1...4.18.2"
```

One schema for every kind of event means one query can show alerts and changes on the same timeline.

## Access and privacy

Logs and tickets can hold personal data and secrets. Decide what is allowed into the AIOps store, redact tokens and personal fields at ingestion, and apply the same access rules as the source systems. A model trained on unredacted logs can leak what it was trained on.

```diagram
title: The data an AIOps system stands on
node: ts | Metrics | 0 | 0 | Time series for detection and forecasting. | Rollups that drop the peaks. | store
node: evt | Alerts and incidents | 0 | 1 | What responders were told and what they did. | Free-text names that do not match. | store
node: chg | Changes | 0 | 2 | Deploys, config, flags and infrastructure. | Sources missing from the feed. | store
node: topo | Topology and owners | 1 | 1 | Dependencies, owners and tiers from the catalog. | Out of date. | store
node: gate | Normalise and check | 2 | 1 | Common identity, UTC time, required labels, freshness. | Collectors that fail silently. | security
node: lake | AIOps store | 3 | 1 | One queryable timeline per service. | Unredacted secrets and personal data. | cache
edge: ts | gate
edge: evt | gate
edge: chg | gate
edge: topo | gate
edge: gate | lake
```

## Incident: Three names for one service

> **Incident:** A correlation project promised to link deploys to errors but matched almost nothing in its first month.

```console
$ svcnames --source all --like checkout
metrics:  checkout-svc
alerts:   Checkout
deploys:  checkout-api
tickets:  payments/checkout
(this is a simulated illustration, not a real incident)
```

Four sources used four names for one service. Nothing joined. The team added a catalog lookup at ingestion that mapped aliases to one canonical name and rejected records with unknown names. Matches rose from a few percent to nearly all records.

## Common mistakes

- Different service names in different tools
- Mixed time zones and unsynchronised clocks
- Rolling up metrics by average only
- No freshness alert for a source
- Storing raw logs with secrets

```quiz
Q: Why does a service need one canonical name?
+ So metrics, alerts, deploys and tickets can be joined
- To save disk space :: Unrelated.
- To rename the company :: Unrelated.
- To avoid backups :: Unrelated.
> Joins fail when each tool uses its own name.

Q: Why keep both event time and ingest time?
+ Lag between them shows how stale the data is
- They are always identical :: They differ.
- Only one is allowed by law :: No such rule.
- To double the storage :: Not the aim.
> Late data means a detector is looking at the past.

Q: What is a risk of averaging when rolling up metrics?
+ It removes the peaks you want to detect
- It adds new series :: It does not.
- It breaks timestamps :: Not directly.
- It encrypts the data :: Unrelated.
> Keep min, max and percentiles too.

Q: How do you notice a collector has silently stopped?
+ A freshness metric per source with an alert
- Nothing, a quiet system looks calm :: That is the problem.
- Waiting for a user report :: Too slow.
- Restarting weekly :: Does not detect it.
> Silence must be measured like any other signal.
```

```cards
Canonical name :: The one agreed identifier for a service across all tools
Event time :: When something actually happened
Ingest time :: When the system received the record
Freshness :: How recently a data source last delivered data
Service catalog :: The registry that defines services, owners and tiers
```
