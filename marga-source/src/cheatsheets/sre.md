---
title: SRE practices
summary: SLO maths, error budget policy, incident roles and updates, postmortem template, toil and reliability patterns.
module: sre
---

## Definitions

| Term | Meaning |
|------|---------|
| SLI | A measurement: good events divided by valid events |
| SLO | Internal target for an SLI over a window |
| SLA | Contract with consequences; looser than the SLO |
| Error budget | 1 minus the SLO |

## Downtime allowed per 30 days

| SLO | Allowed downtime |
|-----|------------------|
| 99% | about 7 h 12 min |
| 99.9% | about 43 min |
| 99.95% | about 21 min |
| 99.99% | about 4 min |

A 30-day window is 43,200 minutes. Multiply by the error budget fraction.

## Error budget policy

| Budget state | Action |
|--------------|--------|
| Healthy | Ship features, run experiments |
| Under 25% left | Stricter reviews, smaller releases |
| Exhausted | Pause risky releases; prioritize reliability work |

Agree the policy before you need it. Never using the budget also means the target may be too strict.

## Burn rate

| Burn rate | Meaning | Typical action |
|-----------|---------|----------------|
| 1 | Budget lasts exactly the window | Normal |
| 6 | Budget gone in about 5 days | Ticket |
| 14 | Budget gone in about 2 days | Page |

Alert on a long and short window together so you are paged for sustained burn only.

## Incident roles

| Role | Job |
|------|-----|
| Incident commander | Coordinates and decides; does not debug |
| Operations lead | Investigates and changes systems |
| Communications lead | Posts updates on a schedule |
| Scribe | Keeps the timeline |

## Severity

| Level | Impact | Updates |
|-------|--------|---------|
| SEV1 | Major outage or data loss | Every 15 to 30 minutes |
| SEV2 | Significant degradation | Every 30 to 60 minutes |
| SEV3 | Minor, workaround exists | Working hours |

## Incident sequence

1. Detect and acknowledge
2. Triage: impact, scope, severity, open a channel
3. Mitigate first (roll back, fail over, disable a flag)
4. Diagnose with evidence; ask what changed
5. Resolve and confirm recovery holds
6. Schedule the postmortem

One change at a time, announced before it is made.

## Status update template

```text
HH:MM UTC - SEVn - Short title
Impact: who is affected and how
Status: what we know and what we are doing
Next update: HH:MM UTC
```

## Postmortem template

| Section | Content |
|---------|---------|
| Summary | What broke, how long, who was affected |
| Impact | Users, requests, budget consumed |
| Timeline | Timestamped events |
| Contributing factors | The chain of conditions |
| Went well / badly / lucky | Honest reflection |
| Actions | Specific, owned, dated: prevent, detect, mitigate |

Blameless: ask how the system made the mistake easy, not who made it.

## Toil

Toil is manual, repetitive, automatable, reactive work with no lasting value that grows with the service.

| Reduce by | Example |
|-----------|---------|
| Automating | Script or controller replaces the procedure |
| Removing the cause | Fix the bug instead of restarting |
| Self-service | Developers do it without a ticket |
| Stopping | Drop work that adds no value |

Keep toil below about half of an engineer's time.

## Reliability patterns

| Pattern | Rule |
|---------|------|
| Timeouts | Every network call; shorter than the caller's deadline |
| Retries | Idempotent only, exponential backoff with jitter, two or three attempts, retry at one layer |
| Circuit breaker | Fail fast when a dependency is failing; closed, open, half-open |
| Bulkhead | Separate pools per dependency |
| Graceful degradation | Optional features fail without breaking the critical path |
| Load shedding | Reject excess requests quickly (429 or 503 with Retry-After) |
| Rate limits | Per-client so one caller cannot harm others |

## Game day checklist

- Hypothesis written down
- Blast radius limited and agreed
- Abort condition defined
- Quiet period, people watching
- Findings turned into tracked actions

## SLO and error budget maths

```promql
sum(rate(http_requests_total{status!~"5.."}[30d])) / sum(rate(http_requests_total[30d]))
1 - (sum(rate(http_requests_total{status!~"5.."}[1h])) / sum(rate(http_requests_total[1h])))
(sum(rate(http_requests_total{status=~"5.."}[1h])) / sum(rate(http_requests_total[1h]))) / 0.001
```

```text
99.9 percent over 30 days   = 43.2 minutes of error budget
99.95 percent over 30 days  = 21.6 minutes
99.99 percent over 30 days  = 4.3 minutes
burn rate 14.4 for 1 hour   = 2 percent of the monthly budget gone
burn rate 6 for 6 hours     = 5 percent of the monthly budget gone
```

> **Warning:** An SLO of 100 percent is not a goal: it leaves no room for change. Pick a target that users notice, and write down what happens when the budget is gone.

> **Warning:** Measure the SLI where users are (load balancer, synthetic probe), not only inside the service. A healthy process behind a broken proxy still looks fine from the inside.

## Incident commands and habits

```bash
date -u
kubectl rollout history deploy/api -n shop
kubectl rollout undo deploy/api -n shop
kubectl get events -A --sort-by=.lastTimestamp | tail -30
curl -s -o /dev/null -w '%{http_code} %{time_total}\n' https://example.com/healthz
journalctl -u api --since "30 min ago" -p warning
```

```text
1. Declare, name an incident commander, open one channel.
2. Post the first update within 10 minutes, then at a fixed interval.
3. Mitigate first (roll back, fail over, turn a flag off), find the cause later.
4. Write down every change with a UTC time.
5. Confirm recovery on the user-facing graph, then close.
6. Hold a blameless review within 5 working days. Track actions with an owner and a date.
```

> **Warning:** In an incident do not make several changes at once. You will not know which one helped, or which one made it worse.

> **Warning:** Do not restart a failing service just to see: you can lose the evidence in memory. Capture logs, `dmesg` and thread or heap information first when it is safe.

> **Warning:** Never paste secrets or personal data into an incident channel or ticket. It is kept for a long time and many people can read it.

## Capacity and resilience checks

```bash
kubectl top nodes
kubectl get hpa -A
kubectl get pdb -A
df -h; df -i
free -m; vmstat 1 5
iostat -xz 1 5
curl -s localhost:9090/api/v1/query --data-urlencode 'query=predict_linear(node_filesystem_avail_bytes[6h], 7*86400)' | jq .
```

> **Warning:** Load and chaos tests belong in a test environment first. In production, start small, have a way to stop, have a named owner and tell the on-call team beforehand.

> **Warning:** Do not remove an alert because it is noisy. Fix the cause or the threshold, and keep the page for something a human must do now.

> **Warning:** Untested backups are not backups. Restore into a clean environment on a schedule and measure how long it takes.
