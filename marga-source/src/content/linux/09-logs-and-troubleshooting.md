---
title: Logs and troubleshooting
minutes: 15
summary: Read journald and file logs, correlate events by time, and use the kernel log to explain mysterious restarts.
---

Users report random `502 Bad Gateway` errors around 14:03. The web server looks healthy and CPU is idle. The answer is in the logs, but only if you know which logs to read, how to narrow them to a time window, and how to connect two sources. This lesson builds that routine.

## What you will learn

- Where Linux keeps logs
- How to filter `journalctl` by unit, time and severity
- How to correlate application, web server and kernel logs
- How to spot an out-of-memory kill

## Two places logs live

Modern systems use **journald**, queried with `journalctl`, for services run by systemd. Many programs also write plain files under `/var/log`.

| Source | Look here | For |
|--------|-----------|-----|
| journald | `journalctl -u SERVICE` | Anything started by systemd |
| `/var/log/nginx/` | `access.log`, `error.log` | Web requests and proxy errors |
| `/var/log/auth.log` (Debian family) or `/var/log/secure` (Red Hat family) | Logins and `sudo` use | Security events |
| Kernel ring buffer | `dmesg -T` | Hardware, disk and out-of-memory events |

## journalctl filters you will use constantly

```bash
journalctl -u shop --since "14:00" --until "14:10"   # one service, one window
journalctl -u shop -p err -n 50 --no-pager           # errors and worse, last 50
journalctl -b -1 -p err                              # errors from the previous boot
journalctl -f                                        # follow everything live
```

Severity runs from `emerg` (0) to `debug` (7). `-p err` shows `err` and anything more severe.

## Searching plain log files

```console
$ grep -c " 502 " /var/log/nginx/access.log
41
$ awk '$9 == 502 {print $4}' /var/log/nginx/access.log | cut -c2-15 | sort | uniq -c
     41 24/Oct/2026:14
$ tail -n 3 /var/log/nginx/error.log
2026/10/24 14:03:11 [error] 1032#1032: *9021 connect() failed (111: Connection refused) while connecting to upstream, upstream: "http://127.0.0.1:8080/"
```

The default nginx access log puts the status code in field 9, so `awk '$9 == 502'` filters on it. Always include the time field when you aggregate, because the pattern in time is the clue. `less +F file` follows a file like `tail -f` but lets you scroll back.

> **Tip:** Make timestamps comparable before correlating. Check the time zone with `timedatectl`. Mixing UTC and local time is a classic way to look at the wrong minute.

## Incident: 502 errors every few hours

> **Incident:** `502` responses cluster at 14:03. nginx reports `Connection refused` to the upstream on port 8080.

"Connection refused" means nothing was listening on 8080 at that moment. Why not? Ask the service's journal for the same minute:

```console
$ journalctl -u shop --since "14:00" --until "14:10" --no-pager
Oct 24 14:03:05 app01 systemd[1]: shop.service: Main process exited, code=killed, status=9/KILL
Oct 24 14:03:05 app01 systemd[1]: shop.service: Failed with result 'signal'.
Oct 24 14:03:10 app01 systemd[1]: shop.service: Scheduled restart job, restart counter is at 1.
Oct 24 14:03:10 app01 systemd[1]: Started Shop API.
```

The process did not crash by itself. It was killed with signal 9 and systemd restarted it five seconds later, which matches the five-second window of refused connections. Nobody ran `kill -9`, so ask the kernel:

```console
$ sudo dmesg -T | grep -i -E "out of memory|killed process"
[Sat Oct 24 14:03:05 2026] Out of memory: Killed process 2211 (server) total-vm:6291456kB, anon-rss:3932160kB, file-rss:0kB, shmem-rss:0kB
```

The kernel's **OOM killer** chose the application because the machine ran out of memory. Confirm the trend with `free -h` and check whether the service has a memory limit. Real fixes are to reduce the application's memory use, add memory, or set a cgroup limit (`MemoryMax=` in the unit) so only this service is affected. Restarting more often hides the problem.

The method is the point: **symptom** (502), **proximate cause** (connection refused), **event** (process killed), **root cause** (OOM). Each step used a different log.

## Log rotation

Logs grow without bound unless rotated. `logrotate` renames, compresses and deletes old logs on a schedule, configured in `/etc/logrotate.d/`.

```text
/var/log/app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

`copytruncate` copies the log and empties the original so programs that keep the file open do not need a restart. Test a config with `logrotate -d /etc/logrotate.d/app`, which prints what would happen without doing it.

## Common mistakes

- Reading only the latest lines instead of the minute when the problem occurred
- Comparing logs without confirming they use the same time zone
- Stopping at "the process died" without asking what killed it
- Deleting log files by hand instead of configuring rotation

```quiz
Q: Which command shows only errors for the shop service between 14:00 and 14:10?
- journalctl -u shop -f
+ journalctl -u shop -p err --since "14:00" --until "14:10"
- dmesg -T | grep shop
- cat /var/log/shop
> -u picks the unit, -p err filters by severity and --since/--until bound the time window.

Q: nginx logs "connect() failed (111: Connection refused) while connecting to upstream". What does it indicate?
- The upstream replied too slowly
- The upstream returned an error page
+ Nothing was listening on the upstream address and port
- The TLS certificate expired
> Error 111 means the connection was actively refused, usually because no process was listening.

Q: A service log shows "status=9/KILL" and nobody ran kill. Where do you look next?
- /etc/passwd
+ The kernel log with dmesg -T for an out-of-memory kill
- The nginx access log
- /var/lib
> Signal 9 not sent by a person often comes from the kernel OOM killer. dmesg records it.

Q: Why does the logrotate example use copytruncate?
- It encrypts the log
+ It lets programs that keep the log file open continue writing without a restart
- It deletes logs immediately
- It increases the log size
> copytruncate copies the file and truncates the original in place, so the writer's open file handle stays valid.
```

```cards
Command to see errors from the previous boot? :: journalctl -b -1 -p err
What does connection refused tell you? :: The host answered but nothing was listening on that port
How do you find OOM kills? :: sudo dmesg -T | grep -i "out of memory"
First step before correlating two logs? :: Confirm both use the same time zone and look at the same time window
```
