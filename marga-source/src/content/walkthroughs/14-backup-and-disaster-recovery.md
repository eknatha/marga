# A backup and disaster recovery design
level: Intermediate
modules: sre, databases, linux
lessons: databases/backups-and-recovery, sre/production-readiness-reviews, linux/disks-and-filesystems
summary: How a service protects its data with layered backups, tests restores regularly and agrees recovery targets in advance.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Recover from deleted data, corruption and a lost site
- Meet agreed targets for data loss (RPO) and recovery time (RTO)
- Keep backups safe from the same attacker or mistake that hurt production
- Know that restores actually work

## The big picture

```diagram
title: Backup and disaster recovery reference design
node: app | Production service | 0 | 1 | Writes data to the primary database and file storage. | A bug can write bad data that gets backed up too.
node: db | Primary database | 1 | 1 | The live data. | A single copy is a single failure.
node: wal | Continuous log shipping | 2 | 0 | Sends change logs to storage every minute. | A broken shipping job silently widens the data-loss window.
node: snap | Scheduled snapshots | 2 | 1 | Full or incremental copies at set times. | Never tested, they are only hopes.
node: vault | Separate backup account | 3 | 1 | Immutable storage with different credentials and a delay on deletes. | If production credentials can delete backups, ransomware deletes them.
node: dr | Second region | 3 | 2 | A copy of the data and a ready environment elsewhere. | A standby that was never exercised may not start.
node: test | Restore tests | 4 | 1 | Restore into a scratch environment and verify the data. | Skipped tests mean unknown quality.
node: run | Runbook and contacts | 4 | 0 | Steps, owners and decision points for a recovery. | A runbook only in the lost system cannot be read.
edge: app | db
edge: db | wal
edge: db | snap
edge: wal | vault
edge: snap | vault
edge: vault | dr
edge: vault | test
edge: test | run
```

## A recovery, step by step

1. Someone runs a faulty script at 14:05 and deletes a table. The team notices at 14:20 and stops writes to limit damage.
2. The runbook says to restore the last snapshot, then replay change logs up to just before 14:05.
3. The team restores into a new database instance, not over the damaged one, and verifies row counts and key records.
4. They copy the recovered table back, or switch the application to the restored instance after checks.
5. They record the timeline, the data lost (RPO achieved) and the time taken (RTO achieved), and compare both with the targets.
6. They fix the cause, for example permissions on that script, and add a test to catch it next time.

## Why the design looks like this

- **Layers** cover different failures: snapshots for older states, logs for point-in-time recovery, a second region for site loss.
- A **separate account with immutable storage** protects backups from stolen production credentials.
- **Restore tests** are the only proof that a backup is useful.
- **Targets agreed in advance** (RPO and RTO) turn "as fast as possible" into numbers the design can meet.
- A **written, tested runbook** reduces mistakes made under stress.

## Scaling decisions

1. Start with daily snapshots, off-site copies and one manual restore test.
2. Add log shipping when losing a day of data is not acceptable.
3. Automate restore tests weekly and alert when they fail.
4. Add a second region when a regional outage would break your RTO.
5. Review targets with the business yearly, because costs rise steeply as the targets get tighter.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Backups never restored | The first restore reveals missing or corrupt files | Scheduled automated restore tests with data checks |
| Ransomware or insider deletion | Backups are deleted with production | Immutable storage, separate credentials, delayed delete |
| Log shipping stopped | Data-loss window grows unnoticed | Alert on the age of the newest shipped log |
| Restore is too slow | RTO is missed because of data size | Measure restore time, use incremental restore, keep a warm standby |
| Same-region only | A regional failure removes data and backups | Copy to another region or provider |
| Secrets lost in the disaster | You can restore data but cannot decrypt it | Back up keys separately with strict access |

## Trade-offs

- A shorter RPO and RTO cost more in storage, bandwidth and standby systems. Pick targets by the cost of downtime.
- Backups protect against loss. Replication protects against failure. Replication copies mistakes instantly, so you need both.
- Keeping backups for years helps compliance and costs money, and old copies hold old personal data you may need to delete.

```predict
Q: A team has replicas in a second region and says they do not need backups. What mistake can replication not protect against?
???
Deleting or corrupting data. The replica copies the bad change within seconds, so both copies are wrong. Backups with older states and point-in-time recovery are what let you go back.
> Replication is for availability. Backup is for history.
```
