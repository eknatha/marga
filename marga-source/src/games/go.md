## The API that eats memory all day
module: go
level: Intermediate
minutes: 7
lesson: go/goroutines-channels-and-sync
summary: Memory climbs steadily until the pod is killed. Find the goroutine leak and fix it without hiding the symptom.
intro: The orders API restarts every four hours with out-of-memory kills. CPU is low and traffic is steady. A teammate proposes doubling the memory limit and moving on.

### s1
text: The restarts line up with memory growth, not with traffic spikes. What do you check first?
- Look at the goroutine count and a goroutine profile from the running service => s2 | 2 | A rising goroutine count with flat traffic points to a leak. Example: curl localhost:6060/debug/pprof/goroutine?debug=1 shows 48,000 goroutines all parked at the same line in fetchPrice.
- Double the memory limit => s3 | 0 | This delays the crash but hides the cause. Example: Pods now die every eight hours, which pushes the incident into a weekend night.
- Add a scheduled restart every three hours => s3 | 1 | A restart is a workaround, not a fix. Example: Requests in flight are dropped during each restart and error rates spike on the hour.

### s2
text: Every leaked goroutine is blocked sending on an unbuffered channel inside a handler. The handler returned after a timeout. What is the cause?
- The handler gave up, but the worker goroutine still waits for a receiver that no longer exists => s4 | 2 | Abandoned senders block forever when nobody reads. Example: The handler returns at 2 seconds, then the worker finishes at 3 seconds and blocks on results <- r forever.
- The Go garbage collector is broken => s3 | 0 | Blocked goroutines are live, so the collector cannot free them. Example: The runtime is working as designed; the goroutine stacks stay reachable.
- The channel is too small => s4 | 1 | Size can hide it for a while but not fix it. Example: A buffer of 1 lets a single abandoned send finish, but a second one still blocks.

### s3
text: Given what you have found so far: How do you fix it properly?
- Pass a context, use select on ctx.Done() when sending, and make the result channel buffered by one => end-win | 2 | The sender can always exit and the handler owns the lifetime. Example: select { case results <- r: case <-ctx.Done(): return } lets the worker stop when the request is cancelled.
- Ignore the result when the timeout passes by removing the channel => end-ok | 1 | It works for this case but loses the design pattern. Example: The worker writes into a shared variable with no lock and a race appears under load.
- Wrap the worker in recover so it never blocks => end-fail | 0 | recover handles panics, not blocked goroutines. Example: The goroutine count still rises and memory still grows.

### s4
text: Before you close the incident, what do you add?
- A goroutine count metric with an alert and a test using goleak-style checks => end-win | 2 | You detect the next leak early. Example: An alert fires when goroutines exceed 5,000 for ten minutes, and CI fails if a test leaves goroutines behind.
- Nothing, the fix is deployed => end-ok | 1 | The same bug can return. Example: A new handler copies the pattern and leaks in three months.
- Raise the alert threshold on memory => end-fail | 0 | Quieter alerts do not fix leaks. Example: The pod is killed at 3 a.m. with no warning.

### end-win
end: win
text: Memory is flat, the goroutine count tracks traffic, and the team has an alert and a test that catch leaks.
takeaway: A rising goroutine count with flat traffic means leaked goroutines. Give every goroutine a way to stop.

### end-ok
end: ok
text: The leak is fixed, but nothing would catch the next one early.
takeaway: Fix the bug and add detection. Use this in your own work.

### end-fail
end: fail
text: Memory keeps growing, pods keep restarting and the cause was never found.
takeaway: Bigger limits and restarts hide leaks until they hurt.


## The service that crashed on one bad request
module: go
level: Intermediate
minutes: 7
lesson: go/debugging-go-programs
summary: One malformed request kills the whole process. Read the panic, find the nil map write and harden the service.
intro: At 10:12 the payments gateway exits and restarts three times in a minute. Logs show a stack trace that ends in a runtime panic. Every restart is followed by another crash within seconds.

### s1
text: Given what you have found so far: What do you read first in the output?
- The first lines of the panic message and the top frames of the stack trace => s2 | 2 | The message and the first frame in your code name the problem. Example: panic: assignment to entry in nil map, then goroutine 83 [running]: payments/internal/cache.(*Cache).Set at cache.go:41.
- The CPU graph => s3 | 0 | CPU says nothing about a panic. Example: CPU is at 9 percent, which tells you nothing about the crash.
- Roll back everything older than a week => s3 | 1 | A broad rollback is expensive and may not include the cause. Example: The change was merged yesterday, but the team rolls back a month of work.

### s2
text: cache.go line 41 writes to a map that is declared but never initialised, only when a rare request type arrives. What is the fix?
- Create the map with make in the constructor and add a test for the rare request type => s4 | 2 | A nil map cannot be written to, so initialise it where the struct is built. Example: c := &Cache{items: make(map[string]Item)} in NewCache, and TestSetRareType covers it.
- Wrap the handler in recover and carry on => s4 | 1 | It keeps the process alive but leaves the bug. Example: The request returns 500 forever for that type and the cache never stores it.
- Check for nil before every read => s3 | 0 | Reading a nil map is safe; the write is the problem. Example: if c.items == nil { return } before reads does not stop the write panic.

### s3
text: Given what you have found so far: Should the service still have a recover?
- Yes, as a middleware that logs the stack, returns 500 and keeps other requests running, in addition to the real fix => end-win | 2 | Defence in depth: fix the bug, contain unknown ones. Example: A recoveryMiddleware logs panic details with a request ID and increments a panic counter.
- No, crashing is always better => end-ok | 1 | Crashing and restarting is acceptable in some designs, but one bad request taking down everyone is not. Example: All in-flight payments fail because of one malformed request.
- Yes, and ignore the panic messages => end-fail | 0 | Silent recovers hide bugs. Example: The same panic happens ten thousand times and nobody notices.

### s4
text: Given what you have found so far: What goes into the follow-up?
- Add a panic counter alert, run the race detector and fuzz the request parser => end-win | 2 | You find other rare inputs before customers do. Example: go test -race ./... and a fuzz target for ParseRequest find two more edge cases in an hour.
- Close the ticket => end-ok | 1 | The fix is in but the learning is lost. Example: A similar issue appears in the refund service next month.
- Blame the author of the cache => end-fail | 0 | Blame hides the missing tests and review gaps. Example: The team stops reporting small issues.

### end-win
end: win
text: The cache is fixed, panics are contained and counted, and fuzzing covers the parser.
takeaway: Read the top of the panic first, fix the cause, and contain unknown panics with middleware.

### end-ok
end: ok
text: The service is stable but there is no alert or deeper testing.
takeaway: Fix the bug and add detection. Use this in your own work.

### end-fail
end: fail
text: The service keeps crashing or panics are silently swallowed.
takeaway: Never hide a panic. Make it visible and fix it.


## No timeouts on the outbound call
module: go
level: Advanced
minutes: 8
lesson: go/context-timeouts-and-cancellation
summary: A slow partner API makes your Go service stop answering. Find the missing timeouts and add them in the right layers.
intro: The checkout service calls a partner for shipping quotes. The partner starts answering in 90 seconds instead of 200 milliseconds. Within minutes all of your replicas stop answering health checks.

### s1
text: Requests pile up and the service is unresponsive. What do you suspect?
- Outbound calls with no timeout hold goroutines and connections until the partner answers => s2 | 2 | The default http.Client never gives up. Example: http.Get(url) uses http.DefaultClient, which has no timeout, so 10,000 requests wait 90 seconds each.
- A kernel bug => s3 | 0 | Rare and unlikely compared with an obvious missing timeout. Example: The kernel logs are clean and the CPU is idle.
- Too few replicas only => s3 | 1 | More replicas share the problem but do not remove it. Example: Eight new pods fill up with waiting requests within two minutes.

### s2
text: You need an immediate mitigation. What is fastest and safe?
- Turn off or bypass the shipping-quote call with a feature flag and show a default estimate => s4 | 2 | Remove the dependency from the critical path first. Example: The flag shipping.quote.enabled=false returns a flat rate and checkout recovers in a minute.
- Restart all pods repeatedly => s3 | 0 | They fill up again. Example: Each restart gives 40 seconds of relief.
- Wait for the partner to recover => s3 | 0 | You do not control it. Example: The partner status page says investigating for two hours.

### s3
text: Given what you have found so far: What is the correct permanent fix?
- Use a client with timeouts, pass the request context with a deadline, set server timeouts and add retries with backoff and a circuit breaker => end-win | 2 | Timeouts at every boundary limit damage. Example: client := &http.Client{Timeout: 2*time.Second}; req = req.WithContext(ctx) and a breaker that opens after five failures.
- Set a 90 second timeout => end-ok | 1 | A timeout that long still piles up requests. Example: A 90 s timeout leaves goroutines blocked far longer than users wait.
- Retry forever until it answers => end-fail | 0 | Endless retries multiply load on a struggling dependency. Example: Each user request triggers 50 outbound calls and the partner stays down longer.

### s4
text: How do you verify the fix before the next incident?
- Write a test with a slow fake server and run a game day that slows the partner on purpose => end-win | 2 | You prove the service degrades gracefully. Example: httptest.NewServer sleeps 5 seconds and the test expects a fallback within 2.1 seconds.
- Trust the code review => end-ok | 1 | Reviews miss behaviour under failure. Example: The timeout is applied to the wrong client and nobody notices.
- Remove the integration => end-fail | 0 | The business needs the feature. Example: Sales loses live shipping quotes.

### end-win
end: win
text: Checkout survives a slow partner: calls time out quickly, fall back to defaults and stop piling up.
takeaway: Every network call needs a timeout and a context, and the critical path needs a fallback.

### end-ok
end: ok
text: The outage ended but the design still depends on luck.
takeaway: Good fix, but test failure modes on purpose.

### end-fail
end: fail
text: The service keeps freezing whenever a partner slows down.
takeaway: No timeouts means your reliability equals your slowest dependency.

