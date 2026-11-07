---
title: Backup and DR: testing restores and verifying backups
minutes: 11
summary: Prove that backups work with automated restore tests, integrity checks and timed drills, and track recovery time and success rate over time.
---

Nobody has a backup problem until they need to restore. A backup that has never been restored is a hope. The remedy is routine: restore on a schedule, check the result with real queries, record how long it took and alert when anything fails.

## What you will learn

- Three levels of verification: job success, integrity and a real restore
- Building an automated restore test
- Measuring recovery time against your RTO
- Handling backup failures like production incidents

## Three levels of proof

1. **The job finished**: necessary but weak. Jobs can succeed and write empty or damaged files.
2. **Integrity checks**: checksums, `restic check`, `pgbackrest verify`, comparing sizes and counts with expectations.
3. **Real restore and use**: restore into a clean environment, start the system, and run application-level checks, such as row counts, the latest timestamps and a known test query.

Only the third level proves you can recover. Run it regularly, and more often for critical systems.

```console
$ restic -r s3:s3.amazonaws.com/example-backups check --read-data-subset=10%
$ pgbackrest --stanza=main verify
$ sha256sum -c /backup/MANIFEST.sha256
```

## An automated restore test

```bash
#!/usr/bin/env bash
set -euo pipefail
start=$(date +%s)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

restic -r "$REPO" restore latest --target "$workdir" --tag nightly
count=$(find "$workdir" -type f | wc -l)
newest=$(find "$workdir" -type f -printf '%T@\n' | sort -n | tail -1 | cut -d. -f1)
age=$(( $(date +%s) - newest ))

[ "$count" -gt 1000 ] || { echo "too few files: $count"; exit 1; }
[ "$age" -lt 172800 ] || { echo "newest file is older than 48h"; exit 1; }
echo "restore ok: $count files, $(( $(date +%s) - start ))s"
```

Run it from a scheduler, push the duration and result to your metrics system, and alert on failure and on a restore time that grows beyond a fraction of the RTO (for example 80 percent). For databases, restore into a scratch instance and run a query set that compares counts and latest dates with production.

## Timed drills

Beyond automation, run a drill where a person follows the written runbook to restore a service in a clean environment, with a clock. This tests the human parts: access, credentials, documentation and decisions. Record steps that were unclear or missing, fix them, and repeat. Include a scenario where the person who usually does this is unavailable.

## When a backup fails

Treat a failed or missing backup as an incident of its own priority: alert, investigate, fix and take a new backup soon, instead of waiting for the next window. Track success rate, backup age, restore time and the number of systems with a tested restore in the last quarter, and report them to the owners.

```predict
Q: A nightly backup job exits with success every night. Can you say the data is recoverable?
???
No. Success only means the job ran. Only a restore test with application-level checks proves recovery.
> Verify by restoring.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Backup and DR: testing restores and verifying... fits together
node: n1 | Three levels of proof | 0 | 0 | The job finished: necessary but weak. Jobs can succeed and write empty or damaged files. | Testing restores with no application-level checks. | process
node: n2 | An automated restore test | 1 | 1 | Run it from a scheduler, push the duration and result to your metrics system, and alert on failure and on a restore time that grows beyond a fraction of the RTO (for... | Never timing a restore against the RTO. | observe
node: n3 | Timed drills | 2 | 0 | Beyond automation, run a drill where a person follows the written runbook to restore a service in a clean environment, with a clock. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | When a backup fails | 3 | 1 | Treat a failed or missing backup as an incident of its own priority: alert, investigate, fix and take a new backup soon, instead of waiting for the next window. | Restoring only after a disaster. | store
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Nine months of empty backups

> **Incident:** When a file server failed, the team discovered that the nightly backups had been empty since a path change nine months earlier.

```console
$ ls -la /backup/fileserver/2026-02-28/
total 8
drwxr-xr-x 2 backup backup 4096 Feb 28 02:10 .
drwxr-xr-x 9 backup backup 4096 Feb 28 02:10 ..
$ grep -c "completed successfully" /var/log/backup.log
271
```

The job pointed at a directory that no longer existed, and the tool treated an empty source as success. Each night the log said "completed successfully". The business recovered part of the data from user laptops. The team added a check on backup size against a baseline, a weekly automated restore test with file counts and a quarterly drill, and a dashboard showing the last tested restore for every system.

## Common mistakes

- Treating "job succeeded" as proof
- Restoring only after a disaster
- Testing restores with no application-level checks
- Never timing a restore against the RTO

```quiz
Q: Which test proves a backup is recoverable?
+ Restoring it to a clean environment and using the data
- Reading the job log :: Weak evidence.
- Counting backup files :: Not enough.
- Checking disk space :: Unrelated.
> A real restore is the only proof.

Q: Why track restore duration?
+ To compare it with the RTO and see growth as data grows
- To save disk space :: Not the reason.
- To avoid alerts :: Opposite.
- To remove retention :: Unrelated.
> Restore time grows with data.

Q: What should a restore test check beyond the file count?
+ Application-level facts such as row counts and latest timestamps
- The color of the dashboard :: Unrelated.
- The server's hostname :: Not useful.
- The tool's version only :: Not enough.
> Prove the data is usable.

Q: How should you react to a failed backup?
+ Treat it as an incident and take a new backup soon
- Wait for the next window :: Leaves a gap.
- Disable the alert :: Hides the problem.
- Delete old backups :: Makes it worse.
> A gap in backups is a risk.
```

```cards
Three levels :: job success, integrity check, real restore
Restore test :: automated, scheduled, application-level checks
Timed drill :: a person follows the runbook against the clock
Metrics :: success rate, backup age, restore time
Failed backup :: handle as an incident
```
