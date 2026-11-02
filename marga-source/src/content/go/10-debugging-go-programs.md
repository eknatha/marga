---
title: Debugging Go programs: panics, leaks, races and profiles
minutes: 14
summary: Read a Go stack trace, find goroutine leaks and races, and use pprof to see where time and memory go.
---

A Go service in production fails in a few characteristic ways: a panic with a stack trace, memory that grows until the process is killed, CPU that spikes, or requests that hang. Go ships with excellent diagnostic tools, and most of them work on a running process. Knowing the handful of commands turns a vague report into a specific line of code.

## What you will learn

- Read a panic and a goroutine dump
- Find goroutine leaks and deadlocks
- Profile CPU and memory with pprof
- Use the race detector and delve for deeper investigation

## Read the trace

```text
panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation code=0x1 addr=0x0 pc=0x4a1f3c]

goroutine 33 [running]:
main.(*Client).Fetch(0x0, {0xc000014080, 0x9})
	/src/client.go:48 +0x1c
main.handle(...)
	/src/server.go:91
```

Read from the top: the first line says what happened, the first frame in your own code shows where (`client.go:48`), and the receiver value `0x0` shows the method was called on a nil pointer. Frames below show who called it. Most panics are nil pointers, out-of-range indexes, closed channels and nil map writes, each visible in that first line.

## Leaks and hangs

If requests hang or memory grows, look at goroutines. Send `SIGQUIT` (Ctrl+backslash) to dump all stacks, or expose pprof:

```go
import _ "net/http/pprof"

go func() { log.Println(http.ListenAndServe("127.0.0.1:6060", nil)) }()
```

```bash
curl -s "http://127.0.0.1:6060/debug/pprof/goroutine?debug=1" | head -30
```

Thousands of goroutines at the same line, for example `chan send` or `select`, is a leak: something is waiting for a receiver or a cancellation that never comes. `all goroutines are asleep - deadlock!` means every goroutine is blocked, usually on a channel or a lock. Bind the pprof port to localhost and reach it through a port-forward, never expose it publicly.

## Profiling

```bash
go tool pprof -http=:0 "http://127.0.0.1:6060/debug/pprof/profile?seconds=30"   # CPU
go tool pprof -http=:0 "http://127.0.0.1:6060/debug/pprof/heap"                # memory in use
```

The flame graph and `top` view show which functions use the most CPU or hold the most memory. For memory, compare two heap profiles taken some minutes apart (`-base`) to see what grows. Also check `GODEBUG=gctrace=1` for garbage-collection pressure, and the `runtime/metrics` or Prometheus Go collector for goroutine count, heap size and GC pauses on dashboards. Profile before guessing: the slow part is rarely where you expect.

## Races and the debugger

The race detector (`go test -race`, or `go build -race` for a staging binary) reports two goroutines touching the same variable. Treat each report as a real bug. For logic errors, **delve** (`dlv debug`, `dlv test`, `dlv attach PID`) lets you set breakpoints and inspect variables, including goroutines. Add structured logging with request IDs, and in incidents capture a goroutine dump and a heap profile before restarting, because a restart destroys the evidence.

```predict
Q: A service restarts every night because memory grows. What two profiles do you capture, and what do you compare?
???
Two heap profiles some time apart, and a goroutine dump. Compare them to see which allocations or goroutines grow.
> Capture before restarting; compare to find growth.
```

## Incident: Forty thousand goroutines

> **Incident:** Memory in a webhook forwarder climbed 100 MB per hour until the pod was killed.

```console
$ curl -s "http://127.0.0.1:6060/debug/pprof/goroutine?debug=1" | head -4
goroutine profile: total 40871
40112 @ 0x43a2e6 0x4062b9 0x4057d5
#	0x4057d4	main.forward+0x94	/src/forward.go:63
```

Each webhook started a goroutine that sent to an unbuffered results channel, but the receiver returned early on timeout, leaving the sender blocked forever. The fix used a buffered channel of size one and checked ctx.Done() in the sender. A goroutine-count alert was added to the dashboard so a repeat would be seen within an hour.

## Common mistakes

- Restarting before capturing a dump
- Exposing pprof publicly
- Guessing at performance without a profile
- Ignoring race detector reports

```quiz
Q: What does the first frame in your own code in a panic trace show?
+ Where the failing code is
- The machine IP :: Not shown.
- The database name :: Not shown.
- The Go version :: Not the purpose.
> Start at the top; the lesson section explains why.

Q: A goroutine count that keeps rising points to what?
+ A goroutine leak, often blocked on a channel or missing cancellation
- A too small disk :: Not related.
- A DNS error :: Not related.
- A formatting issue :: Not related.
> Look at the goroutine profile.

Q: How do you find what is using CPU?
+ Take a CPU profile with pprof and view the flame graph
- Read the logs only :: Logs rarely show CPU.
- Restart the service :: That removes evidence.
- Increase the timeout :: Not a diagnosis.
> Profile first; the lesson section explains why.

Q: How should the pprof port be exposed?
+ Bind to localhost and reach it by port-forward
- Publicly on the internet :: Dangerous.
- In the readiness probe :: Not related.
- In a Docker label :: Not related.
> It can leak internals; the lesson section explains why.
```

```cards
Read panics :: top error line, first frame in your code
Dump goroutines :: SIGQUIT or /debug/pprof/goroutine
CPU profile :: go tool pprof .../profile?seconds=30
Heap profile :: go tool pprof .../heap
Races :: go test -race
Debugger :: dlv debug / dlv attach
```
