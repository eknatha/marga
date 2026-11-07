---
title: Backup and DR: strategy, the 3-2-1 rule and retention
minutes: 12
summary: Design a backup strategy from recovery objectives, apply the 3-2-1 rule, choose full, incremental and snapshot methods, and set retention that matches business needs.
---

A backup is only useful if it lets you restore what you need, within the time you can afford, from a copy that survived the same disaster. Strategy starts from those requirements, not from the tool.

## What you will learn

- Define what to protect and how fast you must recover
- The 3-2-1 rule and its modern variations
- Full, incremental, differential and snapshot backups
- Retention, encryption and cost

## Start from objectives

For each system write down the **RPO** (how much data loss is acceptable) and the **RTO** (how long recovery may take). A reporting database with an RPO of 24 hours can use a nightly backup. A payments database with an RPO of one minute needs continuous log shipping or replication in addition. List what must be backed up: data, but also configuration, infrastructure code, secrets, certificates, DNS zones, and the runbooks and credentials needed to restore. A restore that needs a password stored only inside the system that failed is not a plan.

## The 3-2-1 rule

Keep **3** copies of your data (the original plus two backups), on **2** different kinds of media or services, with **1** copy off-site (another region, account or provider). Modern advice adds: **1** copy that is offline or immutable, and **0** errors after verified restores (3-2-1-1-0). The point is independence: a failure, a mistake or an attacker should not be able to reach all copies by the same path. A replica is not a backup, because it copies a deletion or corruption within seconds.

## Methods

- **Full**: a complete copy. Simple to restore, but large and slow.
- **Incremental**: only changes since the last backup of any kind. Small and fast to take, but a restore needs the whole chain.
- **Differential**: changes since the last full. Middle ground.
- **Snapshots**: point-in-time copies in the storage layer. Very fast, but usually stored near the source, so they are not a complete answer on their own.
- **Deduplicating tools** (restic, borg, pgBackRest, cloud backup services) store changed blocks once and make frequent backups cheap.

```console
$ restic -r s3:s3.amazonaws.com/example-backups init
$ restic -r s3:s3.amazonaws.com/example-backups backup /srv/data --tag nightly
$ restic -r s3:s3.amazonaws.com/example-backups snapshots
$ restic -r s3:s3.amazonaws.com/example-backups forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
```

## Retention and cost

Keep recent backups often and older ones rarely: for example 7 daily, 4 weekly and 12 monthly, with legal or audit requirements overriding. Longer retention helps you find slow corruption and mistakes noticed late, but it costs storage and increases the amount of personal data you hold. Encrypt backups, keep the keys separately from the data (and back up the keys safely too), restrict who can delete, and tag backups with owner and retention.

```predict
Q: A team says "we have replicas in three zones, so we don't need backups". What happens if someone runs DROP TABLE?
???
The deletion replicates to all copies within seconds. Replicas protect against hardware failure, not against mistakes, bugs or attacks. Backups with history do.
> Replication is not backup.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Backup and DR: strategy, the 3-2-1 rule and... fits together
node: n1 | Start from objectives | 0 | 0 | For each system write down the RPO (how much data loss is acceptable) and the RTO (how long recovery may take). | Backing up data but not configuration, keys and runbooks. | process
node: n2 | The 3-2-1 rule | 1 | 1 | Keep 3 copies of your data (the original plus two backups), on 2 different kinds of media or services, with 1 copy off-site (another region, account or provider). | Storing backups where the same credentials can delete them. | process
node: n3 | Methods | 2 | 0 | Full: a complete copy. Simple to restore, but large and slow. | Treating replication as backup. | process
node: n4 | Retention and cost | 3 | 1 | Keep recent backups often and older ones rarely: for example 7 daily, 4 weekly and 12 monthly, with legal or audit requirements overriding. | Keeping encryption keys only inside the system being protected. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The backup in the same account

> **Incident:** After an administrator's credentials were stolen, the attacker deleted a production database and, with the same access, its backups.

```console
$ aws s3 ls s3://prod-db-backups/
$ aws s3api list-object-versions --bucket prod-db-backups --max-items 3
```

Backups lived in the same cloud account, in a bucket the same administrators could empty. The company recovered only from a six-week-old export held by a partner. Afterward it copied backups into a separate account that production credentials could not write to or delete from, enabled object versioning with a retention lock, and added alerts on backup deletion.

## Common mistakes

- Treating replication as backup
- Storing backups where the same credentials can delete them
- Backing up data but not configuration, keys and runbooks
- Keeping encryption keys only inside the system being protected

```quiz
Q: What does the 3-2-1 rule say?
+ Three copies, on two kinds of storage, with one copy off-site
- One copy, two places, three tests :: Not the rule.
- Three servers, two admins, one password :: Not the rule.
- Keep backups for 3 days, 2 weeks, 1 year :: That is retention.
> Independence of copies is the goal.

Q: Why is a replica not a backup?
+ It faithfully copies deletions and corruption almost immediately
- It is too slow :: Replication is fast.
- It is too large :: Not the issue.
- It cannot be encrypted :: It can.
> Backups keep history.

Q: What does RPO decide?
+ How often you must capture data
- How many servers you buy :: Not directly.
- The color of dashboards :: Unrelated.
- The DNS TTL :: Unrelated.
> Data-loss tolerance sets backup frequency.

Q: Which restore is slowest if you take daily incremental backups after a weekly full?
+ One at the end of the week, needing the full plus all increments
- One right after the full :: Fastest.
- A restore of config only :: Different case.
- None, they are equal :: Chains add steps.
> Chains add restore work.
```

```cards
3-2-1 :: three copies, two media, one off-site
RPO and RTO :: acceptable data loss and recovery time
Immutable copy :: cannot be deleted or changed for a set time
Replica :: availability tool, not a backup
Back up too :: config, keys, DNS zones and runbooks
```
