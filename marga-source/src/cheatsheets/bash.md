---
title: Bash scripting
summary: Safe script headers, variables, conditionals, loops, functions and text-processing one-liners.
module: bash
---

## Safe header

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
```

| Option | Effect |
|--------|--------|
| `-e` | Exit when a command fails |
| `-u` | Treat unset variables as errors |
| `-o pipefail` | A pipeline fails if any stage fails |

## Variables and quoting

```bash
name="web"
echo "Hello, $name"              # double quotes expand variables
echo 'Literal $name'             # single quotes do not
echo "${name:-default}"          # default if unset or empty
echo "${#name}"                  # length
echo "${path##*/}"               # strip longest prefix up to /
echo "${file%.txt}"              # strip suffix
readonly LIMIT=10
```

Always quote expansions: `"$file"`, `"$@"`.

## Conditionals

```bash
if [[ -f "$file" && -r "$file" ]]; then
  echo "readable file"
elif [[ -d "$file" ]]; then
  echo "directory"
else
  echo "missing"
fi
```

| Test | True when |
|------|-----------|
| `-f F` / `-d F` | F is a file / directory |
| `-s F` | F exists and is not empty |
| `-z S` / `-n S` | String is empty / not empty |
| `A == B` | Strings equal (inside `[[ ]]`) |
| `N -gt M` | Number greater than |

## Loops

```bash
for f in *.log; do
  [[ -e "$f" ]] || continue
  gzip "$f"
done

while IFS= read -r line; do
  echo "line: $line"
done < input.txt

for i in {1..5}; do echo "$i"; done
```

## Functions and arguments

```bash
usage() { echo "usage: $0 ENV" >&2; exit 2; }

main() {
  local env="${1:-}"
  [[ -n "$env" ]] || usage
  echo "deploying to $env"
}

main "$@"
```

| Variable | Meaning |
|----------|---------|
| `$0` | Script name |
| `$1 ... $9` | Positional arguments |
| `$@` | All arguments, each separately quoted |
| `$#` | Number of arguments |
| `$?` | Exit status of the last command |

## Cleanup and temp files

```bash
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
```

## Text processing

```bash
grep -E "ERROR|WARN" app.log | wc -l
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head
awk -F, '$3 > 100 {print $1, $3}' data.csv
sed -i.bak 's/old/new/g' config.txt
cut -d: -f1 /etc/passwd
jq -r '.items[].metadata.name' pods.json
xargs -P4 -n1 gzip < filelist.txt
```

## Handy patterns

```bash
command -v jq >/dev/null || { echo "jq required" >&2; exit 1; }
retry() { local n=0; until "$@"; do n=$((n+1)); [[ $n -ge 3 ]] && return 1; sleep $((2**n)); done; }
exec 9>/tmp/job.lock && flock -n 9 || { echo "already running"; exit 1; }
```

## Safer scripts

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'
trap 'echo "failed at line $LINENO" >&2' ERR
trap 'rm -rf -- "$tmp"' EXIT
tmp=$(mktemp -d)
: "${ENVIRONMENT:?set ENVIRONMENT}"
command -v jq >/dev/null || { echo "jq is required" >&2; exit 1; }
```

> **Warning:** `set -e` is not a full safety net. It does not stop on failures inside `if` conditions, `&&` lists or command substitutions in some cases. Check exit codes of the commands that matter.

> **Danger:** `rm -rf "$tmp"` with an empty `tmp` is dangerous. The `:?` form (`${tmp:?}`) stops the script instead.

## Variables and expansion

```bash
name=${1:-default}
echo "${path##*/}"
echo "${file%.txt}.md"
echo "${#name}"
echo "${name^^}"
arr=(a b c); echo "${arr[@]}" "${#arr[@]}"
declare -A ages=([ann]=30 [bob]=25); echo "${ages[ann]}"
echo "$(date +%F)"
echo $((5 * 3))
printf '%s\n' "${arr[@]}"
```

> **Warning:** Always quote variables: `"$var"`. An unquoted value with spaces splits into several arguments, and `*` is expanded to file names.

## Loops, tests and functions

```bash
for f in *.log; do [ -e "$f" ] || continue; gzip "$f"; done
while IFS= read -r line; do echo "$line"; done < hosts.txt
[[ -f file && -r file ]] && echo readable
[[ $x =~ ^[0-9]+$ ]] && echo number
case "$1" in start) run ;; stop) halt ;; *) usage ;; esac
retry() { local n=0; until "$@"; do ((++n >= 5)) && return 1; sleep $((2**n)); done; }
```

## Input, output and files

```bash
cmd > out.txt 2> err.txt
cmd > all.txt 2>&1
cmd | tee out.txt
cmd <<'EOT'
literal text, no expansion
EOT
exec 3>>audit.log; echo "ran" >&3
mapfile -t lines < file.txt
find . -name '*.tmp' -print0 | xargs -0 rm -f
flock -n /tmp/job.lock ./job.sh
```

> **Danger:** `>` truncates the file immediately. A typo such as `cmd > important.conf` destroys the content. Use `set -o noclobber` or `>>` to append.

> **Warning:** `eval` runs a string as code. Never pass user input to it. Prefer arrays and `"${cmd[@]}"`.

> **Danger:** `xargs rm` and `find -delete` act at once. Run the command with `-print` or `echo` first.

## Debugging

```bash
bash -n script.sh
bash -x script.sh
set -x; risky; set +x
shellcheck script.sh
PS4='+ ${BASH_SOURCE}:${LINENO}: ' bash -x script.sh
echo "${PIPESTATUS[@]}"
```

> **Warning:** `set -x` prints every command, including ones that contain passwords or tokens. Turn it off around secrets, and do not leave it on in CI logs.
