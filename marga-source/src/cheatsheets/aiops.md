---
title: AIOps
summary: Practical rules for anomaly detection, alert grouping, incident hints and safe auto-remediation.
module: aiops
---

## Before you buy or build

- Write down a baseline: alerts per incident, time to acknowledge, time to find cause, false pages.
- Fix telemetry, service names and the change log first.
- Trial beside current practice for a few weeks. Keep it only if the numbers improve.

## Anomaly detection ladder

| Step | Method | Good for |
| --- | --- | --- |
| 1 | Static threshold | Hard limits such as disk full |
| 2 | Rolling mean and spread | Metrics without a daily pattern |
| 3 | Seasonal baseline | Traffic, with daily and weekly rhythm |
| 4 | Forecast or model | Many series, after simple methods fail |

```promql
sum(rate(http_requests_total{job="checkout"}[5m]))
/
sum(rate(http_requests_total{job="checkout"}[5m] offset 1w))
```

## Reduce alert noise

```yaml
route:
  group_by: [cluster, service]
  group_wait: 30s
inhibit_rules:
  - source_matchers: [alertname = "NodeDown"]
    target_matchers: [severity = "warning"]
    equal: [cluster, node]
```

> **Warning:** Silences need an expiry, a narrow matcher and a reason.

## Root cause hints

1. List changes just before the first symptom.
2. Overlay dependency health.
3. Rank by time gap, graph distance and size of anomaly.
4. Show evidence with every hint.
5. A person confirms before any production change.

## Safe auto-remediation checklist

```yaml
preconditions: [alert_still_firing, no_active_deploy, target_count_max: 2]
limits: {max_per_hour: 2, cooldown: 30m, kill_switch: automation/global}
verify: {after: 5m, expect: "queue_depth < 100"}
on_verify_fail: page_human
```

> **Why it matters:** Automation acts fast and at scale. Limits and a kill switch contain mistakes.

## Check an assistant's answer

1. Ask which evidence the claim rests on, and open it.
2. Turn the cause into a query you can run.
3. Line up alerts, deploys and changes on one timeline.
4. Record hits and misses.
5. A person approves every action.

> **Warning:** A fluent answer is not evidence. A claim with no source is a guess.

> **Warning:** Do not run a suggested rollback or restart before testing the claim against the data.

> **Warning:** Do not give an AIOps tool write access before it has earned trust on read-only work.

> **Warning:** Anomaly detection fires on harmless change too. Tune windows and keep the alert on user impact.

## Commands for checking a claim

```console
$ promtool query instant http://prometheus:9090 'sum(rate(http_requests_total{code=~"5.."}[5m]))'
```

```console
$ git log --since="2 hours ago" --oneline
```

```console
$ kubectl rollout history deployment/checkout
```
