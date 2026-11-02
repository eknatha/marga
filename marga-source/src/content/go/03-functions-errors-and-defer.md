---
title: Functions, errors and defer
minutes: 13
summary: Handle errors the Go way: return them, wrap them with context, inspect them, and use defer for cleanup.
---

Go has no exceptions for ordinary failures. A function that can fail returns an error as its last value, and the caller decides what to do. This feels repetitive for a day and then becomes a strength: every failure path is visible in the code, which is exactly what you want in software that runs production. This lesson covers the habits that make that style readable: wrapping, inspecting, and cleaning up with defer.

## What you will learn

- Functions with multiple return values
- Return, wrap and inspect errors with %w, errors.Is and errors.As
- Use defer for cleanup and understand its order
- When panic and recover are appropriate

## Errors are values

```go
func readConfig(path string) (Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("read config %s: %w", path, err)
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, fmt.Errorf("parse config %s: %w", path, err)
	}
	return cfg, nil
}
```

Check `err != nil` right after the call and return early. Add context with `fmt.Errorf` so the final message tells a story: `read config /etc/app.json: open /etc/app.json: permission denied`. The verb `%w` wraps the original error so it can still be inspected. Never ignore an error with `_` unless you can explain why it cannot matter.

## Inspect errors

```go
_, err := os.Open("/etc/app.json")
if errors.Is(err, os.ErrNotExist) {
	// use defaults
} else if err != nil {
	return err
}

var pe *fs.PathError
if errors.As(err, &pe) {
	fmt.Println("failed path:", pe.Path)
}
```

`errors.Is` compares an error (and everything it wraps) with a known value. `errors.As` finds an error of a specific type in the chain. You can define your own sentinel error with `var ErrNoQuota = errors.New("no quota")` or your own type with an `Error() string` method. Do not compare error strings; they change.

## Defer

`defer` schedules a call to run when the surrounding function returns, whatever the path.

```go
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
```

Deferred calls run in last-in, first-out order. Arguments are evaluated when the defer statement runs, not when the call happens. Avoid defer inside a long loop, because the calls pile up until the function ends; move the body into a function instead. Deferred calls are how you release locks, close files, and stop timers without leaking them.

## Panic and recover

`panic` stops normal flow and unwinds the stack. It is for programmer errors that should never happen (an impossible state, an index out of range) and not for "file not found". A web server framework usually calls `recover` in middleware so that one bad request does not kill the process, and logs the stack trace. In your own code, prefer returning errors. At the top of `main`, print a clear message to standard error and exit with a non-zero code so scripts and orchestrators see the failure:

```go
if err := run(); err != nil {
	fmt.Fprintln(os.Stderr, "error:", err)
	os.Exit(1)
}
```

```predict
Q: A function returns `fmt.Errorf("open: %v", err)` instead of using %w. What do you lose?
???
The wrapped error. Callers can no longer use errors.Is or errors.As to detect the original cause.
> Use %w when the cause matters to callers.
```

## Incident: The error that said only "failed"

> **Incident:** A nightly job logged one word and no one could tell what failed.

```console
2026-01-05T02:00:07Z ERROR job failed
$ grep -n "return err" jobs/sync.go | head -3
41:		return err
58:		return err
77:		return errors.New("failed")
```

The code returned bare errors or a constant message, so the log had no hint about which step or file failed. The team adopted a rule: wrap every returned error with what the function was doing and the key identifier, and log once at the top. The same failure now reads "sync users: fetch page 14: context deadline exceeded", which points directly at the slow call.

## Common mistakes

- Ignoring errors with _
- Returning errors without context
- Comparing error text
- Deferring in a loop and holding files open

```quiz
Q: What does the %w verb in fmt.Errorf do?
+ Wraps an error so errors.Is and errors.As can find the cause
- Formats a warning :: It is not about severity.
- Prints a width :: It is not a width.
- Stops the program :: It does not exit.
> Add context without losing the cause.

Q: In what order do deferred calls run?
+ Last in, first out when the function returns
- First in, first out :: They run in reverse.
- In random order :: The order is defined.
- Only on success :: They run on any return.
> Defer is for cleanup; the lesson section explains why.

Q: How should a program signal failure to the shell?
+ Print to stderr and exit with a non-zero status
- Return silently :: Scripts cannot tell.
- Call panic always :: Too noisy.
- Print to stdout only :: Exit status matters.
> Respect conventions; the lesson section explains why.

Q: When is panic appropriate?
+ For bugs and impossible states, not for expected failures
- Whenever a file is missing :: Return an error instead.
- To report validation errors :: Return an error.
- Never in any program :: Rarely, but it has a place.
> Errors are values; panics are for bugs.
```

```cards
Return errors :: (T, error)
Add context :: fmt.Errorf("doing X: %w", err)
Check cause :: errors.Is / errors.As
Cleanup :: defer x.Close()
Exit code :: os.Exit(1) after printing to stderr
Panic :: for bugs only
```
