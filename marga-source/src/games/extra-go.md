## The goroutines that never stopped
module: go
level: Intermediate
minutes: 6
lesson: go/context-timeouts-and-cancellation
summary: A Go service leaks memory, and the goroutine count climbs forever. Find and stop the leak.
intro: Memory grows 50 MB an hour and the service restarts every night. The goroutine metric rises steadily.

### s1
text: Goroutines climb and never fall. What do you check?
- A goroutine profile, to see where the many goroutines are blocked => s2 | 2 | The profile shows what they wait for. Example: pprof shows 40 thousand goroutines blocked on a channel send.
- Restart more often => s2 | 1 | It hides the leak. It helps only in part. Example: The leak refills each night.
- Buy more memory => s2 | 0 | It delays the crash only. That does not deal with the real cause. Example: The service still runs out.

### s2
text: They are blocked sending to a channel nobody reads. Why?
- The caller timed out and left, so the worker has no receiver => s3 | 2 | Abandoned work still waits to deliver. Example: A handler returns on timeout while its worker keeps trying to send.
- Go leaks goroutines by design => s3 | 0 | It does not. That does not deal with the real cause. Example: Leaks come from missing exits.
- The CPU is too slow => s3 | 0 | Not the cause. That does not deal with the real cause. Example: CPU is idle.

### s3
text: How do you let the worker stop? Choose the move you would make next.
- Pass a context, select on ctx.Done() when sending, and use a buffered channel where it fits => s4 | 2 | Every goroutine needs an exit. Example: select { case out <- v: case <-ctx.Done(): return }
- Add a sleep => s4 | 0 | It does not release the goroutine. Example: The blocked send stays blocked.
- Ignore the result => s4 | 1 | Dropping results can hide errors. It helps only in part. Example: Failures go unnoticed.

### s4
text: How do you catch it earlier? Choose the move you would make next.
- Export the goroutine count, alert on steady growth and test with a leak detector => end-win | 2 | Trends reveal leaks before crashes. Example: goleak fails a unit test if goroutines remain.
- Look at memory once a month => end-ok | 1 | Too slow. It helps only in part. Example: The leak appears after weeks.
- Disable the metric => end-fail | 0 | It removes the signal. That does not deal with the real cause. Example: The leak is invisible.

### end-win
end: win
text: The profile pointed at blocked sends, context cancellation freed the workers and tests now catch leaks.
takeaway: Every goroutine needs a way to stop.

### end-ok
end: ok
text: The leak is fixed, but nothing watches for the next one.
takeaway: Alert on goroutine growth. Review the lesson and try the game again.

### end-fail
end: fail
text: Restarts and memory hid the leak. Read each choice explanation to see why.
takeaway: Find the blocked goroutine. Review the lesson and try the game again.

## The panic that took down the server
module: go
level: Beginner
minutes: 5
lesson: go/functions-errors-and-defer
summary: One nil pointer crashed the whole service. Handle errors and recover sensibly.
intro: A single malformed request makes the server panic and exit. Every user is disconnected.

### s1
text: A bad request crashed the process. What do you look at?
- The stack trace in the logs, to find the line that dereferenced nil => s2 | 2 | The trace names the exact line. Example: It points at user.Address.City where Address is nil.
- Add a restart loop only => s2 | 1 | It hides the bug. It helps only in part. Example: The crash repeats with every bad request.
- Blame the client => s2 | 0 | Servers must handle bad input. Example: Another client sends the same request.

### s2
text: What is the proper fix for the nil pointer?
- Validate the input and return an error, checking for nil before use => s3 | 2 | Handle expected bad data as an error. Example: if u.Address == nil { return ErrMissingAddress }
- Recover and ignore everything => s3 | 0 | Silently ignoring hides real bugs. That does not deal with the real cause. Example: Wrong data is stored.
- Remove the field => s3 | 0 | It breaks features. That does not deal with the real cause. Example: Customers lose their address.

### s3
text: Should the server also recover from panics?
- Yes, with middleware that recovers per request, logs the stack and returns 500 => s4 | 2 | One request should not kill the process. Example: A recover middleware logs the stack and responds with 500.
- No, let it crash => s4 | 1 | Crashes affect all users. It helps only in part. Example: Every connection drops.
- Recover and hide the error => s4 | 0 | You lose the evidence. That does not deal with the real cause. Example: Nobody learns about the bug.

### s4
text: How do you prevent similar bugs? Choose the move you would make next.
- Test with bad input, fuzz parsers and alert on panics and 500s => end-win | 2 | Tests and alerts find these early. Example: A table test sends a missing address and expects a 400.
- Hope users send good data => end-fail | 0 | They will not. That does not deal with the real cause. Example: Another case arrives.
- Fix only this one line and move on => end-ok | 1 | It fixes one case but not the class of bug. Example: A different nil field crashes it next month.

### end-win
end: win
text: Input is validated, panics are recovered per request and tests cover bad data.
takeaway: Return errors for expected problems, recover for the unexpected.

### end-ok
end: ok
text: The crash is fixed, but recovery or tests are missing.
takeaway: Add per-request recovery. Review the lesson and try the game again.

### end-fail
end: fail
text: A restart loop or silence hid the bug. Read each choice explanation to see why.
takeaway: Find and fix the nil. Review the lesson and try the game again.

