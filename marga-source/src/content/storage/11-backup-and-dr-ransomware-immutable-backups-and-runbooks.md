---
title: Backup and DR: ransomware, immutable backups and recovery runbooks
minutes: 12
summary: Defend backups against deletion and encryption with immutability, separate accounts and access control, and write a runbook people can follow under pressure.
---

Attackers know that backups are the last line of defense, so they try to find and destroy them first. A modern backup design assumes that an administrator account may be compromised, and keeps at least one copy that nobody can change or delete during its retention period. Preparing the recovery runbook before the event matters just as much as the technology.

## What you will learn

- How attacks target backups and what stops them
- Immutability, object lock and air gaps
- Separate accounts, least privilege and monitoring
- A recovery runbook and an order of restoration

## What attackers do

A typical attack gains credentials, spreads, steals data, deletes or encrypts backups and then encrypts production. They look for backup consoles, backup servers joined to the same directory, storage buckets with write and delete rights, and snapshots in the same account. Defenses must therefore break the link between "can reach production" and "can destroy backups".

## Immutable and isolated copies

- **Immutability / object lock / WORM**: the storage refuses deletes and overwrites until a retention date, even for administrators in the retention-lock mode. Cloud object stores, backup appliances and tape libraries support this.
- **Separate account or provider**: backups live in an account with different credentials and a separate identity, reached only by a narrow write-only role from production.
- **Air gap**: offline media or a logically isolated vault that is not reachable during normal operations.
- **Versioning plus MFA delete** and long enough retention that you can go back before the attacker arrived. Attackers often wait weeks.

```console
$ aws s3api put-bucket-versioning --bucket dr-vault-backups --versioning-configuration Status=Enabled
$ aws s3api put-object-lock-configuration --bucket dr-vault-backups --object-lock-configuration '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"COMPLIANCE","Days":35}}}'
$ aws s3api get-object-lock-configuration --bucket dr-vault-backups
```

Object lock is normally enabled when the bucket is created, and compliance mode cannot be shortened by anyone, so choose retention carefully. Alert on any delete, policy change or failed backup, and keep the backup system's own admin accounts under separate, strongly authenticated control.

## The recovery runbook

Write it before you need it, store it where it is reachable when systems are down (printed copy, offline copy, separate system), and include:

1. **Who decides and who does**: incident lead, communications lead and technical leads with phone numbers that do not depend on company systems.
2. **Contain first**: isolate affected systems and accounts, rotate credentials, and preserve evidence for investigation. Restoring into an environment that is still compromised wastes the restore.
3. **Order of restoration**: identity and DNS, networking, secrets and certificates, data stores, then applications, by dependency and business priority.
4. **Clean restore points**: how to choose a backup from before the compromise, and how to scan restored data.
5. **Verification and sign-off**: checks that each service is correct before it takes traffic.

```predict
Q: Your backups sit in a bucket that the production admin role can delete from. What is the weakness?
???
A compromised admin can delete production and backups together. Use a separate account with a write-only path and object lock so nobody can delete within retention.
> Separate the ability to write from the ability to delete.
```

## Incident: Restoring into a compromised network

> **Incident:** After a ransomware attack, a company restored its servers from backup within a day, and they were encrypted again two hours later.

```console
$ last -n 3
admin pts/0 203.0.113.55 Mar 4 01:12 still logged in
$ crontab -l -u svc-backup
*/5 * * * * /tmp/.cache/agent
```

The attacker's persistence (a stolen service account and a scheduled task) was still in place. Backups were good, but the environment was not clean. The company rebuilt identity and rotated all credentials first, restored into a new network segment from a point before the first compromise, scanned the data and brought services back in dependency order. Their new runbook starts with containment and has checklists for each step.

## Common mistakes

- Backups reachable with the same credentials as production
- Retention shorter than the time attackers stay hidden
- Restoring before containing the intrusion
- A runbook that exists only on systems that are down

```quiz
Q: What does object lock in compliance mode provide?
+ Objects cannot be deleted or overwritten until retention ends, even by admins
- Faster downloads :: Not its purpose.
- Free storage :: Not its purpose.
- Automatic restores :: Not its purpose.
> It enforces immutability.

Q: Why use a separate account for backups?
+ Production credentials then cannot delete or alter them
- To reduce latency :: Not the aim.
- To avoid encryption :: You should still encrypt.
- To skip testing :: Never skip testing.
> Break the attack path.

Q: What should come first in a ransomware recovery?
+ Contain the intrusion and secure identity before restoring
- Restore everything immediately :: May be encrypted again.
- Delete the logs :: Destroys evidence.
- Pay quietly :: Not a plan.
> A clean environment is a prerequisite.

Q: Where should the recovery runbook be stored?
+ Somewhere reachable when company systems are down, including offline
- Only on the file server that was encrypted :: Unreachable.
- In someone's memory :: Unreliable.
- Nowhere :: No plan.
> Plan for the failure of your own tools.
```

```cards
Immutable backup :: cannot be changed or deleted until retention ends
Separate account :: production access cannot reach the vault
Air gap :: copy not reachable in normal operation
Containment :: isolate and rotate credentials before restoring
Restore order :: identity, network, secrets, data, applications
```
