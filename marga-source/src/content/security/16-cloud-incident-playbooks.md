---
title: Cloud security incident playbooks
minutes: 13
summary: Prepare short playbooks for the common cloud incidents: leaked keys, public storage and compromised workloads.
---

At 02:00 an alert says an access key from your account is being used from another continent. You have minutes before data leaves. A playbook turns panic into steps: contain, preserve evidence, remove access, recover and learn. Writing it now costs an afternoon, and writing it during the incident costs the night.

## What you will learn

- The phases of cloud incident response
- Playbook: leaked access key
- Playbook: publicly exposed storage
- Playbook: compromised instance or container, and the habits that help

## Phases

1. **Detect and triage**: is it real, how large, what is affected?
2. **Contain**: stop the damage without destroying evidence.
3. **Preserve evidence**: snapshots, logs, memory if possible.
4. **Eradicate and recover**: remove the attacker, rotate secrets, restore clean systems.
5. **Learn**: blameless review and fixes.

Decide in advance who leads, who communicates, and who may take disruptive actions such as disabling a production role. Keep a separate, trusted account or channel for the response team in case the main one is compromised.

## Playbook: leaked access key

```console
$ aws iam update-access-key --user-name ci-bot --access-key-id AKIA... --status Inactive
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA... \
    --max-results 50
$ aws iam list-user-policies --user-name ci-bot
```

Deactivate (do not delete yet) the key, so you keep the record. Search the audit log for everything the key did: new users, new keys, changed policies, data reads, new compute. Revoke sessions that were created from it. Check for persistence, such as new roles or access keys, and remove them. Then rotate any secret that the key could read. Finally, find out how it leaked, for example a public repository or a log file.

## Playbook: exposed storage

Block public access at once, then work out the exposure. Turn on the account-level block, check access logs for who read what and when, and decide whether the data was sensitive. If personal data was exposed, legal and privacy teams need to know early because deadlines may apply. Fix the cause (a template that allowed public buckets) and add a preventive control, such as a policy that denies creating public buckets.

## Playbook: compromised workload

Isolate rather than delete: change the security group to deny all traffic except from the investigation host, or apply a deny-all network policy to the pod. Snapshot the disk, collect logs, and keep the instance running if memory evidence matters. Remove its role permissions. Replace the workload from a known-good image, then investigate offline. Look at what the workload's role could reach, because that defines the possible damage.

Habits that help: central immutable audit logs, short-lived credentials, tested break-glass access, and a practice incident each quarter.

```predict
Q: Why deactivate a leaked key before deleting it?
???
Deactivation stops use but keeps the key record and its audit trail for the investigation.
> Containment should not destroy evidence.
```

## Incident: Keys in a public repository

> **Incident:** A developer pushed a script with a long-lived key to a public code-sharing site. Within 20 minutes the account had 40 new compute instances mining coins.

```console
$ aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query "length(Reservations[].Instances[])"
43
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=RunInstances --max-results 3
```

The on-call engineer followed the playbook: key deactivated in four minutes, instances stopped and snapshotted, and CloudTrail searched for new users and roles. A rogue access key on a second user was found and removed. The company replaced long-lived keys with short-lived role credentials, added secret scanning before commits, and set budget alarms that page on sudden spend.

## Common mistakes

- No written playbook or owner
- Deleting evidence while containing
- Rotating one key and forgetting the persistence the attacker added
- Not knowing who may disable production access

```quiz
Q: What should you do first with a leaked key?
+ Deactivate it and review its activity in the audit log
- Ignore it until Monday :: Damage grows quickly.
- Delete all logs :: That destroys evidence.
- Post it in chat :: That spreads it.
> Contain and investigate.

Q: Why isolate a compromised instance instead of deleting it?
+ You keep evidence for investigation while stopping the harm
- Deleting is not possible :: It is possible.
- Isolation is cheaper :: The reason is evidence.
- The attacker needs it :: Not true.
> Preserve evidence.

Q: What prevents the exposed storage problem in the future?
+ A preventive policy that denies public buckets, plus account-wide blocking
- A longer password :: Unrelated.
- More dashboards :: Detection alone is not prevention.
- A bigger instance :: Unrelated.
> Fix the cause, not only the incident.

Q: Which credentials reduce the impact of leaks?
+ Short-lived role credentials
- Shared admin keys :: They increase impact.
- Keys in scripts :: They leak.
- Never-expiring tokens :: They stay useful to attackers.
> Expiry limits damage.
```

```cards
Incident phases :: detect, contain, preserve, recover, learn
Leaked key :: deactivate, audit, remove persistence, rotate
Exposed bucket :: block public access, check logs, tell privacy team
Compromised workload :: isolate, snapshot, replace
Prevent :: short-lived credentials and budget alarms
```
