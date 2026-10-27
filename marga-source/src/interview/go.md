## What is a goroutine, and how is it different from an operating system thread?
level: junior
A goroutine is a lightweight function running concurrently, scheduled by the Go runtime onto a small number of operating system threads. It starts with a small stack that grows as needed, so a program can run many thousands. The cost is that you must manage lifetimes: a goroutine that blocks forever is a leak, so I always give it a way to stop.

## How does error handling work in Go?
level: junior
Functions return an error as the last value and the caller checks it right away. I wrap errors with context using fmt.Errorf and the percent w verb so the cause is kept, then test with errors.Is and errors.As. Panics are for programmer mistakes, not for normal failures such as a missing file or a timeout.

## What does defer do and when does it run?
level: junior
Defer schedules a call to run when the surrounding function returns, in last in, first out order. I use it for closing files, unlocking mutexes and cancelling contexts right after acquiring them. Arguments are evaluated when defer is declared, and deferring inside a loop keeps resources until the function ends, so I move loop bodies into their own function.

## What is the difference between a slice and an array?
level: junior
An array has a fixed length that is part of its type. A slice is a small view with a pointer, length and capacity over an underlying array. Appending may reallocate when capacity is exceeded, so two slices can share memory or not. I preallocate with make when I know the size and copy when I need independence.

## When do you use a channel and when a mutex?
level: mid
Channels are good for passing ownership of data or signalling between goroutines, such as work queues and cancellation. A mutex is simpler for protecting shared state like a cache or counter. I choose the simplest that is correct, avoid sharing memory where I can, and run the race detector in tests to prove it.

## What is context used for in a Go service?
level: mid
Context carries cancellation, deadlines and request-scoped values across API boundaries and goroutines. I pass it as the first argument, derive child contexts with timeouts, and check ctx.Done in loops and blocking calls. It lets one cancelled request stop all the work it started, and it prevents leaked goroutines and runaway outbound calls.

## How do interfaces work in Go and how do you design them?
level: mid
Interfaces are satisfied implicitly: any type with the methods implements them. I define small interfaces on the consumer side, accept interfaces and return concrete types. This keeps packages decoupled and makes testing easy with fakes. I avoid large interfaces and avoid creating one before there are two implementations or a real test need.

## How would you find and fix a memory or goroutine leak in production?
level: senior
I check metrics for goroutine count and heap growth, then take profiles through the pprof endpoint on an internal port: a goroutine dump shows where they are blocked and a heap profile shows allocations. Typical causes are abandoned senders, missing context cancellation and unbounded caches. I fix the lifetime, add a test and an alert on goroutine count.

## How do you design a Go service so that it shuts down gracefully and survives slow dependencies?
level: senior
I handle SIGTERM, stop accepting new requests, call Server.Shutdown with a deadline so in-flight requests finish, and cancel background work through a root context. All outbound clients have timeouts and deadlines, with retries using backoff and a circuit breaker. Readiness fails during shutdown, so the load balancer stops sending traffic first.
