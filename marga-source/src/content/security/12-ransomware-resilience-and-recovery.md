---
title: Ransomware resilience, backups and recovery
minutes: 15
summary: Understand how ransomware attacks unfold, design immutable and isolated backups, rehearse recovery, and reduce the blast radius so one compromised account cannot encrypt everything.
---

Ransomware is a business problem more than a technical curiosity. Attackers get in, spend days or weeks learning the environment, delete or encrypt backups, and then lock the systems that the business needs, often after copying data to threaten its release. The strongest defence is not a single product. It is the ability to restore from copies that the attacker could not touch, and a design that limits how far one stolen account can go.

## What you will learn

- The typical stages of a ransomware attack
- The backup rule of 3-2-1 and why immutability matters
- Isolating backups and protecting their credentials
- Rehearsing recovery and measuring recovery time
- Reducing the blast radius before an attack happens

## How an attack unfolds

1. **Initial access**: a phished login, an exposed remote desktop, an unpatched internet-facing system or a stolen token.
2. **Discovery and privilege escalation**: the attacker maps the network, finds administrator credentials and the backup systems.
3. **Preparation**: they disable security tools, delete snapshots and backups, and copy sensitive data out.
4. **Impact**: encryption of servers and databases at the same moment, often at night or at a weekend.
5. **Extortion**: a demand for payment, with a threat to publish the stolen data.

Defences can break the chain at every step, and the backup stage decides how bad the outcome is.

## Backups that survive an attack

The common guideline is **3-2-1**: three copies of the data, on two kinds of media or services, with one copy off-site. For ransomware add two more ideas: one copy must be **immutable**, meaning it cannot be changed or deleted for a set time even by an administrator, and one copy must be **isolated**, meaning in a separate account or system with separate credentials.

```bash
# Object storage with a lock: objects cannot be deleted or overwritten for 30 days
aws s3api put-object-lock-configuration \
  --bucket acme-backups-locked \
  --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":30}}}'
```

In compliance mode nobody, including the account owner, can shorten the retention. That is exactly what you want when an attacker has the keys.

```predict
Q: An attacker obtains the credentials of a backup administrator. The backups are stored in the same account, with normal delete permission. What will they do before encrypting production?
???
Delete the backups and snapshots, so you cannot restore without paying.
> Backups stored with the same credentials as production are a target. Immutable storage, a separate account and separate administrators mean that a stolen login cannot erase them.
```

## Protect the backup system itself

- Separate credentials and multi-factor authentication for backup administration, not shared with the main directory.
- Network isolation: the backup network should not be reachable from ordinary workstations.
- Alert on backup deletions, retention changes and failed jobs.
- Encrypt backups, and keep the keys safe and separate, with their own recovery plan.

## Recovery you have practised

A backup that was never restored is a hope, not a plan. Define a recovery time objective (RTO) and a recovery point objective (RPO) for each system, and test them.

```console
$ ./restore-test.sh --system billing-db --point "2 hours ago" --target scratch
restore started 10:02:11
restore finished 10:47:40 (45m 29s)
verification: 18 of 18 checks passed
```

Write down the order of recovery, because systems depend on each other: identity and DNS first, then databases, then applications. Keep the recovery runbook and contacts offline, since the system that stores them may be encrypted too.

```diagram
title: Recovery order after a destructive attack
node: ident | Identity and DNS | 0 | 1 | Directory, authentication and name resolution. Everything else needs them. | If they are down or compromised, nothing else can be trusted or started.
node: net | Core network | 1 | 0 | Routing, firewalls and access for responders. | Rebuilt network rules must be clean, or the attacker may return.
node: data | Databases | 1 | 2 | Restored from immutable backups to a known good point. | Restoring too late a point brings back the malware; too early loses data.
node: apps | Applications | 2 | 1 | Rebuilt from signed images and code, not repaired in place. | Restoring infected binaries restarts the attack.
node: users | Users and traffic | 3 | 1 | Returned in stages after checks. | Opening everything at once can overload recovery and hide a second wave.
edge: ident | net
edge: ident | data
edge: net | apps
edge: data | apps
edge: apps | users
```

## Reduce the blast radius

- **Least privilege and tiered administration**: separate accounts for daily work and for administration, and none with rights everywhere.
- **Segmentation**: stop one infected workstation from reaching servers directly.
- **Patch and harden** internet-facing systems, and close remote desktop to the internet.
- **Endpoint detection** to stop encryption early, and alerts for mass file changes.
- **Immutable infrastructure**: servers that you rebuild from code are much easier to recover than hand-built ones.

## Incident: backups deleted first

> **Incident:** On a Saturday, monitoring shows hundreds of snapshot deletions in the cloud account, followed by encrypted virtual machines. The attacker used a stolen administrator token.

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteSnapshot --max-results 3
{"Events": [{"EventName": "DeleteSnapshot", "Username": "admin-ci", "EventTime": "2026-10-17T02:14:09Z"}]}
```

Contain first: disable the token, isolate affected hosts and block the address. Then restore from the copy in the separate account that has a retention lock. After recovery, move to short-lived credentials, remove delete rights from day-to-day roles, and add an alert on mass deletion events.

## Common mistakes

- Keeping backups reachable with the same credentials as production
- Never testing a restore, or testing only a small sample
- Storing the recovery plan only on systems that may be encrypted
- Paying without checking whether the data can be restored from backup

```quiz
Q: What does an immutable backup protect against?
- Slow networks
+ Deletion or change by an attacker, even one with administrator credentials, until the retention period ends
- Hardware failure only
- Weak passwords
> A retention lock means nobody can erase the data early, which defeats the attacker's usual first step.

Q: Why keep backups in a separate account with separate credentials?
- It is cheaper
+ A stolen production login cannot reach them
- It makes restores faster
- It removes the need for encryption
> Isolation limits the reach of a single compromised identity.

Q: What should you do regularly with backups?
- Nothing, once they are running
+ Restore them in a test and measure the time and the result
- Delete the oldest ones
- Copy them to a laptop
> Only a tested restore proves the backup works and shows how long recovery takes.

Q: In what order should recovery usually begin?
- Applications first
+ Identity and DNS, then network and databases, then applications
- Users first
- Backups last
> Other systems depend on identity and name resolution, so they must be trustworthy first.
```

```cards
What does 3-2-1 mean for backups? :: Three copies, on two kinds of storage, with one off-site
What is an immutable backup? :: One that cannot be changed or deleted until its retention time ends
Why isolate backups? :: So a compromised production account cannot delete them
What do RTO and RPO mean? :: Recovery time objective and recovery point objective: how long you can be down and how much data you can lose
Why rebuild instead of clean? :: Rebuilding from known good images avoids restoring the attacker's changes
```
