---
title: Scheduling with cron and systemd timers
minutes: 14
summary: Run jobs on a schedule with cron and systemd timers, avoid the classic environment traps, and make scheduled work observable.
---

Backups, certificate renewals, log cleanup and reports all run on a schedule. Scheduled jobs fail silently more often than any other kind of automation, so the way you set them up matters as much as what they do.

## What you will learn

- Cron syntax and where crontabs live
- Why cron jobs fail with "works in my shell"
- systemd timers and when they are better
- Locking, logging and alerting for scheduled jobs

## Cron syntax

A crontab line has five time fields and a command: minute, hour, day of month, month, day of week.

```text
# m  h  dom mon dow  command
*/5  *  *   *   *    /usr/local/bin/check-queue.sh
30   2  *   *   1-5  /usr/local/bin/backup.sh
0    4  1   *   *    /usr/local/bin/monthly-report.sh
@reboot               /usr/local/bin/warm-cache.sh
```

```console
$ crontab -l
$ crontab -e
$ sudo crontab -u deploy -l
$ ls /etc/cron.d /etc/cron.daily
$ sudo grep CRON /var/log/syslog | tail -5
```

Per-user crontabs are edited with `crontab -e`. System-wide jobs live in `/etc/cron.d/` and have an extra **user** field after the time fields. Use a site like crontab.guru to double-check an unfamiliar expression, and remember that cron uses the server's timezone, which in the cloud is usually UTC.

## Why cron jobs fail

Cron starts jobs with a **tiny environment**: a minimal PATH, no profile files, no interactive variables, and the current directory is the home directory. A script that works when you run it by hand can fail under cron.

```text
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
MAILTO=ops@example.com

30 2 * * * /opt/backup/run.sh >> /var/log/backup.log 2>&1
```

Set `PATH` explicitly, use absolute paths for every command and file, and redirect output. Output that goes nowhere is lost, and output that goes to local mail is usually never read.

## Preventing overlap with locks

If a job takes longer than its interval, cron starts a second copy on top of the first. Use `flock` so only one runs at a time:

```console
$ flock -n /var/lock/backup.lock /opt/backup/run.sh || echo "previous run still active"
```

In a crontab: `*/10 * * * * flock -n /var/lock/sync.lock /opt/sync.sh`. The `-n` flag makes the second instance exit immediately instead of waiting.

## systemd timers

A timer is a unit that triggers a service unit. You get journal logging, dependency handling, resource limits and a status command for free.

```ini
[Unit]
Description=Nightly backup

[Service]
Type=oneshot
ExecStart=/opt/backup/run.sh
User=backup
```

```ini
[Unit]
Description=Run backup nightly

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Save them as `backup.service` and `backup.timer` in `/etc/systemd/system/`.

```console
$ sudo systemctl daemon-reload
$ sudo systemctl enable --now backup.timer
$ systemctl list-timers --all
$ systemctl status backup.service
$ journalctl -u backup.service --since today
$ systemd-analyze calendar "Mon..Fri 02:30"
```

`Persistent=true` runs a missed job after the machine comes back from downtime, which cron does not do. `RandomizedDelaySec` spreads load when many hosts share a schedule.

## Know when it did not run

A job that never ran is invisible. Make success observable: have the job ping a monitoring URL or write a metric on success, and alert when the signal is missing for longer than expected (a dead man's switch).

```console
$ /opt/backup/run.sh && curl -fsS -m 10 https://hc.example.com/ping/abc123
```

## Incident: the certificate that did not renew

> **Incident:** The certificate renewal cron job has been failing for two months. It worked when tested by hand. Now the production certificate expires at midnight and customers see browser warnings.

The job used `certbot` from `/usr/local/bin`, which cron's default PATH did not include, and output was mailed to a root mailbox nobody reads. Fix it properly:

```console
$ sudo grep -r certbot /etc/cron.d /var/spool/cron 2>/dev/null
$ sudo certbot renew --dry-run
$ sudo systemctl list-timers | grep certbot
```

Use an absolute path or set PATH, log to a file the monitoring agent watches, run `renew --dry-run` in CI or weekly, and add an alert that fires when any certificate has fewer than 21 days left. Renewal should never depend on a human noticing an email.

## Common mistakes

- Relying on the interactive PATH and environment
- Not redirecting output, so failures leave no trace
- Overlapping runs of a slow job
- Assuming the cron timezone matches yours
- Having no alert when the job stops running

```quiz
Q: Why does a script work in your shell but fail in cron?
- Cron is slower
+ Cron runs with a minimal environment, including a short PATH
- Cron blocks scripts
- Cron only runs Python
> Use absolute paths and set PATH and other variables explicitly.

Q: What does flock -n do in a cron line?
- Makes the job run faster
+ Skips the run if a previous run still holds the lock
- Encrypts the job
- Locks the crontab file
> It prevents overlapping executions.

Q: What does Persistent=true do in a systemd timer?
- Repeats the job forever
+ Runs a missed job when the system comes back up
- Keeps logs permanently
- Prevents the timer from stopping
> Cron skips missed runs; a persistent timer catches up.

Q: How do you detect that a scheduled job silently stopped?
- Read the logs every day
+ Alert when its success signal or heartbeat is missing
- Restart the server weekly
- Disable the job
> A dead man's switch turns silence into an alert.
```

```cards
Five cron time fields? :: Minute, hour, day of month, month, day of week
Where do system-wide cron jobs live? :: /etc/cron.d and the /etc/cron.* directories, with an extra user field
Command to list timers? :: systemctl list-timers --all
Why use RandomizedDelaySec? :: To spread load so many hosts do not fire at the same second
```
