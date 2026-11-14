## The agent that stalled under load
module: rust-infra
level: Intermediate
minutes: 7
lesson: rust-infra/async-rust-with-tokio-and-network-services
summary: A Rust agent freezes when many requests arrive. Find the blocking call.
intro: A Rust agent built with tokio handles hundreds of connections but stalls every few minutes. CPU is low and requests queue up.

### s1
text: What do you suspect first? Choose the best next step.
- A blocking call inside async code that holds a runtime thread => s2 | 2 | Blocking stalls other tasks. Example: A std sleep is inside a handler.
- The network is slow => s2 | 1 | CPU is low and the pattern is regular. Example: The network tests are fine.
- Rust is slow => end-fail | 0 | Unlikely. Example: A benchmark shows fast code.

### s2
text: How do you find it? Choose the best next step.
- Use tokio console or logs with timestamps and look for tasks that run too long => s3 | 2 | Tools show long polls. Example: One task blocks for two seconds.
- Restart and hope => s3 | 1 | No learning. Example: It stalls again.
- Add more threads blindly => end-fail | 0 | Hides the bug. Example: The stall still happens.

### s3
text: How do you fix it? Choose the best next step.
- Replace it with an async version or move it to spawn_blocking => s4 | 2 | Keeps the runtime free. Example: The sleep uses tokio time.
- Wrap the whole service in a mutex => s4 | 1 | Makes it worse. Example: All requests serialise.
- Remove the handler => end-fail | 0 | Loses features. Example: Clients get errors.

### s4
text: How do you prevent it coming back? Choose the best next step.
- Add timeouts, a test with concurrent requests and a lint or review rule for blocking calls => end-win | 2 | Tests and rules catch regressions. Example: A test fails when a handler blocks.
- Trust developers => end-ok | 1 | No safety net. Example: A new blocking call appears.
- Disable tests => end-fail | 0 | Hides problems. Example: Regressions ship.

### end-win
end: win
text: The blocking call was found, replaced and covered by a concurrency test and timeouts.
takeaway: Keep blocking work off the async runtime and test under concurrency.

### end-ok
end: ok
text: The stall stopped but there is no test to catch it again.
takeaway: Add a concurrency test. Review the lesson and try again.

### end-fail
end: fail
text: The cause stayed hidden and the agent still stalls.
takeaway: Do not guess at threads. Find the blocking call. Review the lesson and try again.
