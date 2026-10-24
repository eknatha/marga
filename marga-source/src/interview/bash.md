## What does set -euo pipefail do and why use it?
level: junior
`-e` exits when a command fails, `-u` treats unset variables as errors, and `pipefail` makes a pipeline fail if any command in it fails, not just the last. Together they stop a script from carrying on after an error and doing damage with empty variables. Know the exceptions: commands in `if` conditions, `||` and `&&` lists do not trigger `-e`, so critical steps still need explicit checks.

## What is the difference between single and double quotes in Bash?
level: junior
Single quotes keep everything literal. Double quotes allow variable and command expansion but prevent word splitting and globbing. Always quote variable expansions, as in `"$file"`, so names with spaces or wildcards behave. Unquoted expansions are the most common cause of shell script bugs, and `shellcheck` finds them.

## How do you loop over files safely?
level: junior
Use a glob, not `ls`: `for f in /data/*.log; do ... done` and quote `"$f"` inside. Guard against no matches with `[ -e "$f" ] || continue`. For arbitrary names including newlines use `find ... -print0 | while IFS= read -r -d '' f; do ... done`. Parsing `ls` output breaks on spaces and special characters.

## What is the difference between $@ and $*?
level: mid
Unquoted they behave the same, splitting on whitespace. Quoted, `"$@"` expands to each argument as a separate word, preserving the original arguments exactly, while `"$*"` joins everything into a single word separated by the first character of `IFS`. Use `"$@"` when forwarding arguments to another command.

## How do you handle errors and cleanup in a script?
level: mid
Use `trap` to run cleanup on exit: `trap 'rm -rf "$tmp"' EXIT` runs on normal exit and on errors under `set -e`. Create temporary files with `mktemp`. Check critical commands explicitly and send errors to standard error with a clear message and a non-zero exit code. For long jobs also trap `INT` and `TERM` so the script can stop cleanly.

## How would you parse JSON from an API in a shell script?
level: mid
Use `curl -fsS -m 10` so HTTP errors and hangs fail the script, and pipe to `jq`. For example `jq -r '.items[] | select(.cpu > 0.8) | .name'`. Pass tokens from environment variables, not the command line, build request bodies with `jq -n --arg`, and handle pagination in a loop using the `next` link. Combine with `set -o pipefail` so a failed `curl` is not hidden.

## Explain what sed, awk and grep are each best at.
level: mid
`grep` selects lines that match a pattern. `sed` is a stream editor, best for substitutions and line edits such as `sed -i 's/old/new/g' file`. `awk` works on fields and records, so it suits columns, filtering by field values and summaries, for example `awk '$9 >= 500 {n++} END {print n}' access.log`. Pipelines combine them, but once logic grows, a small Python script is easier to maintain.

## When would you stop writing a Bash script and use Python instead?
level: senior
When the script needs data structures beyond simple arrays, complex JSON or YAML handling, real error handling, unit tests, retries with backoff, concurrency or more than about a hundred lines of logic. Bash is excellent for gluing commands together, starting services and small automation, but it is weak at structured data and testing. A good rule is that anything others must maintain and trust in production should be testable, which favours Python or Go.
