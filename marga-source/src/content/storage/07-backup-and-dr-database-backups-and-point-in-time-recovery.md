---
title: Backup and DR: database backups and point-in-time recovery
minutes: 13
summary: Take consistent database backups, archive the write-ahead log for point-in-time recovery, and rehearse restoring to just before a mistake.
---

Copying database files while the database runs does not give a usable backup. Databases need a consistent snapshot plus a record of changes, so you can go back to a moment, such as one minute before the bad delete. This lesson uses PostgreSQL for examples, and the same ideas apply to MySQL binary logs and other engines.

## What you will learn

- Logical and physical backups, and when each fits
- Base backups plus continuous log archiving
- Point-in-time recovery to a chosen time
- Practical tooling and what to monitor

## Logical or physical

A **logical backup** (`pg_dump`) exports schema and data as SQL or an archive. It is portable across versions and good for single databases or small data, but restoring is slow for large data and it captures a single moment only. A **physical backup** copies the data files together with the write-ahead log (WAL), which is faster to restore at scale and enables point-in-time recovery.

```console
$ pg_dump -Fc -d orders -f /backup/orders-2026-03-04.dump
$ pg_restore -d orders_restored --jobs 4 /backup/orders-2026-03-04.dump
$ pg_basebackup -h db1 -U replicator -D /backup/base -Ft -z -P
```

## Archive the WAL

Every change goes to the WAL first. If you archive each WAL segment to safe storage, you can replay changes on top of a base backup up to any moment.

```bash
# postgresql.conf (shown as shell for the check): archive WAL continuously
archive_mode=on
archive_command='pgbackrest --stanza=main archive-push %p'
```

Mature tools such as **pgBackRest** and **Barman** manage full, differential and incremental backups, parallel transfer, compression, encryption, retention and verification, so you do not write that logic yourself. Monitor the age of the last successful backup and the lag of WAL archiving, because a quiet failure in `archive_command` makes recovery points disappear.

## Recover to a point in time

```console
$ pgbackrest --stanza=main --type=time "--target=2026-03-04 14:29:00+00" --target-action=promote restore
$ pg_ctl -D /var/lib/postgresql/data start
```

The restore fetches the base backup, then replays WAL up to the target time and stops. Choose the target just before the mistake, restore **to a new server first**, check the data, and then either switch to it or copy the missing rows back. Do not restore over the damaged primary until you know what you need. Note that recovery returns the database to an earlier state, so changes made after the target are lost unless you extract them.

## MySQL and others

MySQL uses a full backup (for example with Percona XtraBackup) plus binary logs for point-in-time recovery. Cloud-managed databases offer automated backups and point-in-time restore with a retention window; know that window, test a restore and keep your own export for long retention and for protection against account problems.

```predict
Q: A developer ran DELETE without a WHERE at 14:30. You restore the last nightly backup from 02:00. What is lost?
???
Twelve hours of valid changes. With WAL archiving you could replay up to 14:29 instead and lose almost nothing.
> Continuous archiving shrinks the RPO.
```

## Incident: The archive that stopped in January

> **Incident:** During a recovery drill the team found that the last archived WAL segment was nine weeks old.

```console
$ pgbackrest --stanza=main info
wal archive min/max: 000000010000000A000000F2 / 000000010000000B0000003C
$ psql -c "select last_archived_time, last_failed_time from pg_stat_archiver"
 2026-01-09 03:11:42 | 2026-01-09 03:12:01
```

A credential for the archive bucket had been rotated, and `archive_command` had failed ever since. The database kept running and WAL files piled up until the disk nearly filled. Nobody had alerts on archive failures. The team fixed the credential, took a new full backup, added alerts on `pg_stat_archiver.last_failed_time` and the age of the newest backup, and made a quarterly restore drill part of the calendar.

## Common mistakes

- Copying live data files and calling it a backup
- No alert when archiving fails
- Restoring over the damaged primary at once
- Never testing a point-in-time restore

```quiz
Q: What makes point-in-time recovery possible?
+ A base backup plus continuously archived write-ahead log
- A larger disk :: Not the mechanism.
- A faster network :: Not the mechanism.
- A read replica :: It copies mistakes too.
> Replay changes up to a chosen moment.

Q: Where should you first restore after an accidental delete?
+ To a separate server, to inspect before switching
- Over the production primary :: Risky and irreversible.
- Into the application code :: Not a restore target.
- To nowhere :: Not a restore.
> Check before you commit.

Q: Which signal shows archiving is broken?
+ pg_stat_archiver shows recent failures or an old last_archived_time
- A low CPU usage :: Not related.
- More replicas :: Unrelated.
- A new index :: Unrelated.
> Monitor the archiver.

Q: When is pg_dump a good fit?
+ Portable backups of a single database or modest data size
- Hot standby of petabytes :: Too slow to restore.
- Continuous log shipping :: Different tool.
- Block-level snapshots :: Different tool.
> It is a logical export.
```

```cards
Logical backup :: pg_dump, portable, slower to restore
Physical backup :: data files plus WAL, fast at scale
WAL archiving :: ships every change record to safe storage
PITR :: restore a base backup and replay to a target time
Monitor :: age of last backup and archive failures
```
