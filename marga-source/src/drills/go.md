## Assignment to nil map
level: junior
A service panics on the first request.

```text
panic: assignment to entry in nil map
goroutine 6 [running]:
main.(*Cache).Set(...)
```
? What is the fix?
+ Create the map with make before writing to it
- Wrap the call in recover and ignore it
- Use a larger map
- Restart the process
why: A nil map can be read but not written. Initialise it in the constructor.

## Loop variable and goroutines
level: mid
You start goroutines in a loop and they all print the last item on an old Go toolchain.

```text
for _, j := range jobs {
    go func() { process(j) }()
}
```
? How do you make each goroutine see its own item on older versions?
+ Pass the variable as an argument or copy it inside the loop
- Add time.Sleep
- Use a global variable
- Call runtime.GC()
why: Before Go 1.22 the loop variable was shared. Copy it or pass it in.

## Ignored error
level: junior
A config file is missing but the program runs with zero values.

```text
cfg, _ := loadConfig(path)
```
? What is wrong?
+ The error is discarded, so failures become silent zero values
- Nothing, Go ignores errors safely
- The underscore speeds up the code
- loadConfig cannot fail
why: Check err and return a wrapped error with context. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Leaked goroutine
level: mid
The goroutine count rises with every request.

```text
go func() { results <- fetch() }()
```
? What is a likely cause?
+ Nobody receives from results after the request is cancelled, so the sender blocks forever
- The garbage collector is off
- The function is too short
- Channels are slow
why: Use a buffered channel or select with ctx.Done so the sender can exit.

## No timeout on http.Get
level: mid
A slow partner stops your service.

```text
resp, err := http.Get(url)
```
? What should you do?
+ Use a client with a timeout and a request context
- Call http.Get twice
- Increase GOMAXPROCS
- Disable keep-alive
why: The default client waits forever. Set Timeout and use NewRequestWithContext.

## Race detector
level: mid
A counter gives different totals on each run.

```text
var n int
for i := 0; i < 100; i++ { go func() { n++ }() }
```
? Which tool finds this?
+ go test -race
- go vet only
- gofmt
- go mod tidy
why: Unsynchronised writes are a data race. Use atomic or a mutex and run with -race.

## Wrapping errors
level: junior
You want callers to test the cause of an error.

```text
return fmt.Errorf("open %s: %v", path, err)
```
? What change keeps the cause inspectable?
+ Use %w instead of %v
- Use %s
- Print and return nil
- Use panic
why: %w wraps the error so errors.Is and errors.As work. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Static binary for containers
level: mid
Your image fails with a missing library error on a minimal base.

```text
exec /app: no such file or directory
```
? What is the likely fix?
+ Build with CGO_ENABLED=0 for a static binary
- Add more RAM
- Use a larger timeout
- Rename the file
why: A dynamically linked binary needs libc. A static build runs on scratch or distroless images.
