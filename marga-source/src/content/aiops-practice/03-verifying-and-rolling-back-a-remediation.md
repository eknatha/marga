---
title: Verifying and rolling back a remediation
minutes: 13
summary: Prove that an automatic fix worked by checking the symptom, not the action, and undo it automatically when it did not or when it made things worse.
---

An action that ran is not an action that worked. A restart can succeed while the service stays broken. A rollback can complete and leave the error rate unchanged. Verification turns a script into a safe automation.

## What you will learn

- Verify the symptom rather than the command's exit code
- Choose verification signals and windows
- Roll back or escalate automatically when verification fails
- Detect "made it worse" and stop

## Verify the symptom

Return code zero means the command was accepted, nothing more. Define success in the terms that triggered the action. If the trigger was a high error ratio, verify the ratio fell below a threshold and stayed there. If it was a full disk, verify free space rose and a new write succeeds. Use the same query the alert used, so the check and the trigger cannot disagree.

## Windows and settling time

Systems take time to settle. Wait a short settling period before measuring, then require the condition to hold for a window, such as five minutes. Checking too early gives false failures; checking only once gives false success when a symptom flickers. For slow recoveries such as a cache warming up, use a longer window and a looser threshold.

## Guard metrics

Besides the symptom, check that nothing else worsened. Scaling out may lower latency but raise database connections to the limit. Keep a short list of guard metrics per action: error ratio of dependencies, saturation, and the cost or rate of the action itself. If a guard crosses its limit, treat the action as failed even if the symptom improved.

## Roll back or escalate

Each action should define what failure means and what happens next: undo it if undoing is safe, otherwise stop and page a human with the evidence collected so far. Rollback paths must be tested. An untested undo is a hope. Record the before and after state so the undo restores exactly what was there.

```yaml
verify:
  settle: 60s
  window: 5m
  symptom:
    query: 'sum(rate(http_requests_total{service="api",code=~"5.."}[1m])) / sum(rate(http_requests_total{service="api"}[1m]))'
    below: 0.02
  guards:
    - query: 'max(db_connections_used / db_connections_max)'
      below: 0.85
    - query: 'sum(rate(remediation_runs_total{service="api"}[1h]))'
      below: 4
on_fail:
  - undo: restore-previous-replica-count
  - notify: oncall
  - disable_action: restart-pod   # for this service, until a human re-enables it
```

The action passes only if the symptom clears and the database stays under 85 percent of its connection limit. On failure it undoes the change, pages a person and disables itself for that service.

## Detect "made it worse"

Compare the system before and after the action. If the error ratio rose, latency doubled or a second alert fired within the settling period, stop at once. Do not wait for the full window. Fast failure limits damage, and the record of what changed helps the postmortem.

## Record the outcome

Write every result to an audit log with the trigger, the action, the verification numbers and the final state. Use those records to find actions that fail often and either fix or retire them.

```diagram
title: An action is not finished until it is verified
node: act | Action runs | 0 | 1 | A bounded change such as scale out. | Treating exit code zero as success. | service
node: settle | Settle | 1 | 1 | Short wait for the system to react. | Measuring too early. | process
node: sym | Check symptom | 2 | 0 | The same query that triggered the action. | A different check from the trigger. | observe
node: guard | Check guards | 2 | 2 | Dependencies and saturation did not worsen. | No guards, so a side effect goes unseen. | observe
node: ok | Success | 3 | 0 | Symptom cleared and guards held for the window. | Closing the incident without a record. | external
node: undo | Undo and escalate | 3 | 2 | Restore the saved state and page a human. | An untested undo path. | security
edge: act | settle
edge: settle | sym
edge: settle | guard
edge: sym | ok
edge: guard | ok
edge: sym | undo
edge: guard | undo
```

## Incident: The scale-out that hurt

> **Incident:** Latency alerts triggered an automatic scale-out of the API. Latency improved for a minute, then the whole product slowed down.

```console
$ remediation show run-5521
action: scale-out api 6 -> 18
symptom: p95 latency 1400ms -> 900ms (improved)
guard: db_connections_used/max 0.52 -> 0.99 (not checked)
result: marked success
(this is a simulated illustration, not a real incident)
```

The action had no guard on database connections. Twelve new pods exhausted the connection pool and every service using that database failed. The team added a connection guard, capped the scale-out at double the current size and made a failed guard roll the change back.

## Common mistakes

- Using the exit code as proof of success
- Checking once instead of over a window
- No guard metrics for side effects
- An undo path that was never tested
- Waiting out the full window while things get worse

```quiz
Q: What should verification check?
+ The symptom that triggered the action
- The command's exit code only :: Shows acceptance, not effect.
- That the script finished :: Not the same as success.
- The size of the log :: Unrelated.
> Success means the problem is gone.

Q: Why use a settling window?
+ Systems need time to react, and a flickering symptom needs to hold
- To make actions slower :: Not the aim.
- To save money :: Not the aim.
- To skip guards :: Opposite.
> Measure after the system settles and require it to hold.

Q: What is a guard metric?
+ A check that the action did not hurt something else
- A security guard :: Not meant.
- A backup copy :: Unrelated.
- A log level :: Unrelated.
> Fixes can shift the problem elsewhere.

Q: What should happen if verification fails?
+ Undo if safe, otherwise stop and page with the evidence
- Run the action again repeatedly :: Can loop.
- Ignore it :: Silent failure.
- Delete the logs :: Hides evidence.
> Failure needs a defined next step.
```

```cards
Verification :: Checking that an action actually removed the symptom
Settling time :: A short wait for the system to react before measuring
Guard metric :: A signal checked to catch harmful side effects
Rollback :: Restoring the state from before the action
Audit log :: A record of what ran, why, and with what result
```
