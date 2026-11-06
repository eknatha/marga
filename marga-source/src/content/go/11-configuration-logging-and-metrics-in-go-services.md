---
title: Configuration, logging and metrics in Go services
minutes: 12
summary: Read configuration from flags and environment, log with slog and expose Prometheus metrics so Go services are easy to run and observe.
---

The code that runs your logic is only part of a production service. It must also accept configuration safely, explain itself in logs and expose numbers that tools can graph.

## What you will learn

- Configuration with flags, environment and validation
- Structured logging with log/slog
- Metrics with the Prometheus client
- Health endpoints and redaction

## Configuration

```go
package main

import (
	"flag"
	"fmt"
	"os"
	"time"
)

type Config struct {
	Addr    string
	DSN     string
	Timeout time.Duration
}

func load() (Config, error) {
	c := Config{}
	flag.StringVar(&c.Addr, "addr", envOr("ADDR", ":8080"), "listen address")
	flag.DurationVar(&c.Timeout, "timeout", 5*time.Second, "request timeout")
	flag.Parse()
	c.DSN = os.Getenv("DATABASE_DSN")
	if c.DSN == "" {
		return c, fmt.Errorf("DATABASE_DSN is required")
	}
	return c, nil
}

func envOr(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}
```

Validate at start and fail fast with a clear message. Never log the DSN or any secret.

## Logging with slog

```go
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
logger.Info("request", "request_id", id, "method", r.Method, "path", r.URL.Path, "status", status, "duration_ms", ms)
logger.Error("db query failed", "err", err, "request_id", id)
```

JSON logs with stable keys can be searched and aggregated. Include a request ID in every line for a request and pass it through the context.

## Metrics and health

```go
var reqs = promauto.NewCounterVec(
	prometheus.CounterOpts{Name: "http_requests_total", Help: "Requests"},
	[]string{"method", "code"},
)
var dur = promauto.NewHistogram(prometheus.HistogramOpts{Name: "http_request_duration_seconds", Buckets: prometheus.DefBuckets})

http.Handle("/metrics", promhttp.Handler())
http.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(200) })
```

Keep metric labels low-cardinality: never use user IDs or full URLs. Separate **liveness** from **readiness** checks, and make readiness reflect dependencies such as the database.

## Incident: One request in a haystack

> **Incident:** Free-text logs made tracing a single failing request very slow.

```console
14:07:11 ERROR something went wrong
14:07:11 INFO handled order
14:07:12 ERROR something went wrong
customer reported failure at 14:07, no request id to search for
```

The logs had no stable fields or identifiers, so engineers had to read thousands of lines. The team moved to structured logs with request IDs, returned the ID to clients in a header and made support quote it.

## Common mistakes

- Free-text logs with no identifiers
- High-cardinality metric labels
- Logging secrets or full connection strings
- One health check for liveness and readiness

```quiz
Q: What does log/slog give you?
+ Structured, leveled logging
- A web server :: No.
- Metrics :: No.
- Configuration :: No.
> Standard library structured logs.

Q: What should every request log line include?
+ A request ID
- A password :: No.
- The whole body :: No.
- Nothing :: No.
> Correlates lines. The lesson section above explains why.

Q: What is wrong with a user ID label on metrics?
+ Too many unique series
- It is private :: No.
- It is short :: No.
- It is a number :: No.
> Cardinality explosion.

Q: What should readiness reflect?
+ Whether dependencies are usable
- Process uptime only :: No.
- Disk colour :: No.
- Log level :: No.
> Traffic should wait if not ready.
```

```cards
slog :: Go's structured logging package
Request ID :: Identifier that ties log lines to one request
Cardinality :: Number of distinct label combinations
Readiness :: Whether a service can take traffic
```
