---
title: Text processing with grep, sed and awk
minutes: 15
summary: Slice logs and command output with pipes, grep, cut, sort, uniq, sed and awk to answer questions in one line.
---

A 2 GB access log contains the answer to "which clients hit us hardest at 14:03?" You do not need a dashboard or a script file. A pipeline of small tools can answer it in seconds. This is one of the highest-value skills for operations work, because most data on a server is text.

## What you will learn

- How pipes connect small tools
- `grep`, `cut`, `sort`, `uniq` for counting and filtering
- `sed` for substitutions and `awk` for columns and sums
- How to build a pipeline step by step

## The pipeline idea

Each Unix tool does one job and reads stdin and writes stdout. The pipe `|` sends one program's output to the next program's input.

```console
$ cat access.log | head -2
203.0.113.7 - - [24/Oct/2026:14:03:11 +0000] "GET /cart HTTP/1.1" 502 157 "-" "Mozilla/5.0"
198.51.100.4 - - [24/Oct/2026:14:03:12 +0000] "GET /health HTTP/1.1" 200 2 "-" "kube-probe/1.29"
```

This is sample data in the common web server log format. Fields are separated by spaces, so field 1 is the client address, `$7` is the path and `$9` is the status code.

## Filter and count

```console
$ grep -c ' 502 ' access.log
41
$ grep -v 'kube-probe' access.log | wc -l
18420
$ awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -3
   9402 203.0.113.7
   5120 198.51.100.22
    977 192.0.2.88
```

The last line is a classic: extract the client address, `sort` so identical values are adjacent, `uniq -c` counts runs, and `sort -rn` puts the largest first. `uniq` only collapses *adjacent* duplicates, which is why the first `sort` matters.

| Tool | Use it for | Example |
|------|-----------|---------|
| `grep` | Keep or drop lines | `grep -E 'ERROR|WARN' app.log` |
| `cut` | Take fixed delimiters | `cut -d: -f1 /etc/passwd` |
| `sort`, `uniq` | Order and count | `sort -u`, `uniq -c` |
| `sed` | Edit text in a stream | `sed 's/old/new/g'` |
| `awk` | Columns, conditions, math | `awk '$9==502 {n++} END {print n}'` |
| `tr`, `wc`, `head`, `tail` | Small helpers | `wc -l`, `tail -n 100` |

## sed: substitute and delete

```bash
sed 's/DEBUG/INFO/g' app.log               # replace in the output only
sed -i.bak 's/^port=.*/port=8081/' app.conf # edit in place, keeping app.conf.bak
sed -n '10,20p' app.log                    # print lines 10 to 20
sed '/^#/d;/^$/d' app.conf                 # drop comments and blank lines
```

`-i.bak` edits the file in place and keeps a backup, which makes risky edits reversible. Without `-i`, `sed` prints the result and leaves the file alone, so test that way first.

## awk: columns, conditions and sums

```console
$ awk '$9 >= 500 {print $9}' access.log | sort | uniq -c
     41 502
      3 503
$ awk '{bytes += $10} END {printf "%.1f MB\n", bytes/1024/1024}' access.log
38.4 MB
$ awk -F: '$3 >= 1000 {print $1}' /etc/passwd
deploy
```

`awk` runs a rule for each line: `pattern {action}`. `END` runs after the last line, which is how you print totals. `-F:` changes the field separator to a colon.

## Build pipelines step by step

Never write a long pipeline in one go. Run the first stage, look at the output, then add the next stage.

```bash
grep ' 502 ' access.log                          # 1. are these the lines I want?
grep ' 502 ' access.log | awk '{print $4}'       # 2. is field 4 the timestamp?
grep ' 502 ' access.log | awk '{print $4}' | cut -c2-18 | sort | uniq -c   # 3. per minute
```

## Incident: which endpoint is failing?

> **Incident:** The 502 count jumped. You need to know whether one path or the whole site is failing.

```console
$ awk '$9 == 502 {print $7}' access.log | sort | uniq -c | sort -rn | head -3
     38 /cart
      3 /checkout
```

Almost all failures hit `/cart`, so the problem is likely in the service behind that path rather than in nginx or the network. Next, check whether the failures cluster in time:

```console
$ awk '$9 == 502 {print substr($4, 2, 17)}' access.log | uniq -c
     41 24/Oct/2026:14:03
```

All 41 happened in one minute, which points to a short event such as a restart, not a steady fault. In two commands you narrowed "502s" to "the cart service, one minute, 14:03", which tells you where to read the next log.

## Common mistakes

- Using `uniq -c` without sorting first
- Editing a file with `sed -i` without a backup
- Parsing structured data such as JSON with `grep`; use `jq` for that
- Forgetting that field numbers depend on the log format

```quiz
Q: Why must you sort before uniq -c?
- Sorting speeds up uniq
+ uniq only collapses adjacent duplicate lines
- uniq cannot read stdin
- sort removes blank lines
> uniq counts runs of identical neighbouring lines. Sorting puts duplicates next to each other.

Q: Which command prints the count of lines containing " 502 "?
- grep ' 502 ' access.log | head
+ grep -c ' 502 ' access.log
- sed -n '502p' access.log
- cut -d' ' -f502 access.log
> grep -c counts matching lines.

Q: What does sed -i.bak 's/a/b/' file do?
- Prints the result without changing the file
+ Edits the file in place and saves the original as file.bak
- Deletes file.bak
- Replaces only the first line
> -i edits in place, and the suffix creates a backup before changes are written.

Q: In awk '{bytes += $10} END {print bytes}', when does the END block run?
- Before the first line
- On every line
+ After the last line has been processed
- Only if bytes is zero
> END runs once after all input is read, which makes it the place to print totals.
```

```cards
Count and rank repeated values? :: sort | uniq -c | sort -rn
awk field separator flag? :: -F, for example -F:
Edit a file with a backup? :: sed -i.bak 's/old/new/' file
How to build a long pipeline safely? :: Add one stage at a time and check the output of each
```
