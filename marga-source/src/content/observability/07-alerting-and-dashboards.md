---
title: Alerting and dashboards
minutes: 16
summary: Alert on symptoms that matter to users, write alert rules with Alertmanager routing, and design dashboards that answer questions quickly.
---

A pager that rings at 3 a.m. for a problem nobody needs to fix trains people to ignore it. An alert that never fires during a real outage costs more. Good alerting is a product design problem: every alert must be urgent, actionable and clear about what is wrong.

## What you will learn

- What deserves a page versus a ticket
- Writing and routing Prometheus alerts
- Multi-window burn-rate alerts
- Dashboard design

## What deserves an alert

Ask three questions of every proposed alert:

1. **Does a human need to act, right now?** If not, it is a ticket or a dashboard, not a page.
2. **Is it a symptom users feel?** Prefer "checkout error ratio above 2%" over "CPU above 80%". Causes can be investigated after a symptom fires.
3. **Does the responder know what to do?** Every page links to a runbook.

| Kind | Delivered as | Example |
|------|-------------|---------|
| Urgent, user-impacting | Page | Error ratio high, SLO burning fast |
| Needs action soon | Ticket or chat message | Disk will fill in 3 days, certificate expires in 14 days |
| Informational | Dashboard | CPU trends, deployment markers |

Alerts on causes still have a place when they predict a symptom, such as "disk will fill in 4 hours", because they give you time to act before users are hurt.

## Writing alert rules

```yaml
groups:
  - name: shop-api.alerts
    rules:
      - alert: ShopApiHighErrorRatio
        expr: |
          sum(rate(http_requests_total{service="shop-api", status=~"5.."}[5m]))
            /
          sum(rate(http_requests_total{service="shop-api"}[5m])) > 0.02
        for: 10m
        labels:
          severity: page
          team: shop
        annotations:
          summary: "Shop API error ratio above 2% for 10 minutes"
          runbook: "https://runbooks.example.com/shop-api/high-errors"

      - alert: InstanceDown
        expr: up{job="shop-api"} == 0
        for: 5m
        labels:
          severity: ticket
        annotations:
          summary: "{{ $labels.instance }} has stopped reporting"
```

The `for:` clause requires the condition to hold continuously, which filters brief spikes. Labels drive routing, and annotations explain the alert to the responder.

## Routing with Alertmanager

Prometheus evaluates rules; **Alertmanager** deduplicates, groups, silences and routes the resulting alerts.

```yaml
route:
  receiver: team-chat
  group_by: [alertname, service]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - matchers: ['severity="page"']
      receiver: on-call-pager

receivers:
  - name: on-call-pager
    pagerduty_configs:
      - routing_key_file: /etc/alertmanager/secrets/pager-key
  - name: team-chat
    slack_configs:
      - api_url_file: /etc/alertmanager/secrets/slack-url
        channel: "#shop-alerts"
```

Grouping means fifty failing instances produce one notification instead of fifty. **Inhibition rules** can mute downstream alerts when a root cause alert is already firing (for example, mute service alerts when the whole cluster is unreachable).

## Alert on the budget, not the blip

With service level objectives (covered in the SRE module), the best alerts measure how fast you are consuming your **error budget**. A **burn rate** of 1 uses the budget exactly over the whole window; a burn rate of 14 would exhaust a 30-day budget in about two days. A common design pairs a short and a long window, so you are paged only for sustained, serious burning and not for a blip:

```yaml
      - alert: ShopApiBudgetBurnFast
        expr: |
          (
            sum(rate(http_requests_total{service="shop-api",status=~"5.."}[5m]))
              / sum(rate(http_requests_total{service="shop-api"}[5m]))
          ) > (14 * 0.001)
          and
          (
            sum(rate(http_requests_total{service="shop-api",status=~"5.."}[1h]))
              / sum(rate(http_requests_total{service="shop-api"}[1h]))
          ) > (14 * 0.001)
        for: 2m
        labels:
          severity: page
```

Here 0.001 is the error budget for a 99.9% objective. The long window proves it is not momentary and the short window makes the alert resolve quickly when the problem ends.

## Dashboards

A dashboard should answer a question in under ten seconds.

- Put the **user-facing signals first**: request rate, error ratio, latency percentiles. Resource graphs go below.
- One dashboard per service with a fixed layout, so people know where to look at 3 a.m.
- Show **deployment and incident markers** on graphs; many problems start at a release.
- Use consistent units and time ranges, and label axes.
- Link from an alert to the dashboard panel that shows the same query.
- Prefer a few meaningful panels to forty. Delete panels nobody looks at.

## Incident: alert fatigue

> **Incident:** The on-call engineer received 214 pages last week. Most were closed without action, and a real database alert was acknowledged and then forgotten.

Treat the alert set as something that is itself in need of maintenance. Pull the numbers:

```console
$ amtool alert query --active -o json | jq -r '.[].labels.alertname' | sort | uniq -c | sort -rn | head
```

Three alerts account for 80% of the volume: a CPU alert with no impact, a flapping disk check, and a duplicate of the error-ratio alert. For each ask: was action required? If no, remove it, convert it to a ticket, or lengthen its `for:` period. Add a weekly review of every page: who was paged, was it actionable, what changed. Track pages per shift as a team metric. A healthy target is only a handful per shift, and each one meaningful.

## Common mistakes

- Paging on causes with no user impact
- Alerts with no runbook
- No `for:` duration, so every spike pages
- Dashboards with no owner and no clear question
- Never reviewing alert quality

```quiz
Q: Which is a better page-worthy alert?
- CPU above 80% on one node
+ Checkout error ratio above 2% for 10 minutes
- A single failed health check
- Memory used above 50%
> Page on symptoms users feel, not on causes that may have no impact.

Q: What does the for: clause in an alert rule do?
- Sets the severity
+ Requires the condition to hold continuously for that duration before firing
- Sends the alert to a team
- Deletes old alerts
> It filters transient spikes.

Q: What is Alertmanager's job?
- Evaluating PromQL rules
+ Deduplicating, grouping, silencing and routing alerts
- Scraping targets
- Storing logs
> Prometheus evaluates rules; Alertmanager handles notifications.

Q: What does a burn rate of 1 mean?
- The budget is gone
+ The error budget is being consumed at exactly the pace that uses it up over the full window
- No errors
- Twice the allowed errors
> Burn rate is the speed of budget consumption relative to the window.
```

```cards
Three questions for any page? :: Must a human act now, is it a symptom users feel, does the responder know what to do
Role of Alertmanager? :: Deduplicate, group, silence and route alerts to receivers
Why two windows in burn-rate alerts? :: The long window proves it is sustained; the short window lets it resolve quickly
First panels on a service dashboard? :: Rate, errors and latency percentiles
```
