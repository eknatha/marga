---
title: Temporary files, locks and atomic writes
minutes: 12
summary: Create temporary files safely, replace files without leaving a half-written copy, and stop two copies of a script running at once.
---

A script writes a report straight into the file that a web page serves, and a visitor loads the page halfway through. Another script uses /tmp/work as a scratch file, and two runs overwrite each other. These are the everyday ways shell scripts corrupt data, and each has a small, standard cure.

## What you will learn

- Create unique temporary files and directories with mktemp
- Clean up with trap, even on failure
- Write a file atomically: write elsewhere, then rename
- Prevent overlapping runs with flock

## Never invent a temporary name

A fixed name such as `/tmp/work` is shared by every run, and another user can create it first and trick your script. `mktemp` creates a file or directory with a random name and safe permissions.

```bash
tmp=$(mktemp)            # a new empty file, mode 600
work=$(mktemp -d)        # a new private directory
echo "scratch" > "$tmp"
```

Store the name in a variable and quote it every time you use it. Prefer a directory when a script needs several files, because one `rm -r` cleans them all.

## Clean up with trap

Temporary files must disappear even if the script fails or you press Ctrl+C. A `trap` on `EXIT` runs a command whenever the script ends, for any reason except a hard kill.

```bash
#!/bin/bash
set -euo pipefail
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsS https://example.com/data.json -o "$work/data.json"
jq .items "$work/data.json" > "$work/items.json"
```

Set the trap straight after creating the directory so that there is no gap in which a failure leaves it behind. Single quotes make the variable expand when the trap runs, not when it is set.

## Write atomically

Writing straight into the final file means readers can see it half finished, and a crash leaves a broken file. The pattern is: write a complete new file in the same directory, then rename it over the old one. A rename within one filesystem is atomic, so readers see either the old file or the new one, never a mix.

```bash
out=/srv/www/report.html
new=$(mktemp "$out.XXXXXX")        # same directory, same filesystem
generate_report > "$new"
chmod 644 "$new"
mv -f "$new" "$out"
```

The temporary file must be in the same directory (or at least the same filesystem). Across filesystems `mv` copies and deletes, which is not atomic.

## One copy at a time with flock

If a job runs every minute and sometimes takes two, you get two copies working on the same data. `flock` takes a lock on a file and releases it automatically when the process ends, even if it crashes.

```bash
#!/bin/bash
exec 9>/var/lock/report.lock
if ! flock -n 9; then
  echo "report already running" >&2
  exit 0
fi
# ... the real work runs while the lock is held ...
```

The `-n` option fails at once instead of waiting. A hand-made lock file (`touch lock; ... rm lock`) is worse, because a crash leaves it behind and the job never runs again.

```predict
Q: A script writes /etc/app.conf directly with `>`, and the power fails halfway. What state may the file be in?
???
Truncated or half written, so the application may start with a broken configuration. Write a new file next to it and rename it over the old one.
> Redirection with > truncates the file first, then writes. A crash in between leaves partial content.
```

## Incident: Half a report

> **Incident:** A nightly job regenerates the status page in place. At 02:00 customers sometimes saw a page that stopped in the middle of a table.

```console
$ ls -l /srv/www/status.html
-rw-r--r-- 1 www www 18432 Jan 6 02:00 status.html   # normally 52 KB
$ grep -n "status.html" /opt/jobs/status.sh
12: render_status > /srv/www/status.html
```

The script truncated the live file and then wrote it over several seconds. Visitors in that window got a partial page. The fix was to render into a temporary file in the same directory, check it was not empty, and rename it over the old file, and to add `flock` so that a slow run could not overlap the next one.

## Common mistakes

- Using fixed names in /tmp
- Creating the temporary file and the trap in the wrong order
- Renaming across filesystems and expecting it to be atomic
- Using a plain lock file that a crash leaves behind

```quiz
Q: Why use mktemp instead of /tmp/work?
+ It makes a unique file with safe permissions, so runs do not collide and nobody can pre-create it
- It is faster :: Speed is not the reason.
- It uses less disk :: The size is the same.
- It works without a trap :: You still need a trap to clean up.
> Unique names prevent collisions and prediction attacks.

Q: What makes a file replacement atomic?
+ Writing a new file in the same filesystem and renaming it over the old one
- Using cp :: cp writes into the destination gradually.
- Writing with > :: It truncates the file first.
- Using sync :: sync flushes data but does not swap files.
> A rename is a single step to other programs.

Q: Which trap runs on every normal or failing exit?
+ trap CMD EXIT
- trap CMD INT :: That only handles Ctrl+C.
- trap CMD ERR :: That runs on errors, not on success.
- trap CMD KILL :: SIGKILL cannot be trapped.
> EXIT covers success, failure and most signals.

Q: What is the advantage of flock over a plain lock file?
+ The lock is released automatically when the process ends, even after a crash
- It is faster :: Speed is not the point.
- It encrypts the file :: flock does not encrypt.
- It works across hosts :: It only works for one host.
> Automatic release avoids stuck locks.
```

```cards
Make a private temp directory :: mktemp -d
Clean up on any exit :: trap 'rm -rf "$dir"' EXIT
Atomic replace :: write beside it, then mv -f
Run one copy only :: flock -n LOCKFILE command
Why same directory for the temp file :: rename is atomic only inside one filesystem
```
