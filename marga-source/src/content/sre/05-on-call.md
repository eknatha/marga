---
title: Running a healthy on-call rotation
minutes: 15
summary: Design on-call schedules, escalation and handoffs, write alerts and runbooks people can act on, measure pager load and keep the rotation sustainable.
---

On-call is where reliability meets people. A rotation that wakes engineers every night burns them out, drives them to leave and ends up making the service less reliable. A good one pages rarely, gives the person on duty what they need, and treats every page as a defect to remove.

## What you will learn

- Rotation design: size, handoff, escalation and compensation
- What deserves a page and what does not
- Runbooks and the first fifteen minutes of a page
- Measuring load and reducing it

## Designing the rotation

- **Size**: with fewer than five or six people, shifts come around too often. Aim for one week on duty in six or more, with a secondary for backup
- **Follow the sun** where teams are spread across time zones, so nobody works nights routinely
- **Primary and secondary**: if the primary does not acknowledge in five minutes, the page goes to the secondary, then to a manager
- **Handoff**: a short written summary at each change of shift, covering open incidents, flaky alerts and planned risky changes
- **Fairness**: pay or time off for on-call work, and no heroics expected after a hard night

```text
Handoff, week of 2 June
Open: checkout latency ticket OPS-412, mitigated, fix due Wednesday
Noisy: disk-usage alert on batch-3 fires nightly, ignore until OPS-418 lands
Risky: database failover test scheduled Thursday 10:00 UTC
Runbooks changed: payment-gateway-timeouts updated after last incident
```

## What deserves a page

A page interrupts a human, possibly at night. It should meet all of these tests:

1. **Urgent**: waiting until morning makes it worse
2. **Actionable**: a person can do something now
3. **Symptom-based**: users are, or soon will be, affected
4. **Real**: a false alarm rate low enough that people trust it

Everything else is a ticket or a dashboard. Page on symptoms such as error rate, latency and burn rate against your SLO, not on causes such as CPU at 85 percent. Alerts for causes belong in lower-severity channels, used to diagnose rather than wake anyone.

```promql
# page: the error budget is being consumed 14x too fast, over two windows
(
  sum(rate(http_requests_total{job="shop-api",code=~"5.."}[5m]))
  / sum(rate(http_requests_total{job="shop-api"}[5m]))
) > (14.4 * 0.001)
and
(
  sum(rate(http_requests_total{job="shop-api",code=~"5.."}[1h]))
  / sum(rate(http_requests_total{job="shop-api"}[1h]))
) > (14.4 * 0.001)
```

## Runbooks

Each paging alert links to a runbook that works for a tired person who did not write the service. A good runbook has:

- What the alert means and what users experience
- The first three things to check, as copy-paste commands
- Mitigations ranked by safety, such as rollback, failover and scale-up
- Who to escalate to and when
- Links to dashboards and the previous incidents

```console
$ kubectl get pods -n shop -l app=shop-api
$ kubectl rollout history deployment/shop-api -n shop | tail -3
$ kubectl rollout undo deployment/shop-api -n shop
$ curl -fsS https://status.example.com/api/v2/status.json | jq -r '.status.description'
```

Treat runbooks as code: keep them in version control, review them, and update them in the same change as the system they describe. Even better, automate the safe steps so the runbook says "run this command" or the system does it unattended.

## The first fifteen minutes

1. **Acknowledge** so others know someone owns it
2. **Assess**: how bad, who is affected, getting worse?
3. **Escalate early** if you are unsure: declare an incident and call the secondary. Asking for help in the first five minutes is not weakness
4. **Mitigate** before diagnosing, using the runbook
5. **Communicate** on a fixed rhythm

## Measuring and reducing load

Track per rotation: pages per shift, pages outside working hours, time to acknowledge, and the share of pages that needed no action. A common guideline from SRE practice is no more than two incidents per shift, since each needs time to handle and to follow up.

```console
$ curl -s -H "Authorization: Token token=$PD_TOKEN" "https://api.pagerduty.com/analytics/raw/incidents" | jq '.data | length'
```

Hold a weekly review of every page: Was it actionable? Could automation have fixed it? Should the alert change? Delete or downgrade alerts that nobody acted on. Pages that repeat belong in the toil backlog with an owner.

## Incident: the alert that cried wolf

> **Incident:** Over three months the team's pager has grown to 40 pages a week, mostly disk alerts at 80 percent that clear themselves. A real database failover alert fires at 02:10 and the on-call engineer, having been woken four times already that week by false alarms, silences it and goes back to sleep. Orders fail until 06:00.

Alert fatigue made the real signal look like the usual noise. Fix the system rather than the person:

```console
$ kubectl get prometheusrules -A -o json | jq -r '.items[].spec.groups[].rules[] | select(.alert) | .alert' | sort | uniq -c | sort -rn | head
```

List every alert, review which ones led to action, and delete or downgrade the rest. Replace cause-based alerts with SLO burn-rate alerts. Add automatic disk clean-up for the repeating one, set quiet hours only for non-urgent notifications, and make a rule that any alert ignored three times must be fixed or removed that week.

## Common mistakes

- Paging on causes such as CPU and memory instead of symptoms
- Alerts with no runbook or no clear owner
- A rotation too small, so people are always on
- Nobody reviewing pages, so noise only grows
- Blaming the individual for missing a page in a noisy system

```quiz
Q: What makes an alert worthy of a page?
- It involves any metric crossing a threshold
+ It is urgent, actionable, symptom-based and trustworthy
- It is easy to write
- It was requested by a manager
> Everything else should be a ticket or a dashboard.

Q: Why escalate early when unsure?
- It avoids paperwork
+ More help in the first minutes reduces time to mitigation
- It transfers blame
- It is required by law
> Asking for help quickly is a sign of good practice.

Q: What should a runbook contain?
+ What the alert means, first checks, mitigations, escalation and links
- The entire source code
- Only a phone number
- The postmortem
> It supports a tired engineer who did not write the service.

Q: What is the right response to alert fatigue?
- Tell people to be more careful
+ Review pages weekly and remove or fix noisy alerts
- Add more alerts
- Mute the pager
> Reduce noise at the source so real alerts stand out.
```

```cards
Primary and secondary on-call? :: Secondary is the backup who is paged if the primary does not acknowledge
Symptom-based alerting? :: Alert on user impact such as error rate and latency, not on internal causes
Healthy page load guideline? :: Roughly no more than two incidents per shift
What goes in a handoff? :: Open incidents, noisy alerts, planned risky changes and runbook updates
```
