---
title: Context, timeouts and graceful shutdown
minutes: 13
summary: Pass context through your code so work can time out, be cancelled, and stop cleanly when the process is told to shut down.
---

The most common reliability bug in network code is a call that waits forever. A dependency slows down, every request piles up behind it, and the whole service stalls. Go's answer is the context package: a value passed down the call chain that carries a deadline, a cancellation signal and a few request-scoped values. Using it consistently is what separates a toy program from a service you can operate.

## What you will learn

- Create contexts with timeouts and deadlines
- Pass ctx as the first argument and respect it
- Set client and server timeouts in net/http
- Shut down gracefully on SIGTERM

## Contexts

A context is created from a parent and can be cancelled. Cancelling the parent cancels all children.

```go
ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
defer cancel()

req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
if err != nil {
	return err
}
resp, err := http.DefaultClient.Do(req)
if err != nil {
	return fmt.Errorf("get %s: %w", url, err)  // may be context deadline exceeded
}
defer resp.Body.Close()
```

Always call `cancel`, usually with `defer`, to release resources. The convention is that `ctx context.Context` is the first parameter of any function that does I/O or may block, and it is passed along, not stored in structs.

## Respect cancellation in your own code

Loops and waits must check the context, or cancellation does nothing:

```go
func poll(ctx context.Context, every time.Duration, f func() error) error {
	t := time.NewTicker(every)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()   // context.Canceled or DeadlineExceeded
		case <-t.C:
			if err := f(); err != nil {
				return err
			}
		}
	}
}
```

`select` waits on several channels and takes the first that is ready. A goroutine that never looks at `ctx.Done()` is the usual cause of leaks.

## Timeouts in net/http

The default `http.Client` has **no timeout**, and a default server has none for slow clients. Set them explicitly:

```go
client := &http.Client{Timeout: 10 * time.Second}

srv := &http.Server{
	Addr:              ":8080",
	Handler:           mux,
	ReadHeaderTimeout: 5 * time.Second,
	ReadTimeout:       15 * time.Second,
	WriteTimeout:      30 * time.Second,
	IdleTimeout:       60 * time.Second,
}
```

Choose timeouts from what your callers can tolerate, and keep inner timeouts shorter than outer ones so the outer caller still has time to retry or fail cleanly.

## Graceful shutdown

When Kubernetes or systemd stops your service, it sends SIGTERM. A graceful service stops accepting new requests, finishes the ones in flight, then exits.

```go
ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
defer stop()

go func() { _ = srv.ListenAndServe() }()

<-ctx.Done()
shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
defer cancel()
if err := srv.Shutdown(shutdownCtx); err != nil {
	log.Printf("forced shutdown: %v", err)
}
```

Make the shutdown timeout shorter than the orchestrator's grace period (30 seconds by default in Kubernetes), or the process will be killed in the middle of the work.

```predict
Q: Your service calls a slow dependency without a timeout. What happens under load, and what is the fix?
???
Requests pile up waiting, goroutines and connections accumulate, and the service stalls. Use a context with a timeout (and client timeouts) on every outbound call.
> A missing timeout turns one slow dependency into an outage.
```

## Incident: The service that never finished a deploy

> **Incident:** Each rollout took ten minutes and ended with dropped requests.

```console
$ kubectl rollout status deploy/payments
Waiting for deployment "payments" rollout to finish: 1 old replicas are pending termination...
$ kubectl logs payments-7c9 --previous | tail -2
2026-01-05T11:02:41Z listening on :8080
```

The program ignored SIGTERM, so Kubernetes waited the full 30-second grace period and then killed it, dropping open requests. The team added signal.NotifyContext and srv.Shutdown with a 20-second limit, plus a readiness check that turns false at shutdown start. Rollouts now finish in a minute with no errors.

## Common mistakes

- Using http.DefaultClient with no timeout
- Storing contexts in structs
- Never calling cancel
- Shutdown timeouts longer than the grace period

```quiz
Q: What does context.WithTimeout return?
+ A derived context and a cancel function
- A channel only :: It returns a context.
- A goroutine :: It does not start one.
- An error :: Errors come from operations.
> Always call cancel; the lesson section explains why.

Q: Where does ctx go in a function signature?
+ As the first parameter
- As the last parameter :: Convention says first.
- In a global variable :: Avoid globals.
- In a struct field :: Pass it explicitly.
> Convention helps readers.

Q: What is the default timeout of http.Client?
+ None, requests can wait forever
- 30 seconds :: There is no default.
- 1 second :: There is no default.
- 5 minutes :: There is no default.
> Set one; the lesson section explains why.

Q: What should a service do on SIGTERM?
+ Stop accepting new work, finish in-flight work, then exit
- Exit immediately :: Drops requests.
- Ignore it :: It will be killed.
- Restart itself :: Not the goal.
> Graceful shutdown; the lesson section explains why.
```

```cards
Timeout :: context.WithTimeout(ctx, d)
Always :: defer cancel()
Check :: <-ctx.Done() and ctx.Err()
HTTP client :: set Timeout
Server :: ReadHeaderTimeout etc.
Shutdown :: signal.NotifyContext + srv.Shutdown
```
