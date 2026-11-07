---
title: Backup and point-in-time recovery operations for SQL
minutes: 13
summary: Run base backups and WAL archiving, perform a point-in-time restore and test restore time against your recovery objectives.
---

Point-in-time recovery lets you undo mistakes, not just survive disk loss. It needs a base backup, a continuous stream of write-ahead log files and a practiced procedure. This lesson shows the moving parts and how to test them.

## What you will learn

- How base backups and WAL archiving work together
- Restoring to a specific time on a new server
- Measuring RPO and RTO
- Monitoring and testing the backup system

## The pieces

A **base backup** is a full copy of the data directory at one moment. **WAL archiving** copies every write-ahead log segment to safe storage. To recover, restore the base backup and replay WAL up to a target time, transaction or label.

```bash
# with pgBackRest
pgbackrest --stanza=main backup --type=full
pgbackrest --stanza=main info
```

```text
# postgresql.conf
archive_mode = on
archive_command = 'pgbackrest --stanza=main archive-push %p'
```

## Restore to a point in time

```bash
# on a NEW server, stopped PostgreSQL
pgbackrest --stanza=main --type=time \
  --target="2026-11-05 14:02:00+00" \
  --target-action=promote restore
systemctl start postgresql
psql -c "SELECT count(*) FROM invoices;"
```

Never restore over the live server. Restore alongside, verify the data, then export what you need or switch traffic after careful checks.

## RPO and RTO

**RPO** is how much data you can lose, bounded by how far behind WAL archiving can lag. **RTO** is how long recovery takes, driven by backup size, network speed and replay time. Measure both in a real restore, and write the numbers in the runbook.

## Keep it healthy

Alert when `pg_stat_archiver` shows failures or when the newest archived WAL is old. Store backups in a different failure domain, encrypt them, keep retention long enough to catch slow-moving mistakes and run a full restore test every month.

```sql
SELECT last_archived_time, failed_count, last_failed_time FROM pg_stat_archiver;
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Backup and point-in-time recovery operations for... fits together
node: n1 | The pieces | 0 | 0 | A base backup is a full copy of the data directory at one moment. | Never testing a full restore. | process
node: n2 | Restore to a point in time | 1 | 1 | Never restore over the live server. Restore alongside, verify the data, then export what you need or switch traffic after careful checks. | Restoring over the live server. | store
node: n3 | RPO and RTO | 2 | 0 | RPO is how much data you can lose, bounded by how far behind WAL archiving can lag. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | Keep it healthy | 3 | 1 | Alert when pg_stat_archiver shows failures or when the newest archived WAL is old. | Backups stored on the same failure domain. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Archiving had been failing for nine days

> **Incident:** A restore needed WAL that was never archived.

```console
FATAL:  could not locate required checkpoint record
pg_stat_archiver: failed_count = 11204
last_failed_time: 9 days ago
```

A full disk on the archive target had stopped copies, but the base backup job still reported success. When recovery was needed the log chain was broken. The team alerts on archiver failures and lag, monitors the target and runs a monthly restore test that must reach a given time.

## Common mistakes

- Never testing a full restore
- Restoring over the live server
- Backups stored on the same failure domain
- Ignoring WAL archive failures

```quiz
Q: What does PITR need besides a base backup?
+ Archived WAL
- A second database :: No.
- A cache :: No.
- A new schema :: No.
> WAL replays to a target time.

Q: What does RPO measure?
+ How much data you can lose
- How long a restore takes :: No.
- Disk speed :: No.
- CPU use :: No.
> Recovery point objective.

Q: Where should you restore for a test?
+ A separate new server
- The live server :: No.
- A laptop only :: No.
- Nowhere :: No.
> Avoid damaging production.

Q: What should you alert on?
+ Archive failures and lag
- Only CPU :: No.
- Table names :: No.
- Index size only :: No.
> A broken chain breaks recovery.
```

```cards
Base backup :: A full copy of the database at one moment
WAL :: Write-ahead log of every change
RPO :: Maximum acceptable data loss
RTO :: Maximum acceptable recovery time
```
