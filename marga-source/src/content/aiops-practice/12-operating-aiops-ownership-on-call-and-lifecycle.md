---
title: Operating AIOps: ownership, on-call and lifecycle
minutes: 13
summary: Treat the AIOps platform as a production service with an owner, SLOs, on-call, change control and a lifecycle for every rule, model and automation it runs.
---

Once AIOps pages people and changes systems, it is part of your production path. If it fails silently or drifts, the cost lands on everyone. It needs the same operating habits as any critical service.

## What you will learn

- Who owns what: platform, rule authors and service teams
- SLOs and on-call for the AIOps system itself
- A lifecycle for rules, models and automations
- Change control, documentation and cost management

## Ownership

Split responsibility clearly. The **platform team** owns ingestion, storage, the rules engine, the model serving and the guardrails. **Service teams** own the alerts, grouping labels and runbooks for their services, because they know what matters. A small **AIOps working group** owns standards, the evaluation set and the quality scorecard. Every rule, detector and action has a named owner and a link to why it exists.

## SLOs for the platform

Define what "healthy" means: data freshness (for example 99 percent of metrics visible within 60 seconds), alert delivery latency, detector evaluation lag, assistant response time, and availability of the kill switch. Alert on these. The most important failure to catch is silence: an AIOps system that stopped processing looks like a very calm environment.

## On-call for the tool

Someone must be reachable when the platform itself breaks. Give it a runbook, a rota and a degraded mode: if correlation is down, raw alerts still reach people, and if the model service is down, rules and static thresholds keep working. The pager path for the AIOps platform must not depend on the AIOps platform.

## Lifecycle of a rule or model

1. **Propose:** owner, reason, expected effect and how it will be measured.
2. **Test:** replay against the incident set.
3. **Shadow:** run without effect and compare.
4. **Release:** staged by team or service.
5. **Review:** scheduled, often quarterly, looking at precision, recall, actions taken and outcome.
6. **Retire:** remove rules that no longer match anything or never lead to action.

Store rules as code in version control, require review and keep a changelog. Version models and thresholds and be able to roll back to the previous version in minutes.

## Change control and freeze

AIOps changes can alter who gets paged, so treat them like production changes. Announce them, run them through the same pipeline and respect freeze windows. A change that suppresses a class of alerts deserves the same scrutiny as one that touches a database.

## Documentation and training

Keep one page for each automation: trigger, tier, preconditions, verification, how to disable it, and who to ask. Train new on-call engineers on how to read the assistant's output, how to give feedback, and how to turn automation off. Run an exercise at least twice a year without the tool.

## Cost

Track what it costs to run: data ingest and retention, model inference or API usage, storage of embeddings, and engineering time. Set budgets and alerts on spend. Cache repeated assistant queries and use smaller models for simple tasks. Review cost beside value at the quarterly review.

```yaml
service: aiops-platform
owner: platform-team
slos:
  - name: data-freshness
    objective: "99% of metrics queryable within 60s"
  - name: alert-delivery
    objective: "99.9% of pages delivered within 30s of trigger"
  - name: kill-switch-availability
    objective: "99.99%"
degraded_mode:
  correlation_down: send_raw_alerts
  model_service_down: use_static_thresholds
oncall:
  rota: aiops-primary
  escalation: platform-lead
review:
  cadence: quarterly
  inputs: [precision, recall, actions_taken, rollbacks, cost, user_feedback]
lifecycle: [propose, test, shadow, release, review, retire]
```

The file defines objectives, what happens when parts fail, who is on call and how often every rule and model is reviewed.

```diagram
title: Running AIOps as a production service
node: own | Owners | 0 | 1 | Platform, service teams and a working group. | Rules with no named owner. | process
node: slo | Platform SLOs | 1 | 0 | Freshness, delivery latency, kill switch uptime. | Nobody notices silence. | observe
node: oncall | On-call and degraded mode | 1 | 2 | A rota and a fallback to raw alerts. | The pager depends on the platform. | security
node: life | Lifecycle | 2 | 1 | Propose, test, shadow, release, review, retire. | Rules that live forever. | process
node: chg | Change control | 3 | 0 | Version control, review and freeze windows. | Suppression changes made by hand. | store
node: cost | Cost and value review | 3 | 2 | Quarterly review of spend and outcomes. | Cost only seen at the invoice. | external
edge: own | life
edge: slo | life
edge: oncall | life
edge: life | chg
edge: life | cost
```

## Incident: The platform that went quiet

> **Incident:** A change to the ingestion pipeline stopped delivery of one cluster's metrics. Nothing paged for three days.

```console
$ aiopsctl freshness --by-source
source          last-seen   expected
prom-eu-west    12s ago     60s
prom-us-east    3d 2h ago   60s
(this is a simulated illustration, not a real incident)
```

With no data, no detector fired, and the calm dashboards were believed. The platform had no freshness SLO. The team added one with an alert, a daily report of silent sources, and an on-call rota for the platform itself.

## Common mistakes

- No named owner for rules and automations
- No SLO for data freshness
- The AIOps pager path depends on AIOps
- Rules and models with no review date
- Manual suppression changes outside version control

```quiz
Q: Who should own alerts and runbooks for a service?
+ The service team, because they know what matters
- The AIOps vendor :: Does not know your service.
- Nobody :: Leads to decay.
- Only the platform team :: Lacks service context.
> Platform owns the machinery and service teams own the content.

Q: Why is silence the key failure to catch?
+ A stopped pipeline looks like a calm system
- Silence is always good :: It can hide failure.
- Alerts are always loud :: Not when data stops.
- Silence is a log level :: Not meant.
> Freshness monitoring exposes it.

Q: What is a degraded mode?
+ A defined fallback, such as raw alerts, when part of the platform fails
- A slower dashboard :: Not the meaning.
- A cheaper licence :: Not the meaning.
- A test environment :: Not the meaning.
> People must still be reached if correlation fails.

Q: What does the retire step do?
+ Removes rules and models that no longer help
- Deletes the audit log :: No.
- Stops all alerts :: No.
- Increases coverage :: Not directly.
> Dead rules add risk and noise.
```

```cards
Platform SLO :: A reliability target for the AIOps system itself
Degraded mode :: A planned fallback when part of a system fails
Rule lifecycle :: The stages a rule passes from proposal to retirement
Working group :: A small team that sets standards across teams
Freshness :: How recently data was last received from a source
```
