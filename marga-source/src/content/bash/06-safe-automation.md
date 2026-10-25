---
title: Safe automation: strict mode, traps and scheduling
minutes: 16
summary: Make scripts fail loudly with strict mode, clean up with traps, avoid overlapping runs, and schedule them with cron or systemd timers.
---

A backup script has run every night for a year. One night the disk fills, the dump fails halfway, and the script keeps going. It compresses a truncated file, reports success and deletes yesterday's good backup. Automation that fails silently is worse than no automation. This lesson covers the habits that make scripts safe to run unattended.

## What you will learn

- Strict mode: `set -euo pipefail`
- Cleaning up with `trap`
- Preventing two copies from running at once
- Scheduling with cron and systemd timers

## Strict mode

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Option | What it does |
|--------|--------------|
| `-e` | Exit when a command fails |
| `-u` | Treat unset variables as errors |
| `-o pipefail` | A pipeline fails if *any* stage fails, not just the last |

Without `pipefail`, `pg_dump mydb | gzip > backup.gz` reports success even when `pg_dump` fails, because `gzip` succeeds. With it, the script stops.

> **Note:** `set -e` has exceptions: it does not trigger inside an `if` condition or on the left of `&&` and `||`. Strict mode is a safety net, not a replacement for checking important results yourself.

## Clean up with trap

A `trap` runs a command when the script exits or receives a signal. Use it to remove temporary files whatever happens.

```bash
tmp="$(mktemp -d)"
cleanup() { rm -rf -- "$tmp"; }
trap cleanup EXIT                 # runs on normal exit, on error, and on Ctrl+C

pg_dump "$DB_NAME" | gzip > "$tmp/db.sql.gz"
mv "$tmp/db.sql.gz" "/backups/db-$(date +%F).sql.gz"
```

Write to a temporary location and **move into place at the end**. A move on the same filesystem is atomic, so readers never see a half-written file.

## One run at a time

If a job takes longer than its schedule interval, two copies run together and can corrupt data. `flock` takes a lock and refuses to start a second copy.

```bash
exec 9>/var/lock/nightly-backup.lock
flock -n 9 || { echo "another backup is running" >&2; exit 0; }
```

The lock is released automatically when the script exits, even after a crash.

## Scheduling

**cron** is the classic scheduler. Edit with `crontab -e`.

```bash
# minute hour day-of-month month day-of-week  command
15 2 * * *  /usr/local/bin/nightly-backup.sh >> /var/log/nightly-backup.log 2>&1
```

Cron runs with a minimal environment, so use full paths and set what the script needs. Capture output, because cron mails or drops it otherwise.

**systemd timers** do the same job with better logging and dependencies. A timer triggers a service unit.

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Nightly backup

[Timer]
OnCalendar=*-*-* 02:15:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

`Persistent=true` runs a missed job after the machine was off. Enable with `systemctl enable --now backup.timer`, list with `systemctl list-timers`, and read output with `journalctl -u backup.service`.

## Incident: the backup that deleted the last good copy

> **Incident:** The nightly job ran `pg_dump | gzip > latest.sql.gz`, then `find /backups -mtime +7 -delete`. The database host was out of space, `pg_dump` failed, and `latest.sql.gz` contained a few kilobytes. Cleanup then removed older files. After a week there was no usable backup.

A safer version applies every habit from this lesson:

```bash
#!/usr/bin/env bash
set -euo pipefail

backup_dir="${BACKUP_DIR:?BACKUP_DIR must be set}"
tmp="$(mktemp -d)"; trap 'rm -rf -- "$tmp"' EXIT
exec 9>/var/lock/nightly-backup.lock; flock -n 9 || exit 0

out="$backup_dir/db-$(date +%F).sql.gz"
pg_dump "$DB_NAME" | gzip > "$tmp/dump.gz"

# validate before replacing anything
gzip -t "$tmp/dump.gz"
[[ "$(stat -c %s "$tmp/dump.gz")" -gt 1048576 ]] || { echo "dump suspiciously small" >&2; exit 1; }

mv "$tmp/dump.gz" "$out"
find "$backup_dir" -name 'db-*.sql.gz' -mtime +7 -delete   # only after a verified new backup
```

If `pg_dump` fails, `pipefail` stops the script before any deletion. The size and integrity checks catch truncated output. Old backups are removed only after a new one has been verified. Finally, a **restore test** matters more than any check: schedule a monthly job that actually restores the latest backup into a scratch database.

```diagram
title: Where a safe script protects you
node: start | Start | 0 | 1 | The script begins with set -euo pipefail and a trap for cleanup. | Without it, an error in the middle is ignored and the script goes on.
node: check | Validate input | 1 | 0 | Check that required variables are set and paths are not empty. | An empty variable in rm -rf $DIR/ can become rm -rf /.
node: dry | Dry run | 1 | 2 | Print the actions first with a --dry-run flag. | Skipping it means the first real run is also the first test.
node: act | Do the work | 2 | 1 | Use quoted variables, a lock file and clear logging. | Two copies running at once can corrupt data without a lock.
node: end | Cleanup and exit code | 3 | 1 | The trap removes temp files and returns a meaningful code. | If the exit code is always 0, the scheduler thinks a failure succeeded.
edge: start | check
edge: start | dry
edge: check | act
edge: dry | act
edge: act | end
```

## Common mistakes

- Cleaning up old data before confirming the new data is good
- Relying on `set -e` and never checking critical results
- Cron jobs that depend on `PATH` or variables from your interactive shell
- Never testing a restore

```quiz
Q: Why does set -o pipefail matter for pg_dump | gzip > file?
- It speeds up compression
+ Without it, the pipeline succeeds when gzip succeeds even if pg_dump failed
- It prevents gzip from running
- It writes errors to the log
> By default a pipeline's status is the last command's status. pipefail makes any failing stage fail the pipeline.

Q: What does trap cleanup EXIT do?
- Runs cleanup only when the script is killed
+ Runs cleanup when the script exits, whether normally, by error or by interrupt
- Prevents the script from exiting
- Deletes the trap
> The EXIT trap fires on every exit path, which makes it the right place to remove temporary files.

Q: Why write to a temp file and mv it into place?
- mv compresses the file
+ A rename on the same filesystem is atomic, so readers never see a partial file
- mv is required by cron
- It saves disk space
> Atomic replacement means consumers see the old file or the complete new one, never a half-written one.

Q: What is the best proof that a backup works?
- The backup script exits with 0
- The file exists
+ Regularly restoring it into a test environment and checking the data
- The file is larger than yesterday's
> Only a restore proves the backup is usable. Exit codes and file sizes only suggest it.
```

```cards
What does set -euo pipefail do? :: Exit on errors, treat unset variables as errors, and fail a pipeline if any stage fails
Prevent two overlapping runs? :: Take a lock with flock -n
Why does cron need full paths? :: Cron runs with a minimal environment and a short PATH
What does Persistent=true do in a systemd timer? :: Runs a missed job at the next opportunity after downtime
```
