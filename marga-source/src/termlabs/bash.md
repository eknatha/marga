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
