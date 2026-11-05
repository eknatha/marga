---
title: SRE automation: parsing logs and building incident timelines
minutes: 12
summary: Parse structured and plain logs with Python, count and group errors, and merge events from several sources into one sorted timeline for an incident review.
---

During an incident the evidence is spread across application logs, load balancer logs, deploy history and alerts. Python can collect it into one timeline in minutes, and the same script can be reused for the next post-mortem.

## What you will learn

- Parse JSON lines and plain text lines safely
- Count and group by status, endpoint or time bucket
- Normalize time zones and merge several sources
- Stream large files without loading them into memory

## Read and parse safely

```python
import json, re
from datetime import datetime, timezone

LINE = re.compile(r'^(?P<ts>\S+) (?P<level>[A-Z]+) (?P<msg>.*)$')

def parse(line):
    line = line.strip()
    if not line:
        return None
    if line.startswith("{"):
        try:
            d = json.loads(line)
            return {"ts": d.get("ts"), "level": d.get("level", ""), "msg": d.get("msg", "")}
        except json.JSONDecodeError:
            return None
    m = LINE.match(line)
    return m.groupdict() if m else None
```

Logs are messy: partial lines, mixed formats, binary noise. Return `None` for lines you cannot parse and count them, instead of crashing. If many lines fail, the format has changed, which is itself a finding.

## Count and group

```python
from collections import Counter

def top_errors(path, n=5):
    c = Counter()
    with open(path, errors="replace") as fh:
        for line in fh:
            e = parse(line)
            if e and e["level"] == "ERROR":
                c[re.sub(r"\d+", "N", e["msg"])[:80]] += 1
    return c.most_common(n)
```

Replace numbers and ids with a placeholder so that similar messages group together. Iterating the file line by line streams it, so memory stays small even for gigabytes. For time buckets, truncate timestamps to the minute and count per bucket to see when the rate changed.

## One timeline

```python
def to_utc(text):
    dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    return dt.astimezone(timezone.utc)

def merge(sources):
    events = []
    for name, rows in sources.items():
        for ts, text in rows:
            events.append((to_utc(ts), name, text))
    return sorted(events)
```

Convert every timestamp to UTC before sorting; mixed time zones are the most common reason timelines look wrong. Combine app errors, load balancer 5xx counts, deploy markers and alert times, and mark the moments of detection, mitigation and recovery. The output (a sorted list or a CSV) is the factual base of the post-mortem.

```predict
Q: Two log sources look 5.5 hours apart for the same event. What is the likely cause?
???
One source uses local time (for example India) and the other UTC. Normalize both to UTC before merging.
> Always compare in one time zone.
```

## Incident: The timeline that blamed the wrong release

> **Incident:** A post-mortem draft said errors started 10 minutes before the deploy, so the team nearly ruled out the release.

```console
$ head -1 app.log lb.log
==> app.log <==
2026-03-04T14:02:11+00:00 ERROR upstream timeout
==> lb.log <==
2026-03-04 19:32:40 status=502
```

The load balancer wrote local time (UTC plus 5:30) without an offset. After converting both to UTC, the first 502 came 30 seconds after the deploy finished, not before. The team added a timeline script that requires explicit offsets and marks the source of each event, and the review then focused on the release's connection pool change.

## Common mistakes

- Sorting events with mixed time zones
- Loading a huge file into memory
- Crashing on one malformed line
- Hand-copying times into a document instead of generating them

```quiz
Q: How should you handle a log line that cannot be parsed?
+ Skip it, count it and continue
- Crash the script :: One bad line should not stop the analysis.
- Delete the file :: Destroys evidence.
- Guess the content :: Produces false data.
> Count the failures, they may signal a format change.

Q: Why replace numbers with a placeholder before counting messages?
+ So similar messages group into one pattern
- To shorten the file :: Not the reason.
- To hide errors :: It does not hide them.
- To sort faster :: Not the reason.
> Group by shape, not by exact text.

Q: What must you do before merging events from several sources?
+ Convert all timestamps to a single time zone such as UTC
- Sort alphabetically :: Wrong order for times.
- Remove the first column :: Loses data.
- Use local time everywhere :: Local zones differ per source.
> Consistent time is essential.

Q: How do you process a 10 GB log with little memory?
+ Iterate line by line instead of reading it all
- Read it with read() :: Loads everything.
- Copy it twice :: Uses more disk.
- Open it in an editor :: Not scriptable.
> Streaming keeps memory flat.
```

```cards
Parse failures :: count them, skip them, do not crash
Normalize messages :: replace ids and numbers to group patterns
UTC first :: convert timestamps before merging
Stream files :: for line in file, not read all
Timeline output :: sorted events with source and meaning
```
