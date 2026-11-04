# Model answer: backup and disaster recovery
prompt: backup-dr
summary: Define recovery objectives, back up with several copies including an isolated one, and rehearse restores.

## The answer in one minute

Start from the recovery time and recovery point each system needs, follow the 3-2-1 rule with an immutable copy, back up data and configuration, automate restore tests, and write and rehearse a runbook including who decides to fail over.

## The design

```diagram
title: Backup and disaster recovery design
node: sys | Production systems | 0 | 1 | Databases, files, configuration. | Unknown systems are unprotected.
node: sch | Backup scheduler | 1 | 1 | Full, incremental and WAL. | Missed jobs go unnoticed.
node: loc | Local backup copy | 2 | 0 | Fast restore for common problems. | Same site as production.
node: off | Offsite immutable copy | 2 | 2 | Another region with object lock. | Slow to restore.
node: tst | Restore tests | 3 | 1 | Automated restores and checks. | Never tested means unknown.
node: dr | DR site or region | 4 | 0 | Warm or cold standby. | Capacity and drift.
node: run | Runbooks and drills | 4 | 2 | Decisions, roles, steps. | Stale documents.
edge: sys | sch
edge: sch | loc
edge: sch | off
edge: loc | tst
edge: off | tst
edge: tst | dr
edge: dr | run
```

## Every component, explained

### RPO and RTO

Recovery point objective is how much data you may lose, and recovery time objective is how long you may be down. They decide the design and cost.

Example: A payments database has an RPO of 1 minute and an RTO of 15 minutes; a wiki has 24 hours and 2 days.

### 3-2-1 and immutability

Keep 3 copies on 2 kinds of media with 1 offsite. An immutable copy cannot be deleted by an attacker with admin access.

Example: Ransomware encrypts production and the local backups, and the locked offsite copy is untouched.

### Continuous archiving

Shipping the log continuously reduces data loss to seconds and allows point-in-time recovery.

Example: The team restores to 10 seconds before a bad migration.

### Restore tests

A scheduled job restores a sample and checks counts and queries, because a backup that cannot be restored is useless.

Example: A weekly restore finds a missing table before a real disaster does.

### DR drills

The team practises a failover with roles, a decision point and a communications plan.

Example: A game day fails over a service to the DR region in 40 minutes and finds a missing DNS step.

## Numbers to say out loud

- A 10 TB database with a 1 hour RTO needs restore throughput above 3 GB a second, or a replica instead of a restore.
- Daily changes of 5 percent mean 500 GB of incrementals a day.
- Offsite bandwidth must carry the daily change within the backup window.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Backup never ran | No data | Alert on missing success |
| Corrupt backup | Failed restore | Verification and test restores |
| Ransomware | Backups deleted | Immutable copies and separate credentials |
| DR capacity short | Slow recovery | Tested capacity or on-demand plans |
| Forgotten dependency | Partial recovery | Dependency map and drills |

## Follow-up questions to expect

- How is DR different from high availability?
- How much does each nine cost?
- What do you back up besides data?
