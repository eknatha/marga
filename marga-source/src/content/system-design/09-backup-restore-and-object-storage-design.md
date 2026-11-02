---
title: Backup, restore and object storage design
minutes: 14
summary: Design backups you have actually restored, protect them from the failure that took the original, and use object storage for what it is good at.
---

A backup is a hypothesis that you can recover. It becomes a fact only when you restore it, and the failure that takes your data often takes the backups with it. This lesson covers how to design for recovery: what to copy, where, how long it takes, and how to prove it.

## What you will learn

- Set backup frequency and retention from RPO and RTO
- Apply the 3-2-1 idea and keep copies independent of the failure
- Test restores and measure real recovery time
- Use object storage well: durability, versioning, lifecycle and consistency

## Start from RPO and RTO

RPO says how much data you can lose, so how often you must capture changes. RTO says how long you can be down, so how fast a restore must be. A 5 minute RPO needs continuous log shipping or point-in-time recovery, not a nightly dump. A 1 hour RTO for 2 TB needs a restore path that moves 2 TB in well under an hour: at 200 MB per second, 2 TB takes about 2.8 hours, so a nightly full restore alone fails the target and you need replicas, snapshots or a hot standby.

## Kinds of copies

- **Replicas:** protect against node failure, but replicate deletes and corruption instantly.
- **Snapshots:** fast and cheap, often in the same account and failure domain.
- **Backups with point-in-time recovery:** a base copy plus a log of changes, so you can restore to a moment before a mistake.
- **Archives:** long retention for compliance, slow to restore.

Replication is not backup. A script that deletes the wrong thing deletes it everywhere within seconds. In April 2022 a script given the wrong kind of identifier deleted 883 customer sites at Atlassian, and full restoration took until 18 April; the case file explains why restoring many individual sites was a long, careful process. Plan restores for the unit you could lose, not only for a whole database.

## Independence

Keep at least one copy that a single event cannot reach: another account, another region and, for important data, another provider. Protect it with separate credentials and write-once or versioned storage so an attacker or a bad script cannot erase it. In May 2024 UniSuper's cloud subscription was deleted by a provisioning misconfiguration that spanned both of its geographies; backups held with another provider were part of how it recovered over days. Whatever name you give it, the principle is the same: a backup in the same account and control plane as the data shares its fate.

## Test restores

Schedule regular restore tests, automatically if possible, to a clean environment. Measure the real time, check data integrity (row counts, checksums, an application smoke test), and record it against the RTO. Practise the unpleasant cases: restoring to a point in time, restoring a single table, restoring when the primary credentials are unavailable. A backup job that reports success proves only that a file was written. In August 2023 Toyota's backup system failed along with the main system after a disk space error, so there was no automatic switchover; the case file has the details.

## Object storage by design

Object stores hold large amounts of data cheaply and durably, with high availability and simple APIs. Know their shape: objects are immutable blobs addressed by key, not files you edit in place; listing is slower than lookup; per-prefix request rates can matter; consistency models vary by provider, so read the documentation instead of assuming. Use features that match your need:

- **Versioning** to recover from overwrites and deletes
- **Lifecycle rules** to move data to cheaper classes and expire it
- **Object lock or write-once** for protection against deletion
- **Cross-region replication** for disaster recovery, remembering it copies mistakes too
- **Access policies and encryption** with least privilege, and no public access by default

Design keys to spread load and to be listable by prefix (for example tenant and date). Keep a catalogue of metadata elsewhere if you need rich queries.

## Cost and retention

Retention is a cost and a risk: long retention of personal data is a liability. Choose per dataset how long to keep it and write it down. Count restore costs too, since retrieving from deep archive tiers can be slow and charged per request or per gigabyte.

```predict
Q: The nightly backup job reports success every day. A table is dropped by mistake at 14:00. What do you check first, and what might you find?
???
Whether a restore from that backup has ever been tested and whether point-in-time recovery exists. You may find the backup is a nightly dump that loses 14 hours of data, or that it cannot be restored within the RTO or at all.
> Success of the job is not success of recovery.
```

## How it fails

Backups in the same failure domain. Backups that were never restored. Credentials needed for restore kept only in the system being restored. Retention that deleted the good copy before the corruption was noticed. A restore that takes 3x the RTO.

## Incident: The restore nobody had timed

> **Incident:** After a destructive change, the team restored from backup and found it would take far longer than the business could accept.

```console
$ pg_restore -j 8 --dbname=app /backups/app-2026-10-28.dump
... 2h 41m elapsed ...
$ echo "RTO target: 60 minutes"
RTO target: 60 minutes
```

This is a simulated illustration. The real cases with related lessons are the Atlassian site deletion in 2022 and the UniSuper subscription deletion in 2024. The change that followed in a design like this is a warm standby or snapshots for fast recovery, point-in-time recovery for precision, and a scheduled timed restore.

## Interview question

"How do you design backups for a 5 TB database with RPO 5 minutes and RTO 1 hour?" Continuous log shipping to an independent account, regular snapshots, a standby for fast failover, a monthly timed restore test, and monitoring on backup age and restore duration.

## Common mistakes

- Treating replicas as backups
- Backups in the same account and control plane
- Never timing a restore
- No protection against deletion of the backups

```quiz
Q: Why is replication not a backup?
+ A bad delete or corruption is copied to replicas within seconds
- Replicas are always slower :: Not the reason.
- Replicas cost more :: Not the reason.
- Replicas cannot be encrypted :: They can.
> Correct: A bad delete or corruption is copied to replicas within seconds. Re-read the matching lesson section for the full reasoning.

Q: What proves a backup works?
+ A restore test with measured time and integrity checks
- The job reporting success :: It proves a file was written.
- A large file size :: Not proof.
- A green dashboard :: Not proof.
> Correct: A restore test with measured time and integrity checks. Re-read the matching lesson section for the full reasoning.

Q: What does a 5 minute RPO require?
+ Continuous change capture such as log shipping or point-in-time recovery
- A nightly dump :: Loses up to a day.
- A weekly snapshot :: Loses up to a week.
- Longer retention :: Does not set RPO.
> Correct: Continuous change capture such as log shipping or point-in-time recovery. Re-read the matching lesson section for the full reasoning.

Q: What makes a backup independent?
+ Another account and control plane, with separate credentials and deletion protection
- A different folder :: Same failure domain.
- A different file name :: No.
- A second job in the same account :: Same failure domain.
> Correct: Another account and control plane, with separate credentials and deletion protection. Re-read the matching lesson section for the full reasoning.
```

```cards
3-2-1 :: three copies, two media, one off-site idea
point-in-time recovery :: restore to a chosen moment
object lock :: write-once protection against deletion
lifecycle rule :: automatic tiering and expiry
restore test :: timed recovery to a clean environment
versioning :: keep old object versions
```
