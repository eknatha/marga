---
title: Debugging Python scripts and services
minutes: 15
summary: Read tracebacks from the bottom, use logging and the debugger well, and find scripts that hang or leak using faulthandler and py-spy.
---

Python usually tells you what went wrong, and in which line. Many hours are lost because people read the top of the error instead of the bottom, add print statements everywhere, or cannot see why a script simply hangs. This lesson shows a calm routine for finding the cause.

## What you will learn

- Reading a traceback correctly
- Using `logging` instead of `print`
- Stepping through code with `breakpoint()` and `pdb`
- Finding a script that hangs, with `faulthandler` and `py-spy`
- Reproducing a failure with the smallest possible input

## Read the traceback from the bottom

```console
$ python sync.py
Traceback (most recent call last):
  File "sync.py", line 31, in <module>
    main()
  File "sync.py", line 24, in main
    total += item["price"] * item["qty"]
KeyError: 'qty'
```

The last line names the error and the value (`KeyError: 'qty'`). The line above it shows where it happened. The frames above that show how the code got there. Here an item has no `qty`. Decide whether the data is wrong or the code should cope (`item.get("qty", 0)`), and then add a test with that input.

## Logging beats print

```python
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("sync")

log.info("fetching %s", url)
try:
    resp = session.get(url, timeout=10)
    resp.raise_for_status()
except Exception:
    log.exception("fetch failed for %s", url)   # includes the traceback
    raise
```

Levels let you keep debug detail switched off in normal runs. `log.exception` records the full traceback. Log identifiers (request id, file name), never passwords or tokens.

## Stop and look: the debugger

```python
def total(items):
    breakpoint()          # opens pdb here (python -m pdb script.py also works)
    return sum(i["price"] * i["qty"] for i in items)
```

At the `(Pdb)` prompt: `n` next line, `s` step into a call, `c` continue, `p expr` print a value, `l` list code, `w` show the stack, `q` quit. With pytest, `pytest -x --pdb` opens the debugger at the first failing test.

## When a script hangs

```python
import faulthandler, signal
faulthandler.register(signal.SIGUSR1)       # kill -USR1 PID prints every thread's stack
faulthandler.dump_traceback_later(300)      # or dump after 5 minutes
```

```console
$ py-spy dump --pid 4321
Thread 4321 (idle): "MainThread"
    recv (socket.py:707)
    ...
    fetch (sync.py:18)
```

A stack that ends in `recv` for a long time means the program is waiting on the network. The usual cause is an HTTP call with no timeout. `py-spy` can inspect a running process without changing it.

```predict
Q: What does this function return the second time it is called?
def add(x, items=[]):
    items.append(x)
    return items
add(1)
???
Calling add(2) returns [1, 2]. The default list is created once and reused.
> Default argument values are evaluated when the function is defined. Use items=None and create a new list inside the function.
```

## Shrink the problem

Copy the failing input into a small test. Remove parts until the failure disappears, and the last part removed is the cause. A failing test that you keep is the best record of the bug.

## Incident: the job that never finished

> **Incident:** A nightly sync usually takes ten minutes. One night it is still running at noon and blocks the next run.

```console
$ py-spy dump --pid 18822 | head -8
Thread 18822 (idle): "MainThread"
    recv (ssl.py:1134)
    read (http/client.py:466)
    send (requests/adapters.py:667)
    get (requests/sessions.py:602)
    fetch_page (sync.py:41)
```

The dump showed the program stuck reading from a socket in `fetch_page`. The request had no timeout, and the remote server had stopped responding. The fix was `timeout=(3, 15)`, a retry with a limit, and a lock file with a maximum run time.

## Common mistakes

- Catching `Exception` and doing nothing, which hides the real error
- Printing secrets while debugging
- Debugging with the full data set instead of a small failing example
- Mutable default arguments

```quiz
Q: In a Python traceback, where do you usually find the error type and message?
- At the top :: The top shows the start of the call chain, not the error.
+ On the last line
- In the middle :: The middle holds intermediate frames.
- It is not shown :: Python always prints the exception at the end.
> The final line names the exception and its message, and the frame above it shows where it occurred.

Q: Why use logging instead of print for diagnostics?
- It is shorter to type :: It is not shorter; the benefit is control.
+ It has levels, timestamps, destinations and can include tracebacks
- It runs faster than print always :: Speed is not the main reason.
- It hides all errors :: Logging reports errors, it does not hide them.
> You can raise or lower detail without editing code, and every line carries time and source.

Q: A script hangs. Which tool shows where a running process is stuck?
+ py-spy dump or faulthandler
- pip freeze :: It lists installed packages.
- black :: It formats code.
- venv :: It creates environments.
> A stack dump shows the exact line each thread is waiting at.

Q: What is the usual cause of an HTTP call that waits forever?
- A missing import :: That would give an immediate error.
+ No timeout was set on the request
- Too many comments :: Comments do not affect runtime.
- A short variable name :: Names do not change networking.
> Without a timeout, the call can wait as long as the other side stays silent.
```

```cards
Where do you read a traceback first? :: At the last line, then upward
What does breakpoint() do? :: Starts the debugger at that line
How do you see all thread stacks of a hung program? :: faulthandler or py-spy dump
Why is items=[] a bad default? :: The same list is shared between calls
What should every network call have? :: A timeout
```
