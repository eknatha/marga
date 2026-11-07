---
title: Log analysis one-liners and pipelines
minutes: 12
summary: Answer real operational questions from log files with grep, awk, sort, uniq and jq, and build small reusable pipelines.
---

Dashboards answer questions someone planned for. Logs answer the questions nobody planned. Knowing a few shell patterns lets you explore any log quickly, even on a server with no extra tools.

## What you will learn

- Filtering and extracting fields
- Counting and ranking with sort and uniq
- Time-based and percentile analysis
- JSON logs with jq and streaming tails

## Count and rank

```bash
# top client IPs in an nginx access log
awk '{print $1}' access.log | sort | uniq -c | sort -nr | head

# status code distribution
awk '{print $9}' access.log | sort | uniq -c | sort -nr

# top failing URLs
awk '$9 >= 500 {print $7}' access.log | sort | uniq -c | sort -nr | head
```

The pattern is **extract, sort, count, rank**. `uniq -c` only counts adjacent duplicates, so always sort first.

## Time windows and latency

```bash
# requests per minute
awk '{print substr($4, 2, 17)}' access.log | sort | uniq -c | tail

# 95th percentile of request time (last field)
awk '{print $NF}' access.log | sort -n | awk '{a[NR]=$1} END {print a[int(NR*0.95)]}'

# errors in the last 10 minutes of a systemd service
journalctl -u api --since "10 min ago" -p err --no-pager | tail -20
```

## JSON logs

```bash
jq -r 'select(.level=="error") | [.ts, .request_id, .msg] | @tsv' app.log | head
jq -r '.path' app.log | sort | uniq -c | sort -nr | head
jq -s 'map(select(.duration_ms)) | map(.duration_ms) | sort | .[length*95/100|floor]' app.log
```

`select` filters, `@tsv` makes tabular text and `-s` reads the whole file as an array for aggregate math.

## Streaming

```bash
tail -F /var/log/app/app.log | jq -r --unbuffered 'select(.level=="error") | .msg'
zgrep -h "request_id=abc123" /var/log/app/app.log*.gz
```

Use `-F` so the tail survives log rotation. Save useful pipelines as small scripts with arguments, and test them on a sample before running on huge files.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Log analysis one-liners and pipelines fits together
node: n1 | Count and rank | 0 | 0 | The pattern is extract, sort, count, rank. | Using uniq without sort. | process
node: n2 | Time windows and latency | 1 | 1 | . | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n3 | JSON logs | 2 | 0 | select filters, @tsv makes tabular text and -s reads the whole file as an array for aggregate math. | Parsing JSON logs with grep instead of jq. | observe
node: n4 | Streaming | 3 | 1 | Use -F so the tail survives log rotation. | Running heavy pipelines on production hosts unthrottled. | queue
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Top failing endpoint in a minute

> **Incident:** A four-command pipeline located the failing endpoint during an outage.

```console
$ awk '$9>=500{print $7}' access.log | sort | uniq -c | sort -nr | head -3
4120 /api/checkout
188 /api/cart
12 /healthz
```

The error rate had risen, and the dashboard was slow. The pipeline showed that almost all errors came from one endpoint, which pointed the team at a recent deploy of the checkout service. They rolled back and finished the review afterwards.

## Common mistakes

- Using uniq without sort
- Running heavy pipelines on production hosts unthrottled
- Parsing JSON logs with grep instead of jq
- Forgetting log rotation when tailing

```quiz
Q: Why sort before uniq -c?
+ uniq counts only adjacent duplicates
- sort is faster :: No.
- uniq needs it for JSON :: No.
- It hides errors :: No.
> Group identical lines first.

Q: Which tool parses JSON logs well?
+ jq
- cut :: No.
- tr :: No.
- wc :: No.
> It understands JSON structure.

Q: Why use tail -F?
+ It follows files across rotation
- It deletes logs :: No.
- It sorts lines :: No.
- It is faster :: No.
> -F retries by name. The lesson section above explains why.

Q: What is a good pipeline pattern?
+ Extract, sort, count, rank
- Delete, copy, paste :: No.
- Guess :: No.
- Restart :: No.
> A repeatable approach.
```

```cards
uniq -c :: Counts adjacent duplicate lines
awk :: Pattern and field processing language
jq :: Command-line JSON processor
tail -F :: Follow a file and survive rotation
```
