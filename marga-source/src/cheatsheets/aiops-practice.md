---
title: AIOps in practice
summary: Approval tiers, action safety checklist, verification, kill switches, agent limits, injection defences and the evaluation steps to run before any AIOps feature acts.
module: aiops-practice
---
## Approval tiers

| Tier | What it covers | Who acts |
| --- | --- | --- |
| 0 | Read only: gather evidence, summarise, open a ticket | Automatic |
| 1 | Low risk and reversible: restart one pod, small capped scale-out | Automatic with logging |
| 2 | Moderate: rollback, drain, failover of a replica | Person approves with evidence |
| 3 | High risk: data, whole fleet, customer-visible region | Person does it |

> **Warning:** Decide the tier when you write the action, not during the incident.

## Safe action template

```yaml
action: restart-pod
tier: 1
preconditions:
  - service.healthy_replicas >= 2
  - no_active_deploy: true
scope: {max_pods_per_run: 1, max_runs_per_hour: 3}
timeout: 120s
verify: [pod.ready within 90s, error_ratio < 0.02 for 5m]
on_failure: page_oncall
```

## Verify the symptom, not the command

```promql
sum(rate(http_requests_total{service="api",code=~"5.."}[1m]))
/ sum(rate(http_requests_total{service="api"}[1m])) < 0.02
```

```promql
max(db_connections_used / db_connections_max) < 0.85
```

## Kill switch and limits

```yaml
guardrails:
  global:
    kill_switch: flag://aiops/automation_enabled
    max_actions_per_hour: 20
  per_service:
    max_fleet_percent_per_run: 10
    require_human_if: [active_incident]
```

Check the switch before every action. Fail closed when the flag store cannot be read. Test the stop path every week.

## Chaos experiment

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: api-pod-kill
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [staging-api]
  duration: 60s
```

Write the hypothesis first: what should alert, what should run, how long recovery should take.

## Agent safety checklist

- Narrow typed tools, no generic shell or free-form query
- Read-only first, then proposals, then a human gate
- Step, time and token limits, with a full transcript
- Secrets outside the model context and egress allowlists
- Approval prompt shows the exact action, target and evidence

## Evaluate before you trust

```bash
aiopsctl replay --suite incidents-2026 --detector mad-seasonal
aiopsctl shadow report --feature rca-ranker --weeks 4
aiopsctl eval topk --suite incidents-2026 --k 3
```

Report counts beside percentages. Add every wrong case to the regression suite.

## Slow failures to monitor

```promql
sum by (action) (increase(remediation_rollbacks_total[7d]))
/ sum by (action) (increase(remediation_runs_total[7d]))
```

Watch rollback share, repeat fixes on one target, weekly precision and recall, and data freshness per source.
