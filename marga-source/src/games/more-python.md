## The script that waits forever on one slow host
module: python
level: Intermediate
minutes: 7
lesson: python/concurrency-for-operations
summary: A fleet check hangs because one host never answers. Learn timeouts, thread pools and partial results.
intro: Your Python script checks 200 servers one after another and reports the health of each. Tonight it has run for six hours and printed nothing.

### s1
text: The script is stuck. You attach to the logs and see it is waiting on host number 87. What is the most likely cause?
- A network call with no timeout is waiting for a host that never replies => s2 | 2 | Many libraries wait forever by default. Example: requests.get(url) with no timeout blocks until the operating system gives up, which can be many minutes.
- Python is too slow for this job => s2 | 0 | Python is fast enough for 200 calls. Example: each call takes milliseconds when hosts answer, so the problem is waiting, not computing.
- The host list is too long => s2 | 1 | Length is not the issue here. Example: 200 healthy hosts finish in under a minute.

### s2
text: You kill the script. What is the first fix?
- Set an explicit timeout on every network call and handle the timeout error => s3 | 2 | A timeout turns a hang into a result you can report. Example: requests.get(url, timeout=(3, 10)) raises Timeout after 3 seconds to connect or 10 to read, and you record the host as unreachable.
- Wrap the script in a while True loop => end-fail | 0 | Looping restarts the same hang. Example: the script gets stuck on host 87 again and again.
- Run it with a bigger machine => s3 | 1 | More CPU does not make a blocked call return. Example: the process sits idle at 0 percent CPU while it waits.

### s3
text: With timeouts, 200 hosts take about 30 minutes, because dead hosts cost 13 seconds each. How can you speed it up safely?
- Check hosts in parallel with a thread pool of a limited size => s4 | 2 | Network waits release the interpreter, so threads work well for this. Example: concurrent.futures.ThreadPoolExecutor(max_workers=20) checks 20 hosts at a time, so the total is a couple of minutes.
- Start 200 processes at once => s4 | 1 | It is fast but heavy, and may overload the network or your machine. Example: 200 interpreters use gigabytes of memory.
- Remove the timeout to be faster => s4 | 0 | Removing it brings back the hang. Example: one dead host again blocks everything.

### s4
text: One thread raises an unexpected exception for a host with a strange certificate. What should happen to the report?
- Catch the error per host, record it as a failure with the reason, and finish the rest => s5 | 2 | One bad host must not hide the other 199. Example: the report lists host 87: TLS error, and the other hosts are green.
- Let the whole script crash so someone notices => end-fail | 0 | A crash loses all results. Example: 150 successful checks are thrown away.
- Ignore the host silently => s5 | 1 | Silent skipping hides problems. Example: the host stays broken for weeks because it never appears in a report.

### s5
text: The script works. How do you make it trustworthy for the next team?
- Add a total deadline, a clear exit code, a summary of failures and a test with a fake slow host => end-win | 2 | A deadline and a summary make results predictable and testable. Example: the script exits 1 and prints "3 hosts failed" in a fixed format that a scheduler can read.
- Leave it as is => end-ok | 1 | It works until the next odd case. Example: the first host that returns half a response breaks it differently.
- Print more debug output => end-fail | 0 | Noise is not structure. Example: the summary is lost in a thousand lines.

### end-win
end: win
text: The fleet check finishes in two minutes, reports every failure with its reason, and exits with a useful code. A dead host no longer hides the rest.
takeaway: Every network call needs a timeout, parallel waits need a limit, and one failure must not erase the others.

### end-ok
end: ok
text: The script is faster and mostly works, but some odd cases still lose information.
takeaway: Add per-item error handling and a summary so partial results stay useful.

### end-fail
end: fail
text: The script kept hanging or crashing, and nobody had a result when they needed it.
takeaway: A call without a timeout is a promise to wait forever.

