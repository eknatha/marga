## Make a deploy script fail loudly
id: sh-strict-mode
module: bash
level: Beginner
minutes: 15
lesson: bash/safe-automation
engine: Simulated Linux shell
summary: Turn a script that carries on after errors into one that stops at the first problem and refuses unset variables.
@@ story
`~/deploy.sh` copies a build to the site folder. When the build file is missing it still prints "deploy finished OK", which has fooled the team twice. It also uses a variable that nobody sets. Make it safe, then give the variable a sensible default.
@@ goals
- Add `set -euo pipefail` on line 2, right after the shebang line.
- If the copy fails, the script must exit with a non-zero status and must not print "deploy finished OK".
- If TARGET_ENV is not set, the script uses `staging`. If it is set (for example to `prod`) the script uses that value.
@@ hints
- Run `./deploy.sh; echo "exit=$?"` and read what happens today.
- `set -e` stops at the first failing command, `-u` fails on unset variables, `-o pipefail` fails a pipeline when any part fails.
- Default values: `${TARGET_ENV:-staging}`.
- You can edit with `nano deploy.sh`, or from the command line with `sed -i`.
@@ world
{"dirs": [{"p": "/srv/site", "m": "755", "o": "user", "g": "user"}, {"p": "/home/user/build", "m": "755", "o": "user", "g": "user"}]}
@@ file /home/user/deploy.sh mode=755 owner=user
#!/bin/bash
# publish the build to the site folder
OUT=/srv/site
cd /home/user/build
cp site.tar "$OUT/"
echo "published to $TARGET_ENV"
echo "deploy finished OK"
@@ file /home/user/build/notes.txt mode=644 owner=user
build notes
@@ checks
[
 {"t":"contains","path":"/home/user/deploy.sh","re":"^set -euo pipefail$","label":"deploy.sh contains set -euo pipefail"},
 {"t":"cmd","run":"./deploy.sh 2>&1","code":1,"notOut":"deploy finished OK","label":"a failed copy stops the script with status 1"},
 {"t":"cmd","run":"touch build/site.tar; ./deploy.sh","code":0,"out":"published to staging","label":"with the build present, TARGET_ENV defaults to staging"},
 {"t":"cmd","run":"touch build/site.tar; TARGET_ENV=prod ./deploy.sh","code":0,"out":"published to prod","label":"a TARGET_ENV given by the caller is respected"}
]
@@ solution
./deploy.sh; echo "exit=$?"
sed -i '1a set -euo pipefail' deploy.sh
sed -i 's/\$TARGET_ENV/${TARGET_ENV:-staging}/' deploy.sh
cat deploy.sh
@@ explain
Without `set -e` a script keeps going after a failure and ends with the status of its last command, so a broken deploy can look fine. Strict mode makes the first problem the last step. The default value keeps the strictness: the variable is always set when it is used.

## Summarise a log with awk
id: sh-log-report
module: bash
level: Intermediate
minutes: 20
lesson: bash/text-processing
engine: Simulated Linux shell
summary: Write a small script that counts log levels, sorts them, and handles bad input with proper exit codes.
@@ story
Write `~/summarize.sh`. Given a log file it prints one line per log level, as `LEVEL COUNT`, most frequent first. The level is the third word of each line. With the wrong number of arguments it prints a usage line to standard error and exits with status 2. With a file that does not exist it prints an error and exits with status 1.
@@ goals
- `./summarize.sh app.log` prints lines such as `INFO 12`, most frequent level first.
- No arguments: usage message on stderr, exit status 2.
- Missing file: message that says "not found" on stderr, exit status 1.
- The script is executable. app.log is not modified.
@@ hints
- `awk '{c[$3]++} END {for (l in c) print l, c[l]}' FILE` counts per level. awk does not promise an order, so sort the result.
- `sort -k2,2nr` sorts on the second field, numerically, largest first.
- `$#` is the number of arguments, `$1` the first, `>&2` sends output to standard error, `exit N` sets the status.
- `chmod +x summarize.sh` when the file is ready.
@@ world
{}
@@ file /home/user/app.log mode=644 owner=user
2026-01-05 10:00:00 INFO request served
2026-01-05 10:00:01 ERROR upstream timeout
2026-01-05 10:00:02 WARN slow query
2026-01-05 10:00:03 ERROR upstream timeout
2026-01-05 10:00:04 INFO request served
2026-01-05 10:00:05 INFO request served
2026-01-05 10:00:06 WARN slow query
2026-01-05 10:00:07 INFO request served
2026-01-05 10:00:08 INFO request served
2026-01-05 10:00:09 ERROR upstream timeout
2026-01-05 10:00:10 DEBUG cache probe
2026-01-05 10:00:11 ERROR upstream timeout
2026-01-05 10:00:12 INFO request served
2026-01-05 10:00:13 INFO request served
2026-01-05 10:00:14 WARN slow query
2026-01-05 10:00:15 DEBUG cache probe
2026-01-05 10:00:16 INFO request served
2026-01-05 10:00:17 INFO request served
2026-01-05 10:00:18 ERROR upstream timeout
2026-01-05 10:00:19 WARN slow query
2026-01-05 10:00:20 INFO request served
2026-01-05 10:00:21 INFO request served
2026-01-05 10:00:22 ERROR upstream timeout
2026-01-05 10:00:23 ERROR upstream timeout
2026-01-05 10:00:24 INFO request served
@@ file /home/user/summarize.sh mode=644 owner=user
#!/bin/bash
# Usage: ./summarize.sh LOGFILE
# Print "LEVEL COUNT" for every level, most frequent first.
@@ checks
[
 {"t":"cmd","run":"test -x summarize.sh","code":0,"label":"summarize.sh is executable"},
 {"t":"cmd","run":"./summarize.sh app.log | tr '\\n' ','","out":"^INFO 12,ERROR 7,WARN 4,DEBUG 2,$","label":"levels are counted and sorted, largest first"},
 {"t":"cmd","run":"./summarize.sh 2>&1","code":2,"out":"[Uu]sage","label":"no arguments: usage message and status 2"},
 {"t":"cmd","run":"./summarize.sh nope.log 2>&1","code":1,"out":"not found","label":"missing file: 'not found' and status 1"},
 {"t":"unchanged","path":"/home/user/app.log","label":"app.log was not modified"}
]
@@ solution
cat > summarize.sh <<'EOF'
#!/bin/bash
# Usage: ./summarize.sh LOGFILE
if [ $# -ne 1 ]; then
  echo "usage: $0 LOGFILE" >&2
  exit 2
fi
if [ ! -f "$1" ]; then
  echo "error: $1 not found" >&2
  exit 1
fi
awk '{c[$3]++} END {for (l in c) print l, c[l]}' "$1" | sort -k2,2nr
EOF
chmod +x summarize.sh
./summarize.sh app.log
@@ explain
A small script becomes a tool when it checks its input and reports problems through exit codes. awk does the counting, `sort` does the ordering, and the exit codes let other scripts and cron decide what to do next.

## Query an API response with jq
id: sh-jq-api
module: bash
level: Intermediate
minutes: 15
lesson: bash/apis-and-json
engine: Simulated Linux shell (jq subset)
summary: Pull facts out of a JSON deployment report with jq instead of grep and guesswork.
@@ story
A deployment API returned `~/deployments.json`. The release manager wants three small files: the services whose deployment failed, how many failed, and the service that took the longest.
@@ goals
- ~/failed.txt: the names of failed services, one per line, sorted alphabetically.
- ~/count.txt: the number of failed deployments.
- ~/slowest.txt: the name of the service with the largest `seconds` value.
@@ hints
- `jq . deployments.json` shows the structure. Services are in `.deployments[]`.
- `select(.status == "failed")` keeps only the failed ones. `-r` prints raw strings without quotes.
- `[ ... ] | length` counts results. `max_by(.seconds)` picks the largest.
@@ world
{}
@@ file /home/user/deployments.json mode=644 owner=user
{
  "deployments": [
    {"service": "web", "status": "ok", "seconds": 42},
    {"service": "db-migrate", "status": "failed", "seconds": 310},
    {"service": "cache", "status": "ok", "seconds": 12},
    {"service": "auth", "status": "failed", "seconds": 95},
    {"service": "search", "status": "ok", "seconds": 260},
    {"service": "billing", "status": "failed", "seconds": 30}
  ]
}
@@ checks
[
 {"t":"equals","path":"/home/user/failed.txt","text":"auth\nbilling\ndb-migrate","label":"failed.txt lists auth, billing, db-migrate"},
 {"t":"equals","path":"/home/user/count.txt","text":"3","label":"count.txt contains 3"},
 {"t":"equals","path":"/home/user/slowest.txt","text":"db-migrate","label":"slowest.txt contains db-migrate"},
 {"t":"unchanged","path":"/home/user/deployments.json","label":"deployments.json was not modified"}
]
@@ solution
jq . deployments.json
jq -r '.deployments[] | select(.status == "failed") | .service' deployments.json | sort > failed.txt
jq '[.deployments[] | select(.status == "failed")] | length' deployments.json > count.txt
jq -r '.deployments | max_by(.seconds) | .service' deployments.json > slowest.txt
@@ explain
jq understands the structure of JSON, so filters stay correct when the formatting changes. grep on JSON breaks the moment a field moves to another line. This simulator implements a subset of jq: the filters used here work as in the real tool.

## Fix a script that breaks on spaces
id: sh-quoting-bug
module: bash
level: Intermediate
minutes: 15
lesson: bash/debugging-shell-scripts
engine: Simulated Linux shell
summary: Find why a cleanup script skips files with spaces in their names, and fix it with quoting and globs.
@@ story
`~/cleanup.sh` should delete every `.tmp` file in `~/reports`. It leaves some behind: the ones with spaces in the name. The cause is the oldest bug in shell scripting, and it can also delete the wrong thing.
@@ goals
- After `./cleanup.sh`, no `.tmp` file is left in ~/reports, including `q1 summary.tmp`.
- `final.pdf` and `Q3 draft.docx` must still be there.
- The script no longer parses the output of `ls`.
@@ hints
- Run `./cleanup.sh` and then `ls ~/reports` to see which files stay.
- `$(ls ...)` and unquoted `$f` are split at every space. A glob such as `"$DIR"/*.tmp` keeps each name in one piece.
- Always quote variables that hold file names: `rm -- "$f"`.
- If no file matches, the glob stays as written. `[ -e "$f" ] || continue` handles that.
@@ world
{}
@@ file /home/user/cleanup.sh mode=755 owner=user
#!/bin/bash
DIR=/home/user/reports
for f in $(ls $DIR); do
  if [ -f $DIR/$f ] && [[ $f == *.tmp ]]; then
    echo "removing $f"
    rm $DIR/$f
  fi
done
@@ file /home/user/reports/q1%20summary.tmp mode=644 owner=user
x
@@ file /home/user/reports/q2%20summary.tmp mode=644 owner=user
x
@@ file /home/user/reports/notes.tmp mode=644 owner=user
x
@@ file /home/user/reports/final.pdf mode=644 owner=user
x
@@ file /home/user/reports/Q3%20draft.docx mode=644 owner=user
x
@@ checks
[
 {"t":"cmd","run":"./cleanup.sh > /dev/null 2>&1; find /home/user/reports -type f | sort","notOut":"\\.tmp","label":"no .tmp file is left, including the ones with spaces"},
 {"t":"cmd","run":"./cleanup.sh > /dev/null 2>&1; find /home/user/reports -type f | sort","out":"final\\.pdf","label":"final.pdf is still there"},
 {"t":"cmd","run":"./cleanup.sh > /dev/null 2>&1; find /home/user/reports -type f | sort","out":"Q3 draft\\.docx","label":"Q3 draft.docx is still there"},
 {"t":"contains","path":"/home/user/cleanup.sh","re":"\\$\\(ls","not":true,"label":"the script does not parse ls output"}
]
@@ solution
./cleanup.sh
ls ~/reports
cat > cleanup.sh <<'EOF'
#!/bin/bash
DIR=/home/user/reports
for f in "$DIR"/*.tmp; do
  [ -e "$f" ] || continue
  echo "removing $f"
  rm -- "$f"
done
EOF
@@ explain
Unquoted expansions are split into words on spaces and then expanded as globs. File names are the classic victim. Quote every expansion that holds a name, and let the shell's own glob produce the list of files instead of parsing `ls`.

## Build a backup script with functions
id: sh-backup-func
module: bash
level: Intermediate
minutes: 20
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Write functions for usage, logging and the main job, with arguments, checks and exit codes.
@@ story
Finish `~/backup.sh SOURCE_DIR DEST_DIR`. It copies the regular files directly inside SOURCE_DIR (not sub-folders) into DEST_DIR, creating DEST_DIR when needed. The skeleton has three empty functions. Fill them in.
@@ goals
- No arguments (or the wrong number): `usage: ...` on stderr and exit status 2.
- SOURCE_DIR does not exist: a message containing "not found" on stderr and exit status 1.
- Otherwise copy the files, then print `backed up N files to DEST` and exit with status 0.
- Sub-folders of SOURCE_DIR are not copied.
@@ hints
- `local` keeps variables inside a function. `"$@"` passes all arguments on.
- `[ -d DIR ]` tests for a directory, `[ -f FILE ]` for a regular file. `mkdir -p` creates a folder and does not complain if it exists.
- Count with `n=$((n + 1))`.
- Test your script: `./backup.sh data out; ls out`.
@@ world
{}
@@ file /home/user/backup.sh mode=755 owner=user
#!/bin/bash
# Usage: ./backup.sh SOURCE_DIR DEST_DIR
usage() { :; }
log() { :; }
main() { :; }
main "$@"
@@ file /home/user/data/a.txt mode=644 owner=user
alpha
@@ file /home/user/data/b.txt mode=644 owner=user
beta
@@ file /home/user/data/c.log mode=644 owner=user
gamma
@@ file /home/user/data/old/x.txt mode=644 owner=user
old
@@ checks
[
 {"t":"cmd","run":"./backup.sh 2>&1","code":2,"out":"usage","label":"no arguments: usage and status 2"},
 {"t":"cmd","run":"./backup.sh /nope /tmp/x 2>&1","code":1,"out":"not found","label":"missing source: 'not found' and status 1"},
 {"t":"cmd","run":"./backup.sh data out1","code":0,"out":"backed up 3 files to out1","label":"prints how many files were backed up"},
 {"t":"cmd","run":"./backup.sh data out2 > /dev/null; find out2 | sort | tr '\\n' ' '","out":"^out2 out2/a\\.txt out2/b\\.txt out2/c\\.log $","label":"only the three files are copied, not the sub-folder"}
]
@@ solution
cat > backup.sh <<'EOF'
#!/bin/bash
# Usage: ./backup.sh SOURCE_DIR DEST_DIR
usage() { echo "usage: $0 SOURCE_DIR DEST_DIR" >&2; exit 2; }
log() { echo "$*"; }
main() {
  [ $# -eq 2 ] || usage
  local src=$1 dest=$2 n=0 f
  if [ ! -d "$src" ]; then
    echo "error: source not found: $src" >&2
    exit 1
  fi
  mkdir -p "$dest"
  for f in "$src"/*; do
    [ -f "$f" ] || continue
    cp "$f" "$dest/"
    n=$((n + 1))
  done
  log "backed up $n files to $dest"
}
main "$@"
EOF
./backup.sh data out
@@ explain
Functions give a script a shape: `usage` handles bad input, `log` is the one place that prints, `main` does the work. Exit codes carry the result to whoever called the script, which is what makes it safe to use from cron or CI.

## Rename files with parameter expansion
id: sh-rename-ext
module: bash
level: Intermediate
minutes: 15
lesson: bash/arrays-and-parameter-expansion
engine: Simulated Linux shell
summary: Change file extensions in bulk without calling sed on every name, and never overwrite an existing file.
@@ story
The photo folder mixes `.jpeg` and `.jpg`. Write `~/fixext.sh DIR` that renames every `.jpeg` file in DIR to `.jpg`. If a `.jpg` with the same base name already exists, the script must skip that file and say so, not overwrite it.
@@ goals
- Rename `trip 1.jpeg`, `trip 2.jpeg` and `cat.jpeg` to `.jpg`.
- `dog.jpeg` must stay as it is, because `dog.jpg` exists. Print `skip: dog.jpeg` on stderr.
- Print `renamed 3 files` at the end.
- Other files (notes.txt) are untouched. File names with spaces work.
@@ hints
- `${f%.jpeg}` removes the shortest match of `.jpeg` from the end of `$f`. Add `.jpg` to build the new name.
- `[ -e "$new" ]` tests whether a path exists.
- `mv -- "$f" "$new"` moves. Quote both names.
- `${1:?usage: fixext.sh DIR}` stops with a message when the argument is missing.
@@ world
{}
@@ file /home/user/fixext.sh mode=755 owner=user
#!/bin/bash
# Usage: ./fixext.sh DIR
@@ file /home/user/photos/trip%201.jpeg mode=644 owner=user
x
@@ file /home/user/photos/trip%202.jpeg mode=644 owner=user
x
@@ file /home/user/photos/cat.jpeg mode=644 owner=user
x
@@ file /home/user/photos/dog.jpeg mode=644 owner=user
new dog
@@ file /home/user/photos/dog.jpg mode=644 owner=user
old dog
@@ file /home/user/photos/notes.txt mode=644 owner=user
n
@@ checks
[
 {"t":"cmd","run":"./fixext.sh photos 2>&1","code":0,"out":"renamed 3 files","label":"the script reports renamed 3 files"},
 {"t":"cmd","run":"./fixext.sh photos > /dev/null 2>&1; find photos -type f | sort | tr '\\n' ','","out":"^photos/cat\\.jpg,photos/dog\\.jpeg,photos/dog\\.jpg,photos/notes\\.txt,photos/trip 1\\.jpg,photos/trip 2\\.jpg,$","label":"the right files were renamed and nothing else changed"},
 {"t":"cmd","run":"./fixext.sh photos > /dev/null 2>&1; cat photos/dog.jpg","out":"old dog","label":"the existing dog.jpg was not overwritten"},
 {"t":"cmd","run":"./fixext.sh photos 2>&1 >/dev/null","out":"skip: dog\\.jpeg","label":"the skip is reported"}
]
@@ solution
cat > fixext.sh <<'EOF'
#!/bin/bash
# Usage: ./fixext.sh DIR
dir=${1:?usage: fixext.sh DIR}
n=0
for f in "$dir"/*.jpeg; do
  [ -e "$f" ] || continue
  new="${f%.jpeg}.jpg"
  if [ -e "$new" ]; then
    echo "skip: $(basename "$f")" >&2
    continue
  fi
  mv -- "$f" "$new"
  n=$((n + 1))
done
echo "renamed $n files"
EOF
@@ explain
Parameter expansion does small string jobs inside the shell, with no extra processes. Combined with a test for existing files it makes a bulk rename safe: the script never destroys data because a name collided.

## Loop over files safely
id: sh-loop-files
module: bash
level: Beginner
minutes: 10
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Write a for loop that handles file names with spaces and counts lines per file.
@@ story
The folder ~/reports holds CSV files, some with spaces in the name. Write `~/count.sh` that prints `NAME LINES` for every .csv file in ~/reports, one per line, in alphabetical order.
@@ goals
- `~/count.sh` is executable and prints one `name lines` line per .csv file, for example `jan sales.csv 3`.
- It must work for names that contain spaces.
@@ hints
- A glob such as `for f in ~/reports/*.csv` keeps names with spaces together as long as you quote `"$f"`.
- `wc -l < "$f"` prints only the number. `basename "$f"` strips the folder.
- Start the file with `#!/bin/bash` and run `chmod +x ~/count.sh`.
@@ world
{}
@@ file /home/user/reports/jan%20sales.csv mode=644 owner=user
a
b
c
@@ file /home/user/reports/feb.csv mode=644 owner=user
x
y
@@ file /home/user/reports/notes.txt mode=644 owner=user
skip me
@@ checks
[
 {"t": "cmd", "run": "~/count.sh", "code": 0, "out": "feb.csv 2", "label": "feb.csv is counted"},
 {"t": "cmd", "run": "~/count.sh", "code": 0, "out": "jan sales.csv 3", "label": "the file with a space is counted correctly"},
 {"t": "cmd", "run": "~/count.sh", "notOut": "notes.txt", "label": "non-csv files are ignored"}
]
@@ solution
cat > ~/count.sh <<'EOF'
#!/bin/bash
for f in ~/reports/*.csv; do
  echo "$(basename "$f") $(wc -l < "$f")"
done
EOF
chmod +x ~/count.sh
~/count.sh
@@ explain
Quote every expansion of a file name. A glob in a for loop already splits names correctly, but only if the variable stays in double quotes when you use it.

## Parse arguments with case
id: sh-args-case
module: bash
level: Intermediate
minutes: 15
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Give a script a start, stop and status command, and a helpful message for anything else.
@@ story
Write `~/svc.sh`, a tiny control script. It takes one command: `start`, `stop` or `status`, and prints `service started`, `service stopped` or `service is unknown-state` respectively. For any other input it prints a usage line to stderr and exits with status 2.
@@ goals
- `./svc.sh start` prints `service started` and exits 0 (same for `stop`).
- `./svc.sh status` prints `service status: ok`.
- No argument or an unknown one: a line starting with `usage:` on stderr and exit status 2.
@@ hints
- A `case "${1:-}" in start) ... ;; esac` block handles each command.
- The catch-all branch is `*)`. Send messages to stderr with `>&2` and leave with `exit 2`.
- Test the bad path with `./svc.sh; echo "exit=$?"`.
@@ world
{}
@@ checks
[
 {"t": "cmd", "run": "~/svc.sh start", "code": 0, "out": "service started", "label": "start works"},
 {"t": "cmd", "run": "~/svc.sh stop", "code": 0, "out": "service stopped", "label": "stop works"},
 {"t": "cmd", "run": "~/svc.sh status", "code": 0, "out": "service status: ok", "label": "status works"},
 {"t": "cmd", "run": "~/svc.sh bogus 2>&1", "code": 2, "out": "usage:", "label": "an unknown command prints usage and exits 2"},
 {"t": "cmd", "run": "~/svc.sh", "code": 2, "label": "no argument exits 2"}
]
@@ solution
cat > ~/svc.sh <<'EOF'
#!/bin/bash
case "${1:-}" in
  start)  echo "service started" ;;
  stop)   echo "service stopped" ;;
  status) echo "service status: ok" ;;
  *)      echo "usage: $0 start|stop|status" >&2; exit 2 ;;
esac
EOF
chmod +x ~/svc.sh
~/svc.sh start; ~/svc.sh bogus; echo "exit=$?"
@@ explain
Control scripts follow one pattern: a case statement for commands, a clear usage message on stderr, and a distinct exit code for misuse. Callers and monitoring then know the difference between a failure and a typing mistake.

## Read a config file line by line
id: sh-read-config
module: bash
level: Intermediate
minutes: 15
lesson: bash/text-processing
engine: Simulated Linux shell
summary: Use while read to turn key=value lines into a report, skipping comments and blank lines.
@@ story
The file ~/app.conf holds settings as `key=value`, with comments and blank lines mixed in. Write `~/show.sh` that prints each setting as `key -> value` and ignores comments (lines starting with #) and empty lines.
@@ goals
- `~/show.sh` prints one `key -> value` line per setting, in file order.
- Comments and blank lines produce no output.
@@ hints
- `while IFS== read -r key value; do ... done < ~/app.conf` splits at the first `=`.
- Skip with `[[ -z $key || $key == \#* ]] && continue`.
- Print with `echo "$key -> $value"`.
@@ world
{}
@@ file /home/user/app.conf mode=644 owner=user
# application settings
host=db.internal

port=5432
# retries are optional
retries=3
mode=read=only
@@ checks
[
 {"t": "cmd", "run": "~/show.sh", "code": 0, "out": "host -> db.internal", "label": "host is shown"},
 {"t": "cmd", "run": "~/show.sh", "code": 0, "out": "port -> 5432", "label": "port is shown"},
 {"t": "cmd", "run": "~/show.sh", "code": 0, "out": "mode -> read=only", "label": "only the first = splits key and value"},
 {"t": "cmd", "run": "~/show.sh", "notOut": "#", "label": "comments are skipped"}
]
@@ solution
cat > ~/show.sh <<'EOF'
#!/bin/bash
while IFS== read -r key value; do
  [[ -z $key || $key == \#* ]] && continue
  echo "$key -> $value"
done < ~/app.conf
EOF
chmod +x ~/show.sh
~/show.sh
@@ explain
A while-read loop with IFS set to the separator is the standard way to parse simple files in the shell. The -r flag stops backslashes from being altered, and putting the redirect at the end of the loop feeds the file to it.

## Check a list of hosts with a function
id: sh-health-func
module: bash
level: Intermediate
minutes: 15
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Write a reusable function, use its return code, and report a summary with an exit status.
@@ story
Write `~/check.sh`. For each URL in ~/urls.txt it calls curl (use `curl -s -o /dev/null -f URL`) and prints `OK URL` or `FAIL URL`. At the end it exits with status 1 if any URL failed, otherwise 0.
@@ goals
- Output has one `OK` or `FAIL` line per URL, in file order.
- The exit status is 1 when at least one URL failed, 0 when all passed.
@@ hints
- Wrap the test in a function: `check() { curl -s -o /dev/null -f "$1"; }` and use `if check "$u"; then ... fi`.
- Keep a counter, for example `fail=0`, and add one on each failure.
- Finish with `exit $(( fail > 0 ))`.
@@ world
{"net": {"iface": {"ip": "10.0.0.5", "prefix": 24}, "gateway": "10.0.0.1", "hosts": {"10.0.0.20": {"up": true, "rtt": 1, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "ok\n"}, "/health": {"status": 200, "body": "ok\n"}}}, "10.0.0.21": {"up": true, "rtt": 1, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "ok\n"}, "/health": {"status": 503, "body": "down\n"}}}}}}
@@ file /home/user/urls.txt mode=644 owner=user
http://10.0.0.20/health
http://10.0.0.21/health
http://10.0.0.20/
@@ checks
[
 {"t": "cmd", "run": "~/check.sh", "code": 1, "out": "OK http://10.0.0.20/health", "label": "a healthy URL is reported OK"},
 {"t": "cmd", "run": "~/check.sh", "code": 1, "out": "FAIL http://10.0.0.21/health", "label": "a failing URL is reported FAIL"},
 {"t": "cmd", "run": "~/check.sh", "code": 1, "out": "OK http://10.0.0.20/\n", "label": "every URL is checked, even after a failure"}
]
@@ solution
cat > ~/check.sh <<'EOF'
#!/bin/bash
check() { curl -s -o /dev/null -f "$1"; }
fail=0
while read -r u; do
  if check "$u"; then echo "OK $u"; else echo "FAIL $u"; fail=$((fail+1)); fi
done < ~/urls.txt
exit $(( fail > 0 ))
EOF
chmod +x ~/check.sh
~/check.sh; echo "exit=$?"
@@ explain
Functions let you name a check once and reuse it. Counting failures instead of exiting on the first one means the report is complete, and the final exit status lets a scheduler or pipeline react to the result.

## Clean up with a trap
id: sh-trap-cleanup
module: bash
level: Advanced
minutes: 20
lesson: bash/safe-automation
engine: Simulated Linux shell
summary: Make a script remove its temporary file on exit, even when it fails part-way.
@@ story
The script ~/job.sh writes a work file /tmp/job.work, then runs a step that fails. The work file is left behind every time and the next run trips over it. Add a trap so the file is always removed, without hiding the failure.
@@ goals
- After `~/job.sh` runs (even though it fails), /tmp/job.work does not exist.
- The script still exits with a non-zero status.
@@ hints
- `trap "rm -f /tmp/job.work" EXIT` runs the command whenever the script ends, success or failure.
- Put the trap near the top, before the work file is created.
- Do not add `|| true` to the failing step; the failure must remain visible.
@@ world
{}
@@ file /home/user/job.sh mode=755 owner=user
#!/bin/bash
set -e
echo "working" > /tmp/job.work
cat /tmp/job.work
false
echo "done"
@@ checks
[
 {"t": "cmd", "run": "~/job.sh; test ! -e /tmp/job.work && echo CLEAN", "code": 0, "out": "CLEAN", "label": "the work file is removed after a run"},
 {"t": "cmd", "run": "~/job.sh", "code": 1, "notOut": "done", "label": "the job still fails and does not print done"},
 {"t": "contains", "path": "/home/user/job.sh", "re": "trap", "label": "the script uses a trap"}
]
@@ solution
sed -i '2a trap "rm -f /tmp/job.work" EXIT' ~/job.sh
cat ~/job.sh
~/job.sh; echo "exit=$?"
ls /tmp/job.work
@@ explain
A trap on EXIT is the shell equivalent of a finally block. It keeps temporary files from piling up and does not change the exit status, so failures stay visible to whoever called the script.

## Build a one-line report with a pipeline
id: sh-pipeline-top
module: bash
level: Beginner
minutes: 10
lesson: bash/text-processing
engine: Simulated Linux shell
summary: Combine cut, sort and uniq to find the most common value in a column.
@@ story
The web server access log has one request per line. The first field is the client address and the seventh is the path. Find the three most requested paths and save them with their counts.
@@ goals
- Write ~/top3.txt with the three most requested paths, one per line, as `COUNT PATH` (count first), most requested first.
- Do not change the log.
@@ hints
- `awk "{print \$7}" FILE` prints the seventh field.
- `sort | uniq -c | sort -rn | head -3` counts, ranks and keeps three.
- `uniq -c` pads the count with spaces; clean it with `awk "{print \$1, \$2}"`.
@@ world
{}
@@ file /var/log/nginx/access.log mode=644 owner=root
10.0.0.1 - - [05/Jan/2025:10:00:01 +0000] "GET /home HTTP/1.1" 200 512
10.0.0.2 - - [05/Jan/2025:10:00:02 +0000] "GET /api/items HTTP/1.1" 200 900
10.0.0.3 - - [05/Jan/2025:10:00:03 +0000] "GET /home HTTP/1.1" 200 512
10.0.0.1 - - [05/Jan/2025:10:00:04 +0000] "GET /login HTTP/1.1" 200 300
10.0.0.4 - - [05/Jan/2025:10:00:05 +0000] "GET /api/items HTTP/1.1" 200 900
10.0.0.2 - - [05/Jan/2025:10:00:06 +0000] "GET /home HTTP/1.1" 200 512
10.0.0.5 - - [05/Jan/2025:10:00:07 +0000] "GET /about HTTP/1.1" 200 200
10.0.0.6 - - [05/Jan/2025:10:00:08 +0000] "GET /api/items HTTP/1.1" 200 900
10.0.0.7 - - [05/Jan/2025:10:00:09 +0000] "GET /home HTTP/1.1" 200 512
10.0.0.8 - - [05/Jan/2025:10:00:10 +0000] "GET /login HTTP/1.1" 200 300
@@ checks
[
 {"t": "equals", "path": "/home/user/top3.txt", "text": "4 /home\n3 /api/items\n2 /login", "label": "top3.txt lists /home (4), /api/items (3), /login (2)"},
 {"t": "unchanged", "path": "/var/log/nginx/access.log", "label": "the log was not changed"}
]
@@ solution
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -3 | awk '{print $1, $2}' > ~/top3.txt
cat ~/top3.txt
@@ explain
Most quick reports are the same four steps: extract, sort, count, rank. Because every stage reads text and writes text, you can test each one alone and combine them later.

## Parse flags with while and shift
id: sh-flags-shift
module: bash
level: Intermediate
minutes: 15
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Give a script options such as -v and -n NAME using a while loop, case and shift.
@@ story
Write `~/greet.sh`. It accepts `-n NAME` (default `world`) and `-v` (verbose). It prints `hello NAME`. With -v it first prints `verbose on`. Any other flag prints `unknown option: FLAG` to stderr and exits with status 2.
@@ goals
- `./greet.sh` prints `hello world`; `./greet.sh -n Asha` prints `hello Asha`.
- `-v` prints `verbose on` before the greeting; options may come in any order.
- An unknown flag exits with status 2 and an error on stderr.
@@ hints
- Loop while there are arguments: `while [ $# -gt 0 ]; do case "$1" in ... esac; shift; done`.
- `-n) name=$2; shift ;;` takes a value and removes it. Set defaults before the loop: `name=world; verbose=0`.
- The catch-all branch `*)` prints the error to stderr with `>&2` and calls `exit 2`.
@@ world
{}
@@ checks
[
 {"t": "cmd", "run": "~/greet.sh", "code": 0, "out": "^hello world$", "label": "the default greeting"},
 {"t": "cmd", "run": "~/greet.sh -n Asha", "code": 0, "out": "^hello Asha$", "label": "-n sets the name"},
 {"t": "cmd", "run": "~/greet.sh -v -n Asha", "code": 0, "out": "verbose on\nhello Asha", "label": "-v prints a line first, in any order of flags"},
 {"t": "cmd", "run": "~/greet.sh -n Asha -v", "code": 0, "out": "verbose on", "label": "the order of flags does not matter"},
 {"t": "cmd", "run": "~/greet.sh -x 2>&1", "code": 2, "out": "unknown option: -x", "label": "an unknown flag exits 2 with a message"}
]
@@ solution
cat > ~/greet.sh <<'EOF'
#!/bin/bash
name=world
verbose=0
while [ $# -gt 0 ]; do
  case "$1" in
    -n) name=$2; shift ;;
    -v) verbose=1 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
  shift
done
[ "$verbose" = 1 ] && echo "verbose on"
echo "hello $name"
EOF
chmod +x ~/greet.sh
~/greet.sh -v -n Asha
@@ explain
A while loop with shift is the portable way to parse options in a short script. Setting defaults first, handling every known flag, and failing on unknown ones with a distinct exit code makes a script predictable for the people and tools that call it.

## Work with an array of hosts
id: sh-array-hosts
module: bash
level: Beginner
minutes: 10
lesson: bash/arrays-and-parameter-expansion
engine: Simulated Linux shell
summary: Store hosts in an array, count them, and loop with the index.
@@ story
Write `~/hosts.sh`. It holds the three hosts web-1, web-2 and db-1 in an array. It prints `3 hosts`, then one line per host in the form `1: web-1`, `2: web-2`, `3: db-1` (numbers start at 1).
@@ goals
- `~/hosts.sh` prints `3 hosts`, then the numbered lines.
- The host names live in one array, not in three separate lines of echo.
@@ hints
- `hosts=(web-1 web-2 db-1)` creates the array. `${#hosts[@]}` is the number of elements.
- Loop over indexes: `for i in "${!hosts[@]}"; do ... done`. Add one for the number: `$((i+1))`.
- Quote the expansions to keep names with spaces intact.
@@ world
{}
@@ checks
[
 {"t": "cmd", "run": "~/hosts.sh", "code": 0, "out": "^3 hosts\n1: web-1\n2: web-2\n3: db-1$", "label": "the output has the count and three numbered lines"},
 {"t": "contains", "path": "/home/user/hosts.sh", "re": "hosts=\\(", "label": "the hosts are stored in an array"}
]
@@ solution
cat > ~/hosts.sh <<'EOF'
#!/bin/bash
hosts=(web-1 web-2 db-1)
echo "${#hosts[@]} hosts"
for i in "${!hosts[@]}"; do
  echo "$((i+1)): ${hosts[$i]}"
done
EOF
chmod +x ~/hosts.sh
~/hosts.sh
@@ explain
Arrays keep a list of values together and handle spaces correctly, which a space-separated string does not. The three expansions to remember are ${arr[@]} for all elements, ${#arr[@]} for the count and ${!arr[@]} for the indexes.

## Generate a config with a here-document
id: sh-heredoc-config
module: bash
level: Intermediate
minutes: 15
lesson: bash/text-processing
engine: Simulated Linux shell
summary: Create a configuration file from variables using a here-document.
@@ story
Write `~/mkconf.sh APP PORT`. It writes the file `~/APP.conf` with the lines `name=APP`, `port=PORT` and `log=/var/log/APP.log`. A missing argument prints a usage message to stderr and exits with status 2. An existing file is never overwritten: print `exists` and exit with status 1.
@@ goals
- `~/mkconf.sh shop 8080` creates ~/shop.conf with the three lines.
- Running it again for the same app exits with status 1 and does not change the file.
- No arguments or one argument: usage message and exit status 2.
@@ hints
- Check the arguments first: `[ $# -eq 2 ] || { echo "usage: ..." >&2; exit 2; }`.
- `[ -e "$file" ]` tests for an existing file. Use `exit 1` after printing `exists`.
- `cat > "$file" <<EOF ... EOF` expands variables inside the text. Quote the delimiter (`<<'EOF'`) only when you do not want that.
@@ world
{}
@@ checks
[
 {"t": "cmd", "run": "~/mkconf.sh shop 8080; cat ~/shop.conf", "code": 0, "out": "^name=shop\nport=8080\nlog=/var/log/shop\\.log$", "label": "the file has the three lines"},
 {"t": "cmd", "run": "~/mkconf.sh shop 8080; ~/mkconf.sh shop 9999; echo \"rc=$?\"; cat ~/shop.conf", "code": 0, "out": "exists\nrc=1\nname=shop\nport=8080", "label": "an existing file is not overwritten"},
 {"t": "cmd", "run": "~/mkconf.sh shop 2>&1", "code": 2, "out": "usage", "label": "a missing argument prints usage and exits 2"}
]
@@ solution
cat > ~/mkconf.sh <<'EOF'
#!/bin/bash
[ $# -eq 2 ] || { echo "usage: $0 APP PORT" >&2; exit 2; }
app=$1; port=$2
file="$HOME/$app.conf"
if [ -e "$file" ]; then echo exists; exit 1; fi
cat > "$file" <<CONF
name=$app
port=$port
log=/var/log/$app.log
CONF
EOF
chmod +x ~/mkconf.sh
~/mkconf.sh shop 8080
cat ~/shop.conf
@@ explain
A here-document is the simplest way to template a small file in the shell. Check inputs first, refuse to overwrite, and use distinct exit codes so a caller can tell misuse from a refusal.

## Retry a flaky command
id: sh-retry-loop
module: bash
level: Intermediate
minutes: 15
lesson: bash/control-flow-and-functions
engine: Simulated Linux shell
summary: Write a retry function that gives up after three tries and reports the last status.
@@ story
The command `~/flaky.sh` fails the first two times it runs and succeeds on the third. Write `~/retry.sh`, which runs `~/flaky.sh` up to 3 times, printing `attempt N` before each try. It exits 0 as soon as the command succeeds, and with status 1 if all three tries fail.
@@ goals
- `~/retry.sh` prints attempt 1, attempt 2 and attempt 3, then exits 0.
- If the command never succeeds, the script exits 1 after three tries.
@@ hints
- Use a counter: `for n in 1 2 3; do echo "attempt $n"; if ~/flaky.sh; then exit 0; fi; done; exit 1`.
- Look at `cat ~/flaky.sh` to see how it counts.
- Delete ~/flaky.count to start over when testing.
@@ world
{}
@@ file /home/user/flaky.sh mode=755 owner=user
#!/bin/bash
f=$HOME/flaky.count
n=$(cat "$f" 2>/dev/null || echo 0)
n=$((n+1))
echo $n > "$f"
[ "$n" -ge 3 ]
@@ checks
[
 {"t": "cmd", "run": "rm -f ~/flaky.count; ~/retry.sh", "code": 0, "out": "attempt 1\nattempt 2\nattempt 3", "label": "it tries three times and then succeeds"},
 {"t": "cmd", "run": "rm -f ~/flaky.count; ~/retry.sh; echo done", "code": 0, "notOut": "attempt 4", "label": "it stops after a success"},
 {"t": "cmd", "run": "echo 0 > ~/flaky.count; sed -i 's/-ge 3/-ge 9/' ~/flaky.sh; ~/retry.sh", "code": 1, "out": "attempt 3", "label": "when every try fails it exits 1 after three tries"}
]
@@ solution
cat ~/flaky.sh
cat > ~/retry.sh <<'EOF'
#!/bin/bash
for n in 1 2 3; do
  echo "attempt $n"
  if ~/flaky.sh; then exit 0; fi
done
exit 1
EOF
chmod +x ~/retry.sh
rm -f ~/flaky.count
~/retry.sh
@@ explain
Retries help with short faults such as a busy service, but they need a limit, a visible count and an honest final status. Adding a growing pause (sleep 1, 2, 4) is the next step, and it also protects the service you call.

## Edit a config in place, safely
id: sh-sed-inplace
module: bash
level: Beginner
minutes: 10
lesson: bash/text-processing
engine: Simulated Linux shell
summary: Change one setting with sed -i, keep a backup, and leave comments alone.
@@ story
The file ~/app.conf has a setting `max_conn=100`, and a comment that mentions the same words. Change the value to 500 with sed, keep a backup called app.conf.bak, and do not touch any other line.
@@ goals
- ~/app.conf has `max_conn=500` and all other lines unchanged.
- ~/app.conf.bak holds the original file.
@@ hints
- `sed -i.bak "s/old/new/" file` edits in place and saves the original as file.bak.
- Anchor the pattern to the start of the line so the comment is not changed: `s/^max_conn=100$/max_conn=500/`.
- Compare with `diff app.conf.bak app.conf`.
@@ world
{}
@@ file /home/user/app.conf mode=644 owner=user
# max_conn=100 is the default for small servers
host=db.internal
max_conn=100
timeout=30
@@ checks
[
 {"t": "equals", "path": "/home/user/app.conf", "text": "# max_conn=100 is the default for small servers\nhost=db.internal\nmax_conn=500\ntimeout=30", "label": "only the setting changed"},
 {"t": "equals", "path": "/home/user/app.conf.bak", "text": "# max_conn=100 is the default for small servers\nhost=db.internal\nmax_conn=100\ntimeout=30", "label": "the backup is the original file"}
]
@@ solution
sed -i.bak 's/^max_conn=100$/max_conn=500/' ~/app.conf
diff ~/app.conf.bak ~/app.conf
cat ~/app.conf
@@ explain
Anchoring the pattern and keeping a backup are the two habits that make sed -i safe. Always look at a diff before you move on, because a pattern that is too broad changes more than you meant to.

## Build a report from JSON with jq
id: sh-jq-report
module: bash
level: Intermediate
minutes: 15
lesson: bash/apis-and-json
engine: Simulated Linux shell
summary: Filter a JSON list, pick fields and format a short report.
@@ story
The file ~/deploys.json lists recent deployments. Write ~/failed.txt with one line per deployment whose status is `failed`, in the form `SERVICE VERSION`, in file order.
@@ goals
- ~/failed.txt contains `service version` lines for failed deployments only.
- ~/deploys.json is not changed.
@@ hints
- `jq . deploys.json` shows the structure. Each item has service, version and status.
- `jq -r '.[] | select(.status == "failed") | "\(.service) \(.version)"' deploys.json` filters and formats.
- Redirect into ~/failed.txt.
@@ world
{}
@@ file /home/user/deploys.json mode=644 owner=user
[
 {"service":"api","version":"1.4.0","status":"ok"},
 {"service":"web","version":"2.9.1","status":"failed"},
 {"service":"worker","version":"0.8.3","status":"ok"},
 {"service":"api","version":"1.4.1","status":"failed"},
 {"service":"db-migrate","version":"3.0.0","status":"ok"}
]
@@ checks
[
 {"t": "equals", "path": "/home/user/failed.txt", "text": "web 2.9.1\napi 1.4.1", "label": "failed.txt lists the two failed deployments"},
 {"t": "unchanged", "path": "/home/user/deploys.json", "label": "deploys.json is unchanged"}
]
@@ solution
jq . ~/deploys.json | head -8
jq -r '.[] | select(.status == "failed") | "\(.service) \(.version)"' ~/deploys.json > ~/failed.txt
cat ~/failed.txt
@@ explain
jq lets you treat JSON as data instead of text. The pattern select, then format is the same one you will use on cloud and Kubernetes output, and -r removes the quotes so the lines are plain text.
