---
title: Concurrency for operations: threads, asyncio and subprocesses
minutes: 14
summary: Run many network calls or commands at once with thread pools, asyncio and subprocess, with timeouts, limits and error handling that keep operations scripts fast and safe.
---

Operations scripts spend most of their time waiting: for an API, for a remote host, for a command. Running a hundred checks one after another can take an hour; running them concurrently can take a minute. Python gives you three tools, and choosing the right one and putting limits on it matters more than speed.

## What you will learn

- Why waiting work benefits from concurrency and CPU work does not
- Thread pools with `concurrent.futures`
- `asyncio` for many network calls
- Running commands with `subprocess` and timeouts
- Limiting concurrency and handling failures

## Which tool

| Work | Tool |
|------|------|
| Many blocking calls (HTTP, SSH, SDK) | `ThreadPoolExecutor` |
| Very many network connections, async libraries available | `asyncio` |
| Heavy CPU work | `ProcessPoolExecutor` or separate processes |
| External commands | `subprocess.run` with `timeout` |

The global interpreter lock stops threads from running Python code in parallel, but threads waiting on I/O release it, so thread pools work well for operations tasks.

## A thread pool with limits

```python
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

def check(url):
    r = requests.get(url, timeout=(3, 10))
    return url, r.status_code

urls = [f"https://svc{i}.example.com/health" for i in range(100)]
failed = []
with ThreadPoolExecutor(max_workers=20) as pool:
    futures = {pool.submit(check, u): u for u in urls}
    for fut in as_completed(futures):
        try:
            url, status = fut.result()
            if status != 200:
                failed.append((url, status))
        except Exception as exc:
            failed.append((futures[fut], repr(exc)))
print(f"{len(failed)} problems")
```

`max_workers` is the limit. Without one, a hundred workers may overload the target or exhaust your file handles. Always set a timeout on each call and collect failures instead of stopping at the first.

## asyncio

```python
import asyncio, aiohttp

async def check(session, sem, url):
    async with sem:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as r:
            return url, r.status

async def main(urls):
    sem = asyncio.Semaphore(50)
    async with aiohttp.ClientSession() as session:
        return await asyncio.gather(*(check(session, sem, u) for u in urls), return_exceptions=True)

results = asyncio.run(main(urls))
```

Everything in the call chain must be async, and one blocking call stalls the whole loop. `return_exceptions=True` keeps one failure from cancelling the rest. A `Semaphore` caps concurrent calls.

## Running commands

```python
import subprocess
p = subprocess.run(["df", "-h", "/var"], capture_output=True, text=True, timeout=10, check=False)
if p.returncode != 0:
    raise RuntimeError(p.stderr.strip())
```

Pass a list, not a string with `shell=True`, so that input cannot inject commands. Always set `timeout`.

```predict
Q: You start 500 threads that each call the same API. What is the most likely result?
???
The API throttles or fails some calls, and your script may run out of connections or memory. A pool with a small max_workers is safer.
> Concurrency needs a ceiling. Pair it with timeouts and retries with backoff.
```

## Incident: the audit that took down the inventory API

> **Incident:** A new audit script queries every instance's details at once and the internal inventory API starts returning errors for everyone.

```console
$ python audit.py
... 3000 requests in 4 seconds
429 Too Many Requests
```

The script started a thread for each item with no limit. The fix used a pool of 10 workers, a retry with exponential backoff on 429 responses, and a result file written as items finished so a failure did not lose the work.

## Common mistakes

- Unlimited concurrency
- No timeouts
- Stopping the whole run on the first error
- Using `shell=True` with input from outside

```quiz
Q: Why do threads help for network-bound scripts despite the GIL?
- The GIL does not exist :: It exists in standard CPython.
+ Threads release the GIL while they wait for I/O
- Threads use more CPUs :: Python code does not run in parallel.
- Threads avoid timeouts :: Timeouts are still needed.
> While one thread waits, others run.

Q: What does max_workers control?
- The size of results :: Unrelated.
+ How many tasks run at the same time
- The timeout :: Set separately.
- The log level :: Unrelated.
> It is the concurrency limit that protects the target and your machine.

Q: How do you stop one failed task from cancelling the rest in asyncio.gather?
- Remove await :: That breaks the code.
+ Pass return_exceptions=True
- Use sleep :: It does not handle errors.
- Use global variables :: Not related.
> Exceptions are returned as results to inspect later.

Q: Why pass a list to subprocess.run instead of a string with shell=True?
+ It avoids shell injection from untrusted values
- It is faster to type :: Safety is the reason.
- It enables colours :: Unrelated.
- It hides output :: Unrelated.
> Without a shell, arguments are not interpreted as commands.
```

```cards
Best tool for many blocking HTTP calls? :: ThreadPoolExecutor
What caps concurrency in asyncio? :: A Semaphore
Which argument stops a hung command? :: timeout=
Why set max_workers? :: To avoid overloading the target and yourself
How to collect all results despite errors? :: Catch per future, or gather with return_exceptions=True
```
