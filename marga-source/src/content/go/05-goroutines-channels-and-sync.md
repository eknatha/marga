---
title: Goroutines, channels and sync
minutes: 14
summary: Run work concurrently with goroutines, coordinate with channels and WaitGroups, protect shared state, and find races early.
---

An operations tool often checks many things at once: a hundred hosts, a dozen endpoints, a queue of files. Done one by one, it takes minutes; done concurrently, seconds. Go makes concurrency cheap with goroutines, but concurrency also creates a new class of bugs: leaks, deadlocks and data races. A few patterns and one tool, the race detector, handle most of the risk.

## What you will learn

- Start goroutines and wait for them with sync.WaitGroup
- Pass results with channels and know when to close them
- Protect shared data with sync.Mutex or avoid sharing
- Bound concurrency with a worker pool and detect races with -race

## Goroutines and WaitGroup

A goroutine is a lightweight thread started with the `go` keyword. The program exits when `main` returns, even if goroutines are still running, so you must wait for them.

```go
var wg sync.WaitGroup
for _, h := range hosts {
	wg.Add(1)
	go func(host string) {
		defer wg.Done()
		check(host)
	}(h)
}
wg.Wait()
```

Pass the loop variable as an argument (or rely on Go 1.22 and later, where each iteration has its own variable). In older code, capturing `h` directly meant that every goroutine saw the last host, a classic bug.

## Channels

A channel carries values between goroutines and synchronises them.

```go
results := make(chan Result)
for _, h := range hosts {
	go func() { results <- probe(h) }()
}
for range hosts {
	r := <-results
	fmt.Println(r.Host, r.OK)
}
```

An unbuffered channel blocks the sender until a receiver is ready; a buffered channel (`make(chan T, 10)`) blocks only when full. The **sender** closes a channel to say "no more values", and receivers can `range` over it until it closes. Sending on a closed channel panics, and a goroutine that blocks forever on a channel nobody reads is a **leak**, which shows up as slowly growing memory.

## Shared state

If goroutines must share a variable, protect it:

```go
type Counter struct {
	mu sync.Mutex
	n  map[string]int
}

func (c *Counter) Inc(k string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.n[k]++
}
```

A plain map written by two goroutines is a **data race** and can crash with "concurrent map writes". Use a mutex, `sync/atomic` for simple counters, or better, give one goroutine ownership of the data and send it messages. The saying goes: share memory by communicating, not communicate by sharing memory.

## Limit concurrency and test for races

Starting 50,000 goroutines that each open a connection will exhaust file descriptors or overload the target. Use a bounded worker pool:

```go
jobs := make(chan string)
var wg sync.WaitGroup
for i := 0; i < 8; i++ {
	wg.Add(1)
	go func() {
		defer wg.Done()
		for h := range jobs {
			check(h)
		}
	}()
}
for _, h := range hosts {
	jobs <- h
}
close(jobs)
wg.Wait()
```

Run tests with `go test -race ./...` and, in CI, build a test binary with the race detector. It reports unsynchronised access with stack traces of both goroutines. It slows the program, so use it in tests and staging, not in production.

```predict
Q: Your tool starts one goroutine per file for 200,000 files and runs out of file descriptors. What is the standard fix?
???
Use a bounded worker pool, a fixed number of goroutines reading jobs from a channel.
> Concurrency needs a limit that matches resources.
```

## Incident: Concurrent map writes in production

> **Incident:** A health aggregator crashed every few days with a fatal error and no panic message to recover from.

```console
fatal error: concurrent map writes

goroutine 412 [running]:
runtime.throw({0x9f1a2c, 0x15})
main.(*Aggregator).record(...)
	/src/agg.go:57
```

Several probe goroutines wrote to the same map without a lock. The race detector found it immediately when the team ran the tests with -race, which they had never done. A mutex around the map fixed the crash, and CI now runs go test -race on every pull request. They also bounded the number of probes in flight.

## Common mistakes

- Forgetting to wait for goroutines
- Closing a channel from the receiving side
- Unbounded goroutines
- Sharing maps without locks

```quiz
Q: What does sync.WaitGroup do?
+ Waits until a set of goroutines has finished
- Locks a map :: That is a mutex.
- Closes channels :: It does not.
- Starts goroutines :: The go keyword does.
> Add, Done, Wait; the lesson section explains why.

Q: Who should close a channel?
+ The sender, when no more values will be sent
- Any receiver :: That can cause panics.
- The garbage collector :: It does not close.
- Nobody ever :: Closing signals completion.
> Close signals no more values.

Q: What is a data race?
+ Two goroutines accessing the same memory at once, with at least one writing, without synchronisation
- A fast channel :: Not it.
- A slow goroutine :: Not it.
- A blocked channel :: That is a deadlock or leak.
> Use -race; the lesson section explains why.

Q: Why use a worker pool?
+ To bound concurrency to what resources and targets can handle
- To make goroutines slower :: Not the aim.
- To avoid channels :: It uses channels.
- To hide errors :: Not the aim.
> Limit parallelism; the lesson section explains why.
```

```cards
Start concurrent work :: go func() { ... }()
Wait :: sync.WaitGroup
Pass values :: channels, close by sender
Shared state :: sync.Mutex or one owner goroutine
Detect races :: go test -race
Limit :: worker pool of N goroutines
```
