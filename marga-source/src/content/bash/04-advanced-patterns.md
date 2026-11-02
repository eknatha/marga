---
title: Advanced Bash: arguments, arrays and here-documents
minutes: 15
summary: Parse options with getopts, use arrays and associative arrays correctly, write here-documents, and combine commands with process substitution.
---

Once a script is more than a dozen lines, you need real argument handling, data structures and ways to generate files. Bash has all of these, with a few sharp edges you should know about.

## What you will learn

- Parsing flags with `getopts` and writing a usage message
- Indexed and associative arrays, and quoting them correctly
- Here-documents for config files and messages
- Process substitution, `mapfile` and parameter expansion

## Options with getopts

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: $0 [-e env] [-n] [-v] service..." >&2; exit 2; }

env="staging"; dry_run=0; verbose=0
while getopts ":e:nvh" opt; do
  case "$opt" in
    e) env="$OPTARG" ;;
    n) dry_run=1 ;;
    v) verbose=1 ;;
    h) usage ;;
    :) echo "option -$OPTARG needs a value" >&2; usage ;;
    \?) echo "unknown option -$OPTARG" >&2; usage ;;
  esac
done
shift $((OPTIND - 1))
[ "$#" -ge 1 ] || usage

for svc in "$@"; do
  echo "deploying $svc to $env (dry-run=$dry_run)"
done
```

A trailing colon after a letter in the option string means the option takes a value, and a leading colon turns on silent error handling so you print your own messages. After the loop, `shift` removes the parsed options so `"$@"` holds only the remaining arguments.

## Arrays

```bash
hosts=(web-1 web-2 "db 1")
hosts+=(cache-1)
echo "${#hosts[@]} hosts, first is ${hosts[0]}"
for h in "${hosts[@]}"; do
  echo "checking: $h"
done

declare -A port=([web]=8080 [api]=9000)
port[metrics]=9100
for name in "${!port[@]}"; do
  echo "$name uses port ${port[$name]}"
done
```

The quoting is the whole point: `"${hosts[@]}"` expands to one word per element and preserves the element with a space in it, while an unquoted `${hosts[@]}` splits it. Associative arrays need `declare -A` and Bash 4 or newer, which excludes the default Bash on macOS.

## Reading data safely

```bash
mapfile -t lines < <(grep -v '^#' servers.txt)
echo "read ${#lines[@]} lines"

while IFS=, read -r name ip role; do
  printf '%s has %s (%s)\n' "$name" "$ip" "$role"
done < inventory.csv

diff <(sort old.txt) <(sort new.txt)
```

`<(command)` is **process substitution**: it makes a command's output look like a file. `while read` with `IFS=` and `-r` preserves leading whitespace and backslashes. Reading with `for line in $(cat file)` splits on every space and is almost always a bug.

## Here-documents

```bash
cat > /etc/myapp/app.conf <<EOF
listen = ${PORT:-8080}
environment = ${ENVIRONMENT:?ENVIRONMENT must be set}
EOF

cat <<'EOF'
The quotes around the delimiter stop expansion, so $HOME prints literally.
EOF
```

An unquoted delimiter allows variable expansion. Quoting the delimiter prints the text as written, which is what you want when generating scripts or Kubernetes manifests that contain dollar signs.

## Parameter expansion you will use daily

```bash
file="/var/log/app/server.log.gz"
echo "${file##*/}"        # server.log.gz  (basename)
echo "${file%/*}"         # /var/log/app   (dirname)
echo "${file%.gz}"        # strip suffix
name="${1:-world}"        # default value
echo "${name^^}"          # uppercase
```

## Incident: the filename with a space

> **Incident:** A cleanup script loops `for f in $(ls /data/uploads)` and runs `rm $f`. A customer uploads a file named `report 2024.pdf`. The loop deletes `report` and `2024.pdf` as two separate names, and in another run an empty variable turns `rm $f` into a command with no operand.

Word splitting is the cause. Use globs, quote every expansion and guard with a test:

```bash
for f in /data/uploads/*; do
  [ -e "$f" ] || continue
  if [ "$(find "$f" -mtime +30 | wc -l)" -gt 0 ]; then
    echo "removing: $f"
    rm -- "$f"
  fi
done
```

`rm --` stops option parsing so a file named `-rf` is treated as a name. Run `shellcheck script.sh` as part of your pipeline; it catches unquoted variables like this automatically.

## Common mistakes

- Looping over `$(ls)` or `$(cat file)`
- Unquoted `$var` and `${array[@]}`
- Using associative arrays on systems with Bash 3
- Forgetting `shift` after getopts
- Trusting `echo` with data that starts with a dash; prefer `printf`

```quiz
Q: What does "${hosts[@]}" do when quoted?
- Joins all elements into one word
+ Expands each element as a separate word, preserving spaces inside elements
- Prints the array length
- Sorts the array
> Quoting keeps elements intact even if they contain spaces.

Q: What does a leading colon in a getopts option string do?
- Disables all options
+ Enables silent mode so you handle errors yourself
- Makes options optional
- Reverses the order
> It stops Bash printing its own messages for missing values.

Q: What is the difference between an unquoted and a quoted here-document delimiter?
+ The unquoted form expands variables; the quoted form is literal
- The quoted form runs faster
- They are identical
- The unquoted form cannot contain text
> Quote the delimiter when the content contains dollar signs you do not want expanded.

Q: Why is for f in $(ls) a bad pattern?
- ls is deprecated
+ Output is split on whitespace, so names with spaces break
- It is slower
- It needs root
> Use a glob such as dir/* instead.
```

```cards
What does shift do after getopts? :: Removes the parsed options so $@ holds only the positional arguments
How to declare an associative array? :: declare -A name=([key]=value)
What is process substitution? :: <(cmd) makes a command's output usable as a file argument
Which tool lints shell scripts? :: shellcheck
```
