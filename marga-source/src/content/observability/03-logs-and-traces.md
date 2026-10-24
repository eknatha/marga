---
title: Logs and distributed tracing
minutes: 15
summary: Write structured logs that can be queried, follow requests across services with traces, and keep telemetry volume and cost under control.
---

Metrics tell you that something is wrong. Logs and traces tell you what happened and where. Their value depends almost entirely on how they are produced: a clear structure and a shared request ID turn a pile of text into an investigation tool.

## What you will learn

- Structured logging and log levels
- What to log and what never to log
- How traces, spans and context propagation work
- Sampling and retention

## Structured logs

Plain text logs are written for people and are hard for machines to search. **Structured logs** emit one JSON object per event, with fields you can filter on.

```json
{"ts":"2026-10-24T03:12:01Z","level":"error","service":"shop-api","request_id":"c7d1e2","route":"/checkout","user_tier":"premium","duration_ms":6402,"error":"timeout calling inventory","dependency":"inventory"}
```

Now a log system can answer "show errors for `/checkout` where `dependency` is `inventory`" precisely. Good fields to include: timestamp in UTC, level, service name, version, request ID, and relevant business context.

| Level | Use |
|-------|-----|
| `error` | A failure needing attention |
| `warn` | Unexpected but handled |
| `info` | Significant normal events (start-up, a request summary) |
| `debug` | Detail for diagnosis, off by default in production |

Write logs to **standard output** and let the platform collect them. In containers, applications should not manage log files or rotation themselves.

> **Warning:** Never log passwords, tokens, full card numbers, or personal data you do not need. Logs are copied to many systems, kept for long periods and read by many people. Mask or omit sensitive fields at the source.

## Searching logs

Whatever the backend (Loki, Elasticsearch, a cloud log service), the workflow is the same: narrow by time, then service, then a field, then follow an ID.

```console
$ kubectl logs deploy/shop-api -n shop --since=15m | grep '"level":"error"' | head -3
$ kubectl logs deploy/shop-api -n shop --since=15m | jq -c 'select(.request_id=="c7d1e2")'
```

In Loki's LogQL, a similar search over a time window is:

```text
{app="shop-api"} | json | level="error" | route="/checkout"
```

## Distributed tracing

A **trace** is the full journey of a single request. It is made of **spans**, each representing one unit of work (a handler, a database query, an outgoing call) with a start time, duration and attributes. Spans form a tree: the root span is the incoming request and the children are the work it triggered.

```text
GET /checkout                              6.41 s
  auth.verify                              0.02 s
  inventory.reserve   (HTTP call)          6.20 s   <- the problem
    db.query  SELECT ... FROM stock        6.15 s
  payment.charge                           0.15 s
```

This single picture would take an hour to reconstruct from logs. To work, services must pass **trace context** to each other, usually in the standard `traceparent` HTTP header, so spans from different services join into one trace. OpenTelemetry libraries do this for common frameworks automatically.

Connect the signals: include the **trace ID** in every log line, and the log viewer can jump straight to the trace, and the trace to the logs.

## Sampling and cost

Storing every trace and every debug log is expensive and rarely useful.

| Technique | Idea |
|-----------|------|
| **Head sampling** | Decide at the start of a request to keep, say, 5% |
| **Tail sampling** | Decide after the request ends; keep all traces with errors or high latency |
| **Log level discipline** | `debug` off in production; turn on briefly for one service when needed |
| **Retention tiers** | Keep recent logs hot and searchable, older logs in cheap storage, delete after the required period |

Tail sampling is the most useful for diagnosis: you keep exactly the slow and failing requests, which are the ones you will want to look at.

## Incident: a trace is missing half its services

> **Incident:** Traces for checkout show the API and the payment service, but the inventory service never appears, even though logs prove it handled the request.

The trace was broken at a boundary: a hop did not carry the trace context forward.

```console
$ curl -sI -H 'traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01' http://inventory/health
$ kubectl logs deploy/inventory -n shop --tail 2
{"msg":"request","request_id":"c7d1e2","traceparent":null}
```

`traceparent` is `null` on arrival, so inventory started a new trace. The API called it with a hand-written HTTP client that did not copy the headers. Use the instrumented client (or inject the context explicitly), redeploy and view a fresh trace to confirm inventory's spans now appear as children. A good test to keep: after any change to service-to-service calls, check that a test request produces one trace spanning all services.

## Common mistakes

- Unstructured text logs that cannot be queried
- Logging sensitive data
- No request or trace ID in log lines
- Keeping every trace and debug log forever
- A custom HTTP client that drops trace headers

```quiz
Q: Why prefer structured logs?
- They are shorter
+ Fields can be filtered and aggregated reliably
- They need no storage
- They never contain errors
> Structure makes logs queryable by machine.

Q: What is a span?
- A kind of alert
+ One unit of work within a trace, with a start time and duration
- A log file
- A metric label
> Spans form a tree that represents one request's journey.

Q: What does tail sampling let you do?
- Keep a fixed 1% of everything
+ Decide after the request finishes and keep the slow or failing traces
- Disable traces
- Store logs longer
> It keeps the traces you are most likely to need.

Q: Where should containerised applications write logs?
- To files inside the container with their own rotation
+ To standard output, collected by the platform
- To the registry
- To a Secret
> Platform collectors read stdout and stderr.
```

```cards
Structured log? :: A log event emitted as an object with named fields, usually JSON
Trace vs span? :: A trace is a whole request journey; a span is one unit of work inside it
Header that carries trace context? :: traceparent
Never log what? :: Passwords, tokens, card numbers and unneeded personal data
```
