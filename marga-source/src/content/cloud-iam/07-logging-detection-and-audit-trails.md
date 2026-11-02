---
title: Logging, detection and audit trails
minutes: 12
summary: Record every control-plane action, protect the logs, and build alerts for the actions that signal trouble.
---

You cannot investigate what you did not record. Cloud providers log administrative actions: AWS CloudTrail, the Azure Activity Log, and Google Cloud Audit Logs. These logs tell you who did what, when, from where. Collected, protected and watched, they turn a breach from an unknown loss into a time-ordered story.

## What you will learn

- Enable organisation-wide audit logging
- Read an audit record
- Protect logs from tampering
- Alert on high-risk actions

## What to log

Management events (create, change, delete), data events for sensitive storage, sign-in logs from the identity provider, network flow logs, and application logs. Turn on audit logging in every account and region from day one, ideally centrally for the whole organisation.

## Reading a record

An audit record names the **principal**, the **action**, the **resource**, the **source address**, the **time** and whether it succeeded.

```json
{
  "eventTime": "2024-05-14T02:11:09Z",
  "eventName": "DeleteTrail",
  "userIdentity": { "type": "AssumedRole", "arn": "arn:aws:sts::123456789012:assumed-role/dev/anna" },
  "sourceIPAddress": "203.0.113.45",
  "errorCode": null
}
```

Deleting a trail at 02:11 from an unfamiliar address is exactly the kind of event to alert on.

## Protect the logs

Send logs to a separate account that few people can use. Make the storage append-only or write-once, enable integrity validation, and deny deletion. An attacker who can erase the log can hide the attack.

## Detect and respond

Start with a short list of alerts: use of the root account, a change to logging, new access keys for privileged users, a policy that grants administrator rights, a public resource, sign-ins from unusual places, and many denied requests. Use managed threat detection services as a baseline. Write a short runbook for each alert: who looks, what they check, and when to disable the identity.

```predict
Q: An alert shows someone disabled audit logging at night. What do you do first?
???
Treat it as an incident: identify the principal, restore logging, review recent actions by that principal and disable the identity if it is not legitimate.
> Logging changes are high risk.
```

## Incident: Logging was off

> **Incident:** During an investigation the team found a gap of nine days with no audit records.

```console
$ aws cloudtrail get-trail-status --name org-trail
IsLogging: false
LatestDeliveryTime: 2024-05-05T01:02:13Z
```

A cost-cutting change had stopped the trail. The team re-enabled it, added an organisation policy preventing anyone from stopping it, set an alert on the stop event, and sent copies to a locked-down log account.

## Common mistakes

- Logging only in some regions
- Logs in the same account anyone can edit
- No alert on logging changes
- Collecting logs nobody reads

```quiz
Q: What does an audit log show?
+ Who did what, when and from where
- Disk usage :: No.
- Prices :: No.
- Colours :: No.
> Control-plane story. Re-read the matching lesson section for the full reasoning.

Q: Where should logs be stored?
+ In a separate, protected account
- On the same server :: Erasable.
- In chat :: No.
- In a drawer :: No.
> Tamper resistance. Re-read the matching lesson section for the full reasoning.

Q: Which event should always alert?
+ Audit logging being stopped
- A user logging in :: Normal.
- A file read :: Normal.
- A tag edit :: Minor.
> Hiding tracks. Re-read the matching lesson section for the full reasoning.

Q: What does a runbook for an alert contain?
+ Who checks, what they check and when to disable access
- A poem :: No.
- A price list :: No.
- Nothing :: Useless.
> Make response fast. Re-read the matching lesson section for the full reasoning.
```

```cards
CloudTrail and Activity Log :: audit records
Principal, action, resource :: the core fields
Separate log account :: tamper resistance
Integrity validation :: detect edits
Alert :: logging changes, root use, admin grants
Runbook :: first steps written down
```
