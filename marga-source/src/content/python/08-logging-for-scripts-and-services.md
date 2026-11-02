---
title: Logging for scripts and services
minutes: 12
summary: Replace print with the logging module: levels, formats, handlers, structured fields and logs that help during an incident.
---

A nightly script prints "done" and nothing else, so when it breaks nobody knows which step failed or how long it took. Using `print` for everything also mixes results with diagnostics, so you cannot send one to a file and the other to the screen. Python ships a logging module that solves this in a few lines.

## What you will learn

- Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Configure format, destination and level once at start-up
- Log exceptions with tracebacks and useful context
- Structured (JSON) logs that tools can search

## Basic setup

Configure logging once, in the main program, not in libraries. Every module then asks for a logger by name.

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger(__name__)

log.info("starting export for %s", "2026-01-05")
log.warning("retrying page %d", 7)
log.error("export failed")
```

Use `%s` placeholders and pass values as arguments instead of building the string with an f-string. The text is only built if the message is actually emitted, which saves time on DEBUG lines in a tight loop.

## Choose levels on purpose

| Level | Use it for |
|-------|------------|
| DEBUG | Details you need only when diagnosing a problem |
| INFO | Normal milestones: started, finished, counts |
| WARNING | Something unexpected, but the work continues |
| ERROR | An operation failed |
| CRITICAL | The program cannot continue |

Production usually runs at INFO. Make the level a setting (for example the `LOG_LEVEL` environment variable) so that you can raise it to DEBUG for one run without changing code. Avoid logging at ERROR for things that are normal, because people stop trusting the signal.

## Log failures with context

`log.exception` records an error message together with the full traceback, and is meant to be used inside an `except` block.

```python
try:
    push_report(day)
except requests.Timeout:
    log.exception("report push timed out day=%s", day)
    raise
```

Include the identifiers someone needs to find the case: the file name, the customer id, the request id, the attempt number. Never log secrets, tokens or full card numbers. A good error line answers three questions: what failed, for which item, and what happens next.

## Files, rotation and JSON

Scripts that run under systemd or in a container should write to standard output and let the platform collect it. For a plain server, use a rotating file handler so the log cannot fill the disk.

```python
from logging.handlers import RotatingFileHandler
handler = RotatingFileHandler("/var/log/report.log", maxBytes=5_000_000, backupCount=5)
logging.getLogger().addHandler(handler)
```

For log search tools, one JSON object per line is easier to query than free text. A small custom formatter or a library can produce lines such as `{"ts": "...", "level": "ERROR", "msg": "push failed", "day": "2026-01-05"}`. Keep the field names the same in every program.

```predict
Q: Why is `log.info("user %s", name)` better than `log.info(f"user {name}")` in a hot loop?
???
The first builds the message only when INFO is enabled, and lets handlers see the raw template and arguments.
> Lazy formatting avoids wasted work and keeps the template available for grouping similar messages.
```

## Incident: Done, but did it work?

> **Incident:** A nightly sync ended with the line "done", yet customers were missing from the next morning report.

```console
$ tail -3 /var/log/sync.out
fetching page 41
fetching page 42
done
$ grep -c ERROR /var/log/sync.out
0
```

The script caught every exception and printed nothing, so a timeout on page 38 was lost. After the change it logged a warning for each retry, an error with the page number when a page was skipped, and a final INFO line with counts (`fetched=412 skipped=1`). The scheduler marked the run as failed whenever skipped was above zero, so the next gap was reported within minutes.

## Common mistakes

- Using print for diagnostics and results at the same time
- Catching an exception and logging nothing
- Logging secrets or personal data
- Calling basicConfig inside a library, which fights the application settings

```quiz
Q: Where should logging be configured?
+ Once, in the main program
- In every module :: Duplicate handlers cause repeated lines.
- Inside each function :: It would reconfigure on every call.
- Only in tests :: Production needs it too.
> Libraries ask for a logger and let the application decide the format.

Q: What does log.exception add?
+ The traceback of the current exception
- A new log file :: It uses the existing handlers.
- A retry :: It only logs.
- A higher level than CRITICAL :: It logs at ERROR level.
> Use it inside an except block.

Q: Which level fits a retry that will probably succeed?
+ WARNING
- DEBUG :: It is worth seeing in normal runs.
- CRITICAL :: The program continues.
- INFO :: It is unexpected, so warning is more accurate.
> Warnings mark the unexpected but survivable.

Q: Why write JSON lines?
+ Log tools can search and aggregate fields without parsing free text
- They are shorter :: They are usually longer.
- They need no timestamp :: A timestamp is still needed.
- They replace levels :: Levels remain a field.
> A stable structure makes logs queryable.
```

```cards
Get a logger :: logging.getLogger(__name__)
Log with a traceback :: log.exception("message")
Lazy formatting :: log.info("x %s", value)
Rotate a log file :: RotatingFileHandler
Never log :: secrets, tokens, card numbers
```
