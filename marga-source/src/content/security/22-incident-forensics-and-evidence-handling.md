---
title: Incident forensics and evidence handling
minutes: 13
summary: Preserve volatile evidence, collect logs and disk images safely, keep a chain of custody and build a timeline during a security incident.
---

When a system is compromised, the instinct is to wipe it and restore service. A calm few steps first preserve the evidence you need to understand scope, close the hole and meet legal duties.

## What you will learn

- The order of volatility and what to capture first
- Cloud evidence: snapshots, logs and access records
- Chain of custody and integrity
- Building a timeline and reporting

## Order of volatility

Collect the most fleeting data first: running processes and network connections, memory if feasible, then logs and temporary files, then disk contents. On a live Linux host:

```bash
date -u; hostname
ps auxwwf > /evidence/ps.txt
ss -tunap > /evidence/connections.txt
last -a > /evidence/logins.txt
journalctl --no-pager --since "-48h" > /evidence/journal.txt
sha256sum /evidence/* > /evidence/SHA256SUMS
```

Write to a separate, protected location, not the compromised disk. Avoid running tools that change many files, and note every command you run.

## Cloud evidence

```bash
aws ec2 create-snapshot --volume-id vol-0abc123 --description "IR-2026-1105 web-04 root"
aws ec2 modify-instance-attribute --instance-id i-0def456 --groups sg-quarantine
aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue=ci-deploy --max-results 50
```

Snapshot disks, **isolate** the instance with a quarantine security group instead of terminating it, and export audit logs and flow logs to a locked evidence bucket with retention.

## Chain of custody

Record who collected what, when, from where and how, and hash each item. Store originals read-only and work on copies. This protects the integrity of evidence if legal or regulatory action follows.

## Timeline

Merge events from cloud audit logs, authentication logs, host logs and network data into one UTC timeline: first access, actions taken, data touched and persistence. Mark what is confirmed and what is suspected. Involve legal and management early, and follow your notification obligations.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Incident forensics and evidence handling fits together
node: n1 | Order of volatility | 0 | 0 | Collect the most fleeting data first: running processes and network connections, memory if feasible, then logs and temporary files, then disk contents. | Writing evidence to the compromised disk. | process
node: n2 | Cloud evidence | 1 | 1 | Snapshot disks, isolate the instance with a quarantine security group instead of terminating it, and export audit logs and flow logs to a locked evidence bucket with... | Terminating or reimaging before collecting evidence. | external
node: n3 | Chain of custody | 2 | 0 | Record who collected what, when, from where and how, and hash each item. | Informing legal late. | process
node: n4 | Timeline | 3 | 1 | Merge events from cloud audit logs, authentication logs, host logs and network data into one UTC timeline: first access, actions taken, data touched and persistence. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Wiped before anyone looked

> **Incident:** A compromised server was reimaged immediately and evidence was lost.

```console
action: terminate instance i-0def456
disk snapshots: none
host auth logs: gone, data accessed: unknown
```

Restoring service was urgent, so the instance was terminated. Later the team could not prove which records the attacker saw, which affected notifications. Their new runbook quarantines first, snapshots disks and exports logs before any rebuild.

## Common mistakes

- Terminating or reimaging before collecting evidence
- Writing evidence to the compromised disk
- Not hashing or documenting collection
- Informing legal late

```quiz
Q: What do you collect first?
+ Volatile data such as processes and connections
- Old backups :: No.
- Disk labels :: No.
- Logos :: No.
> It disappears on reboot.

Q: How should you isolate a cloud instance?
+ Quarantine group, not termination
- Delete the VPC :: No.
- Stop logging :: No.
- Ignore it :: No.
> Preserve evidence. The lesson section above explains why.

Q: What does a hash show?
+ The evidence was not altered
- The attacker :: No.
- The time :: No.
- The cause :: No.
> Integrity. The lesson section above explains why.

Q: Why a timeline?
+ To understand what happened and in what order
- To assign blame :: No.
- To delete logs :: No.
- To reduce cost :: No.
> Correlate sources. The lesson section above explains why.
```

```cards
Order of volatility :: Collecting the most temporary data first
Chain of custody :: Record of handling evidence
Quarantine :: Isolating a system while preserving it
Timeline :: Ordered record of incident events
```
