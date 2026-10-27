---
title: Structured logging and log design
minutes: 12
summary: Write logs that are easy to search: structured fields, consistent names, correlation IDs, sensible levels and no secrets.
---

During an incident, you search for a customer ID and get nothing, because one service logs `customer=42`, another `cust_id: 42`, and a third writes a sentence. Logs are only useful if you can find the right lines quickly. Designing them takes an hour at the start and saves days later.

## What you will learn

- Structured logs as JSON with stable field names
- Correlation and trace IDs that tie lines across services
- What to log, what not to log, and which level to use
- Cost control: sampling and retention

## From sentences to fields

A log line is an event with fields. Compare:

```text
2026-01-05 10:02:11 payment failed for customer 42 after 3 tries
```

```json
{"ts":"2026-01-05T10:02:11Z","level":"error","service":"payments","event":"payment_failed","customer_id":42,"attempts":3,"request_id":"r-7f3a"}
```

The second can be filtered, counted and graphed without writing a pattern for each message. Use one name for one meaning across all services (`customer_id`, not three spellings), use consistent units (milliseconds, bytes) and ISO 8601 timestamps in UTC. Keep the human message short and put details in fields.

## Correlation IDs

A user request passes through several services. Generate a **request ID** at the edge (or use the trace ID from tracing), pass it in a header to every service, and add it to every log line. Then one search shows the whole journey of one request.

```console
$ grep r-7f3a gateway.log orders.log payments.log
```

In a log system, filter on the field. Make the ID part of your logging setup (for example a context variable that the logger reads), so developers do not need to pass it by hand.

## What to log

Log decisions and boundaries: request received and finished (with duration and status), calls to other systems and their results, retries, state changes, and unexpected conditions. Use levels as a contract: `error` means someone may need to act, `warn` means unusual but handled, `info` means normal milestones, `debug` is off in production. Never log passwords, tokens, full card numbers or personal data that you do not need. Mask or hash identifiers when you can, and review logs when you add a new field.

## Cost and retention

Logs are often the biggest observability cost. Keep recent logs (for example 14 days) searchable and move older ones to cheap storage with a longer retention for audit. Reduce volume at the source: sample repetitive debug lines, drop health check requests, and set rate limits on noisy loops. Track log volume per service and give owners a budget. A service that writes 5 GB a day of identical lines is a bug, not a feature.

```predict
Q: Two services log the same customer as `cust` and `customer_id`. What goes wrong during an incident?
???
A search on one name misses lines from the other service, so you see only part of the story.
> Consistent field names are what make cross-service search work.
```

## Incident: Searching three spellings at 3 a.m.

> **Incident:** A customer reported double charges, and the on-call engineer needed more than an hour to assemble what happened.

```console
$ grep -c "cust=" payments.log orders.log gateway.log
payments.log:4120
orders.log:0
gateway.log:0
$ grep -c "customer_id" orders.log
8815
```

Each team had invented its own format. The payments service used `cust=`, orders used JSON with `customer_id`, and the gateway logged only paths. After the incident the company defined a short logging standard with required fields (timestamp, service, level, event, request_id), added a library that applies it, and made a check in review that rejects new free-text-only logs for request handling.

## Common mistakes

- Free-text sentences with data buried inside
- Different names for the same field
- Logging secrets or personal data
- Keeping all logs forever at full price

```quiz
Q: What is the main benefit of structured logs?
+ Fields can be filtered, counted and graphed without custom parsing
- They are shorter :: They are often longer.
- They need no timestamp :: A timestamp is required.
- They remove the need for levels :: Levels stay.
> Structure makes logs queryable.

Q: What is a correlation ID?
+ An identifier passed through services so one request can be followed everywhere
- A user password :: It must not be secret data.
- A server name :: It identifies a request.
- A log file name :: It is a field in each line.
> One search shows the whole path.

Q: Which level fits a handled but unusual condition?
+ warn
- error :: Error means someone may need to act.
- debug :: It is too important to hide.
- fatal :: The program continues.
> Use levels as a contract.

Q: How do you reduce log cost without losing needed data?
+ Sample noisy lines, drop health checks and tier old logs to cheap storage
- Disable all logs :: You lose visibility.
- Log only at night :: Problems happen any time.
- Keep everything forever :: That is the cost problem.
> Control volume at the source.
```

```cards
Log format :: JSON lines with stable field names
Follow one request :: request_id or trace ID in every line
Never log :: passwords, tokens, card numbers
Level contract :: error means act, warn means handled
Reduce cost :: sample, drop noise, tier retention
```
