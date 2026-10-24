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
