## The cleanup script that deleted too much
level: junior
A cleanup script ran from cron after a configuration file was renamed. Afterwards, files outside the target directory were missing.

```text
#!/bin/bash
# cleanup.sh
source /etc/cleanup.conf      # file no longer exists
rm -rf "$BACKUP_DIR"/*
```
? Which change makes this script safe?
+ Add set -u and use "${BACKUP_DIR:?}" so an empty variable stops the script before rm runs
- Remove the quotes around $BACKUP_DIR
- Run the script with sudo
- Replace rm -rf with rm -f
why: If the source fails and BACKUP_DIR is empty, the command becomes `rm -rf /*`. Quoting does not change that. `set -u` or `${VAR:?message}` makes the shell stop with an error. Also use `set -e` or check that the `source` succeeded, and validate that the directory is the one you expect before you delete.

## Pipeline that hides a failure
level: mid
A backup job always reports success, yet the dump files are empty.

```text
#!/bin/bash
mysqldump --all-databases | gzip > /backup/all.sql.gz
echo "backup finished: exit code $?"

$ ./backup.sh
mysqldump: Got error: 1045: Access denied for user 'backup'@'localhost'
backup finished: exit code 0
```
? Why is the exit code 0, and what is the fix?
+ A pipeline returns the status of its last command, so use set -o pipefail and check each stage
- gzip always returns 0 and should be removed
- The echo command resets all errors
- mysqldump ignores access errors by design
why: By default the exit status of a pipeline is that of the last command, and here gzip succeeded on an empty stream. `set -o pipefail` makes the pipeline fail if any command fails, and `${PIPESTATUS[@]}` lets you inspect each stage. Also write to a temporary file and move it into place only after success.

## Loop breaks on file names with spaces
level: mid
A script that processes uploaded reports fails on some files.

```text
for f in $(ls /data/reports); do
  gzip "/data/reports/$f"
done

$ ./compress.sh
gzip: /data/reports/Q3: No such file or directory
gzip: /data/reports/summary.pdf: No such file or directory
```
? What is the correct fix?
+ Loop over a glob such as for f in /data/reports/*; do ...; done and quote "$f"
- Put more quotes around $(ls /data/reports)
- Use ls -l instead of ls
- Run the loop twice
why: Word splitting turns the file `Q3 summary.pdf` into two words. Parsing the output of `ls` is fragile. A glob keeps each file name as one word, and quoting the variable keeps it intact. For recursive or unusual names use `find ... -print0 | xargs -0` or `while IFS= read -r -d ''`.

## Loop breaks on file names with spaces
level: junior
A cleanup script should delete old log files. It works on the test server, then fails on a path that contains a space.

```text
$ cat clean.sh
for f in $(ls /var/log/app); do
  rm /var/log/app/$f
done

$ ./clean.sh
rm: cannot remove '/var/log/app/access': No such file or directory
rm: cannot remove 'old.log': No such file or directory
```
? What is the best fix?
+ Loop over a glob and quote the variable, for example for f in /var/log/app/*; do rm -- "$f"; done
- Add sudo in front of rm
- Replace ls with ls -a
- Run the script with sh instead of bash
why: The shell splits the output of ls on spaces, so "access old.log" became two words. Never parse ls output. A glob keeps each name as one word, and quotes keep it as one word when you use it. The double dash protects against names that start with a dash. Test with a file name that has spaces before you trust a loop.

## Script keeps going after a failed step
level: mid
A deploy script copies files and restarts a service. It restarted the service even though the copy had failed.

```text
$ cat deploy.sh
#!/bin/bash
cp -r build/ /srv/app/
systemctl restart app

$ ./deploy.sh
cp: cannot create directory '/srv/app/build': Permission denied
Job for app.service ... started
```
? What change makes the script stop at the first failure?
+ Add set -euo pipefail after the shebang line, and handle expected failures on purpose
- Add sleep 5 between the two lines
- Redirect errors to /dev/null
- Run the script twice
why: By default bash continues after a failed command. set -e ends the script when a command fails, -u treats an unset variable as an error, and pipefail makes a pipeline fail when any part fails. They have limits, for example inside conditions, so also check the results of the steps that matter. Silencing errors only hides the problem.

## Script behaves differently under cron
level: mid
A script that parses JSON works in a terminal but fails in a scheduled job.

```text
$ crontab -l
*/5 * * * * /opt/bin/check.sh

$ cat /var/log/check.log
/opt/bin/check.sh: line 7: jq: command not found
```
? What is the most likely cause?
+ Cron runs with a minimal PATH, so jq is not found. Use the full path to jq or set PATH at the top of the script
- jq is not installed on any server
- The script needs to run as root
- The time zone is wrong
why: Interactive shells load profiles that extend PATH. Cron does not. Set PATH explicitly in the script or crontab and use absolute paths for tools. Redirect output so such errors are visible.

## Variable is empty inside a pipeline loop
level: mid
A counter set inside a loop is zero after the loop.

```text
count=0
cat hosts.txt | while read h; do
  count=$((count+1))
done
echo "hosts: $count"
hosts: 0
```
? Why does this happen and how do you fix it?
+ The pipeline runs the loop in a subshell, so changes are lost. Read from a redirect instead: while read h; do ...; done < hosts.txt
- Bash cannot do arithmetic
- The file is empty
- The variable name is reserved
why: Each side of a pipe runs in its own subshell, so variables set there disappear when it ends. A redirect keeps the loop in the current shell. This is a common cause of counters and lists that stay empty.
