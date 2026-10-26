---
title: Threat detection and security logging
minutes: 14
summary: Decide what to log, centralise and protect it, write detections that matter, reduce false positives, and use frameworks such as ATT&CK to find coverage gaps.
---

Prevention fails sometimes, and the question then is how fast you notice. Many breaches last months before discovery, because logs were missing, scattered or never looked at. Detection engineering turns logs into signals that a small team can act on.

## What you will learn

- What to log in cloud, Kubernetes, hosts and applications
- Protecting and centralising logs
- Writing detection rules and testing them
- Reducing noise and handling alerts
- Mapping coverage with ATT&CK

## What to log

| Source | Events worth keeping |
|--------|----------------------|
| Cloud control plane | Logins, role assumption, policy changes, key creation, resource deletion, public exposure |
| Identity provider | Sign-ins, failures, multi-factor changes, new devices, impossible travel |
| Kubernetes | API audit log: exec into Pods, secret reads, RBAC changes, privileged Pods |
| Hosts and containers | Process start, privilege escalation, new users, network connections, file changes in sensitive paths |
| Network | DNS queries, flow logs, proxy and firewall decisions |
| Applications | Authentication, authorisation failures, admin actions, input validation errors |
| CI/CD | Pipeline changes, secret use, who approved a deployment |

Include who, what, where from, when, and result. Use synchronised clocks and a common format with consistent field names.

## Protect the logs

Attackers delete logs. Send them off the system quickly to a central store in a separate account that workload administrators cannot change. Make them tamper-evident (object lock, hash chains, write-once storage), restrict who can read them (logs contain sensitive data), and set retention that satisfies investigations and rules (often a year or more for audit logs).

## Detections

Good detections look for behaviour that is rare and meaningful for your environment:

- A root or break-glass account signs in
- A new access key is created for a user who has never had one
- A role is assumed from a country or network never seen before
- Audit logging is disabled or a log bucket policy changes
- A Pod is started with host networking, or a shell runs in a production container
- Many failed logins followed by a success
- Large data download by a service that normally uploads

```yaml
title: Cloud audit logging disabled
logsource: { product: cloud, service: audit }
detection:
  selection:
    eventName: [StopLogging, DeleteTrail, UpdateTrail]
  condition: selection
level: high
```

Rules written in a shared format (such as Sigma) can be converted for your tools. Keep them in version control with tests: a sample of the event that should fire, and events that should not.

## Fewer false alarms

Alerts nobody trusts are worse than none. Tune rules with allow lists for known automation, attach context (who, from where, what changed, links to the user's recent activity), rate-limit repeats, and track precision: of the alerts last month, how many were real? Retire rules that never produce action. Prioritise by impact: a new admin on a production account beats a failed login.

## Response links

Each detection needs a short runbook: what it means, how to confirm, how to contain, and who to call. Practise with simulated events (a canary access key whose use alerts immediately is cheap and effective, and so is a canary file or database record).

## Coverage with ATT&CK

MITRE ATT&CK catalogues attacker techniques by stage. Map your detections to techniques and look for stages with none (for example persistence, credential access, exfiltration). Use it as a map for gaps, not as a score to maximise.

```predict
Q: An attacker with admin rights in an account turns off audit logging. Which design lets you still see the attack?
???
Logs already shipped to a separate central account the attacker cannot reach, plus an alert on the attempt to stop logging.
> Evidence and alerting must live outside the system that may be compromised.
```

## Incident: found after seven months

> **Incident:** An external researcher reports that a company's storage bucket was public, and investigators cannot tell who accessed it.

```console
$ aws s3api get-bucket-logging --bucket customer-exports
{}
$ aws cloudtrail describe-trails --query 'trailList[].Name'
[]
```

Neither data-event logging nor audit trails were enabled, so there was no record of access. The company enabled organisation-wide audit logs into a locked account, turned on object-level logging for sensitive buckets, added detections for public exposure, and placed canary tokens in key data stores.

## Common mistakes

- Logging that is on but never read
- Logs stored where an attacker can delete them
- Detections without runbooks
- Counting rules rather than measuring useful alerts

```quiz
Q: Why ship logs to a separate account quickly?
+ An attacker who controls a system can erase local logs
- It saves disk :: Not the reason.
- It speeds up applications :: Unrelated.
- It hides logs from auditors :: Opposite.
> Remote, protected storage preserves evidence.

Q: Which event is worth an alert in a cloud account?
+ Audit logging being disabled
- A successful read of public documentation :: Not suspicious.
- A scheduled backup :: Normal.
- A health check :: Normal.
> Disabling logs is a common attacker step.

Q: How do you reduce false positives?
+ Add context, tune with known automation and measure precision
- Turn off alerts :: You lose detection.
- Add more alerts :: More noise.
- Ignore them :: They pile up.
> Tune using feedback.

Q: What is ATT&CK mainly useful for here?
+ Finding gaps in detection coverage by attacker technique
- Encrypting logs :: Unrelated.
- Patching systems :: Unrelated.
- Training models :: Unrelated.
> It is a catalogue to map against.
```

```cards
Why centralise logs? :: Attackers delete local logs
What fields should an event have? :: Who, what, where from, when, result
What is a canary token? :: A decoy credential or record that alerts when used
What is Sigma? :: A shared format for detection rules
How to measure alert quality? :: Precision: share of alerts that were real
```
