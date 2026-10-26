---
title: Arrays, associative arrays and parameter expansion
minutes: 13
summary: Use Bash arrays and associative arrays for lists and lookups, and use parameter expansion to trim, replace and default values without calling external programs.
---

Many shell scripts split strings with `cut` and `awk` or loop over words in a variable, and then break when a value contains a space. Bash has real arrays and a rich set of expansions that handle these jobs safely and without starting extra processes. They make scripts shorter, faster and less fragile.

## What you will learn

- Indexed and associative arrays
- Looping over arrays safely
- Parameter expansion: defaults, trimming, replacing, lengths and slices
- Reading command output into arrays

## Indexed arrays

```bash
hosts=(web1 web2 "db 1")
hosts+=(cache1)
echo "${#hosts[@]}"           # count: 4
echo "${hosts[2]}"            # db 1
for h in "${hosts[@]}"; do    # quote and use [@] to keep elements intact
  echo "checking $h"
done
echo "${hosts[@]:1:2}"        # slice: two elements starting at index 1
```

The form `"${hosts[@]}"` expands to one word per element, even for elements with spaces. The unquoted form splits on spaces and breaks the list.

## Reading output into an array

```bash
mapfile -t files < <(find /var/log -name '*.log' -mtime -1)
printf 'found %d files\n' "${#files[@]}"
```

`mapfile` (also `readarray`) reads one line per element and keeps spaces. This is safer than `files=($(find ...))`, which splits on any whitespace.

## Associative arrays

```bash
declare -A owner
owner[web1]=alice
owner[db1]=bob
for k in "${!owner[@]}"; do echo "$k is owned by ${owner[$k]}"; done
[[ -v owner[web2] ]] || echo "web2 has no owner"
```

Use these for lookups such as host to owner or service to port. They need Bash 4 or later, which macOS does not ship by default.

## Parameter expansion

| Form | Result |
|------|--------|
| `${name:-default}` | `default` if `name` is unset or empty |
| `${name:?message}` | Stop with a message if unset or empty |
| `${#name}` | Length of the value |
| `${name%.log}` | Remove the shortest match from the end |
| `${name##*/}` | Remove the longest match from the start (the file name) |
| `${name/old/new}` | Replace the first match |
| `${name//old/new}` | Replace all matches |
| `${name^^}` / `${name,,}` | Upper or lower case |

```bash
path=/var/log/app/error.log
echo "${path##*/}"      # error.log
echo "${path%/*}"       # /var/log/app
echo "${path%.log}.old" # /var/log/app/error.old
: "${DB_HOST:?DB_HOST must be set}"
```

## Where to stop

When a script needs nested data or heavy parsing, use `jq` or move to Python. Arrays are for lists and simple lookups.

```predict
Q: What does this print?
files=("a b" c)
for f in ${files[@]}; do echo "[$f]"; done
???
Three lines: [a], [b] and [c]. The unquoted expansion splits "a b" into two words.
> Always use "${files[@]}" with quotes to keep each element as one word.
```

## Incident: the backup that skipped half the files

> **Incident:** A backup script reports success but misses files whose names contain spaces.

```console
$ files=($(ls /srv/reports)); echo "${#files[@]}"
212
$ ls /srv/reports | wc -l
140
```

The script built its list by word-splitting the output of `ls`, so each name with a space became several entries that did not exist. The fix used `mapfile -t files < <(find ... -print0)` style reading with a quoted loop, and the script compared the count of files copied with the count found.

## Common mistakes

- Parsing `ls` output
- Unquoted `${array[@]}`
- Using associative arrays on shells that lack them
- Forgetting `:?` checks for required variables

```quiz
Q: Which form expands an array to one word per element, keeping spaces inside elements?
- ${arr[*]} unquoted :: This splits on whitespace.
+ "${arr[@]}"
- $arr :: This expands to the first element only.
- ${#arr} :: This is the count.
> The quoted [@] form keeps each element intact.

Q: What does ${path##*/} return for /var/log/app.log?
- /var/log :: That is ${path%/*}.
+ app.log
- /var :: Not a result of this pattern.
- the length :: Length is ${#path}.
> ## removes the longest prefix matching */, leaving the file name.

Q: What does ${DB_HOST:?must be set} do when DB_HOST is empty?
- Uses a default :: That is :-.
+ Stops the script with the message
- Sets DB_HOST to ? :: It does not assign.
- Does nothing :: It enforces the check.
> It is a compact required-variable check.

Q: Why is mapfile safer than files=($(command))?
+ It reads one line per element without splitting on spaces or expanding wildcards
- It is shorter to type :: Safety is the reason.
- It runs commands in parallel :: It does not.
- It sorts the output :: It does not.
> Word splitting and globbing corrupt names; mapfile avoids both.
```

```cards
How do you count array elements? :: ${#arr[@]}
How do you declare an associative array? :: declare -A name
Remove a file extension? :: ${name%.ext}
Remove the directory from a path? :: ${path##*/}
Read lines into an array? :: mapfile -t arr < <(command)
```
