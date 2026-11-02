---
title: Backups, point-in-time recovery and restore testing
minutes: 15
summary: Choose between logical and physical backups, use WAL archiving for point-in-time recovery, set RPO and RTO targets, and prove restores work.
---

A backup you have never restored is a hope, not a backup. Databases are the part of your system that cannot be rebuilt from code, so backup design and restore practice are core operator skills.

## What you will learn

- Logical and physical backups
- Point-in-time recovery (PITR)
- RPO and RTO as targets
- Storing backups safely
- Restore drills

## Two kinds of backup

| Kind | Example | Good for | Weak at |
|------|---------|----------|---------|
| Logical | `pg_dump`, `mysqldump` | Small databases, moving between versions, single tables | Slow on large data, restores rebuild indexes |
| Physical | `pg_basebackup`, volume snapshots | Fast restore of large databases, replicas | Same major version and platform |

```bash
pg_dump --format=custom --file=shop.dump shop
pg_restore --dbname=shop_restored --jobs=4 shop.dump
pg_basebackup -h db1.example.com -D /backups/base -X stream -P
```

Snapshots of a disk are only safe if the database is consistent at that moment. Use the database's backup mode or a snapshot method that is crash-consistent and combine with the log archive.

## Point-in-time recovery

A base backup plus the continuous archive of the write-ahead log lets you restore to any moment, for example "one minute before the bad delete".

```text
# postgresql.conf on the primary
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
```

```text
# recovery settings when restoring
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2026-03-04 09:41:00+00'
recovery_target_action = 'promote'
```

Real systems copy the archive to remote object storage with a tool such as pgBackRest or WAL-G rather than a plain `cp`. Managed services (RDS, Cloud SQL, Azure Database) offer PITR as a feature, but you still decide retention and test the restore.

## Targets: RPO and RTO

- **RPO** (recovery point objective): how much data you can afford to lose. With PITR and continuous archiving it is seconds to minutes. With nightly dumps it is up to 24 hours.
- **RTO** (recovery time objective): how long recovery may take. Restoring 2 TB takes hours, so test it.

Agree these numbers with the business first. They decide cost.

## Store them safely

- Keep copies in a different account or region than the primary
- Encrypt backups and protect the keys separately
- Make a copy immutable or write-once, so ransomware or a mistaken delete cannot erase it
- Monitor that backups finished and that the archive is not falling behind
- Keep retention rules, and delete data you must delete under privacy rules

## Prove it works

```bash
createdb shop_check
pg_restore --dbname=shop_check --exit-on-error shop.dump
psql shop_check -c "SELECT count(*) FROM orders;"
```

A restore drill checks that the files are complete, the keys work, the procedure is written correctly and the time matches the RTO. Run it on a schedule and automate it where possible: restore to a scratch instance, run a few sanity queries and compare row counts, then discard it.

```predict
Q: You take a nightly dump at 02:00, and an engineer drops a table at 14:00. Using only the dump, how much data do you lose?
???
Everything written between 02:00 and the restore, about twelve hours. PITR with archived WAL would let you restore to 13:59 instead.
> That gap is your RPO, so choose the backup method to match.
```

```diagram
title: Point-in-time recovery
node: base | Base backup | 0 | 1 | A full physical copy taken at a known time. | An untested or corrupt base makes the archive useless.
node: wal | WAL archive | 1 | 1 | A continuous stream of changes copied off the server. | A gap in the archive stops recovery at that point.
node: replay | Replay to target | 2 | 1 | Restore the base, then apply logs up to the chosen time. | Picking the wrong target time restores the bad change too.
node: check | Verify and promote | 3 | 1 | Check data, then open for writes or extract the needed rows. | Promoting before checking can cement a mistake.
edge: base | replay
edge: wal | replay
edge: replay | check
```

## Incident: the backups that were empty

> **Incident:** A company lost its production database to a mistaken deletion and found that none of its backup methods produced a usable copy: one failed silently for months, one had the wrong version and one was never configured.

```console
$ ls -la /backups/nightly | tail -3
-rw-r--r-- 1 postgres postgres 0 Jan 12 02:00 shop.dump
-rw-r--r-- 1 postgres postgres 0 Jan 13 02:00 shop.dump
```

The company recovered data from a staging copy that was six hours old. Many teams have been in a similar position, and the lesson is the same: monitor backup size and age, and restore regularly.

## Common mistakes

- Backups on the same disk or account as the database
- Never testing a restore
- Alerts only on job exit codes, not on backup size or freshness
- Assuming a replica is a backup (it replicates deletions too)

```quiz
Q: Why is a replica not a backup?
- It is slower :: Speed is not the point.
+ It copies mistakes such as a dropped table almost immediately
- It cannot store data :: It stores a full copy.
- It is read-only :: That is not the reason.
> Replication protects against hardware loss, not against bad changes.

Q: What does point-in-time recovery require?
- Only a nightly dump :: A dump alone has no log.
+ A base backup plus a continuous archive of write-ahead logs
- A larger instance :: Size is not the key.
- A second database :: Not required.
> Replaying logs lets you stop at the moment before the problem.

Q: What does RPO measure?
- How long recovery takes :: That is RTO.
+ How much data loss is acceptable, measured in time
- Backup size :: It is unrelated.
- Network speed :: It is unrelated.
> A nightly backup means an RPO of up to a day.

Q: What proves a backup is usable?
- The job exits with code 0 :: It may have produced an empty file.
+ A regular restore test with sanity checks on the data
- A large file size :: Size alone is not proof.
- A recent timestamp :: That does not show restorability.
> Restore drills validate the whole procedure.
```

```cards
Logical backup :: SQL-level export such as pg_dump
Physical backup :: Copy of the data files, such as pg_basebackup
PITR :: Restore to a chosen moment using a base backup and logs
RPO :: Acceptable data loss, measured in time
RTO :: Acceptable time to restore service
```
