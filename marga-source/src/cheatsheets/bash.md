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
