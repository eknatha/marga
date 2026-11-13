## Restart storm
level: junior
An auto-restart rule fires for a service with twelve pods.

```text
$ autoremediate history --action restart-pod --hours 1
runs: 41  distinct pods: 12  healthy replicas now: 1
rate limit: none
```
? What is the main fault in the rule?
+ It has no rate limit or healthy-replica precondition
- The pods are too small
- The alert name is too long
- The service has too many labels
why: Without a cap and a precondition, a repeating trigger restarts almost every pod. Limit runs per hour and keep at least two healthy replicas.

## Success without a check
level: junior
A scale-out action reports success.

```text
action: scale-out api 6 -> 18   exit code: 0
symptom: p95 latency 1400ms -> 900ms
guard: db_connections_used/max = 0.99
```
? Should the run be marked successful?
+ No, the connection guard is over its limit, so undo it and escalate
- Yes, the exit code is zero
- Yes, latency improved
- Only if it happened at night
why: A fix must not harm other parts. A guard metric over its limit makes the run a failure even if the symptom improved.

## The switch that did nothing
level: mid
An engineer set the global automation flag to disabled, but actions continue.

```text
automation_enabled: false (set 11:42)
last action: rollback checkout 11:47
worker log: flag loaded at startup 09:00
```
? What is the cause?
+ The worker reads the flag only at startup
- The flag store is down
- The rollback is a Tier 0 action
- The audit log is full
why: A switch that is cached does not stop a running worker. Check the flag before every action and fail closed if it cannot be read.

## The deprecated runbook
level: mid
An assistant gave a command that no longer exists.

```text
1 payments/worker-restart-vm.md   status: deprecated  reviewed: 2023-02-01  score 0.71
2 payments/worker-restart-k8s.md  status: active      reviewed: 2026-08-19  score 0.68
```
? What change prevents this?
+ Filter out deprecated documents and show the review date beside every command
- Use a bigger model
- Remove citations
- Index fewer services
why: Retrieval must prefer current documents. A status filter and visible review dates catch stale sources.

## Blocked request
level: senior
An agent's log shows two blocked calls.

```text
step 6  tool: fetch_url  host: collector.attacker.example  BLOCKED (host not allowed)
step 7  tool: send_message  contains_secret_pattern  BLOCKED
```
? What does this tell you?
+ A hostile instruction reached the model, and host-side policy stopped it, so review how it got in and add it to the injection tests
- The model is broken and must be replaced
- The allowlist is too strict
- Nothing, blocks are normal
why: The host policy worked. Trace the source of the text, add the string to the regression set and check that no secrets are visible to the model.

## Great demo, poor month
level: senior
A root cause ranker is evaluated.

```text
cases: 64   top-1: 41%   top-3: 69%
demo cases only (8): top-1: 88%
```
? What should happen before wider rollout?
+ Return to shadow mode, fix the data gaps and move on only when top-3 meets the target
- Roll out because the demo was strong
- Report the 88 percent figure
- Remove the messy cases
why: The full set, including messy incidents, is the honest measure. Gates written in advance prevent promoting a tool on its best cases.

## Ninety-eight percent success
level: senior
An auto-restart action looks excellent on a dashboard.

```text
runs: 1640  verified-ok: 1612 (98%)
repeats on the same target in a day: 1204
median uptime between restarts: 3h 40m
```
? What is the real finding?
+ A leak is being hidden, so escalate repeats and capture evidence before each restart
- The action is very effective
- The success rate should be 100 percent
- The pods are too old
why: Repeated fixes mean the cause is still present. Count repeats, capture a heap profile and fix the leak.
