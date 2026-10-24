---
title: Files, processes and error handling
minutes: 15
summary: Read and write files safely with pathlib, run other programs with subprocess, handle failures explicitly and log what happened.
---

Most automation boils down to three jobs: read or write files, run another program, and decide what to do when something fails. Python's standard library covers all three without installing anything.

## What you will learn

- Reading and writing files with `pathlib` and context managers
- Running commands with `subprocess.run` safely and checking the result
- Handling exceptions deliberately and exiting with useful codes
- Logging instead of scattering `print` calls

## Files with pathlib

`pathlib.Path` treats paths as objects, so you avoid string concatenation and platform differences.

```python
from pathlib import Path

config = Path("/etc/myapp/app.conf")
if not config.exists():
    raise SystemExit(f"missing config: {config}")

text = config.read_text(encoding="utf-8")
lines = [l.strip() for l in text.splitlines() if l and not l.startswith("#")]

out = Path("/var/tmp/report.txt")
out.parent.mkdir(parents=True, exist_ok=True)
with out.open("w", encoding="utf-8") as fh:
    for line in lines:
        fh.write(line + "\n")

for log in Path("/var/log/myapp").glob("*.log"):
    print(log.name, log.stat().st_size)
```

The `with` block closes the file even when an error occurs. For configuration files in JSON or YAML, parse them with `json.loads` or a YAML library instead of splitting lines yourself.

## Running programs

`subprocess.run` is the safe default. Pass the command as a **list**, not a string, so the shell never interprets it.

```python
import subprocess

result = subprocess.run(
    ["systemctl", "is-active", "nginx"],
    capture_output=True, text=True, timeout=10,
)
print(result.returncode, result.stdout.strip())

# fail loudly when a command must succeed
subprocess.run(["tar", "-czf", "/tmp/site.tgz", "/var/www"], check=True)
```

`check=True` raises `CalledProcessError` on a non-zero exit. `timeout` stops a hung command from hanging your script. Avoid `shell=True` with any value that comes from a user, a file or an API, because it enables command injection.

## Exceptions you expect

Catch the specific errors you can handle and let everything else stop the script with a traceback.

```python
import subprocess
import sys

def restart(service: str) -> bool:
    try:
        subprocess.run(["systemctl", "restart", service], check=True, timeout=30)
    except subprocess.CalledProcessError as exc:
        print(f"restart failed, exit code {exc.returncode}", file=sys.stderr)
        return False
    except subprocess.TimeoutExpired:
        print("restart timed out", file=sys.stderr)
        return False
    return True
```

## Logging

`logging` gives timestamps and levels, and can be redirected to files or the journal without changing the code.

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("cleanup")
log.info("removing files older than %d days", 14)
log.warning("directory %s is almost full", "/var/tmp")
```

Use `log.exception("message")` inside an `except` block to record the traceback.

```console
$ python3 cleanup.py
2025-06-02 03:00:01,114 INFO removing files older than 14 days
2025-06-02 03:00:01,201 WARNING directory /var/tmp is almost full
$ echo $?
0
```

## Incident: the cleanup that deleted too much

> **Incident:** A cleanup script runs `subprocess.run(f"rm -rf {base}/{name}", shell=True)`. One night `name` comes back empty from a config file, and the command becomes `rm -rf /data/`. Half of the shared volume is deleted before anyone notices.

Three defects combined: a shell string, an unvalidated value and no dry run. The safer version validates input, uses `pathlib` and refuses to act on anything outside the intended directory:

```python
import shutil
from pathlib import Path

BASE = Path("/data/cache").resolve()

def remove(name: str, dry_run: bool = True) -> None:
    if not name or "/" in name:
        raise ValueError(f"refusing unsafe name: {name!r}")
    target = (BASE / name).resolve()
    if BASE not in target.parents:
        raise ValueError(f"{target} is outside {BASE}")
    print(("would remove " if dry_run else "removing ") + str(target))
    if not dry_run:
        shutil.rmtree(target)
```

Default to a dry run, print what would happen, and require an explicit flag for the destructive step.

## Common mistakes

- Using `shell=True` with interpolated values
- Opening files without a context manager, leaving them unclosed
- Forgetting `encoding="utf-8"`, which breaks on non-English systems
- Using `print` for everything instead of logging with levels
- Swallowing exceptions so the script reports success when it failed

```quiz
Q: Why pass a list to subprocess.run instead of a single string?
- Lists run faster
+ The shell never interprets the arguments, which prevents injection and quoting bugs
- Strings are not allowed
- Lists enable colour output
> Without shell=True, each list element is one argument exactly as given.

Q: What does check=True do?
- Verifies the command exists before running
+ Raises CalledProcessError when the command exits non-zero
- Validates the output format
- Retries the command
> It turns a silent failure into an exception you can handle or let stop the script.

Q: What is the benefit of a with statement when opening a file?
+ The file is closed automatically, even if an error occurs
- The file is encrypted
- The file is read faster
- The file is locked for other processes
> Context managers guarantee cleanup.

Q: Why default a destructive script to dry-run mode?
- It saves disk space
+ Operators can review what would change before anything is deleted
- It makes the script portable
- It is required by Python
> Printing the plan first catches bad input before it causes damage.
```

```cards
Why set a timeout on subprocess.run? :: So a hung command cannot hang the whole script
pathlib read_text and write_text? :: Convenient whole-file reads and writes on a Path object
When use log.exception? :: Inside an except block, to record the message plus the traceback
Safe pattern for destructive scripts? :: Validate input, resolve the path, check it is inside the base directory, support dry-run
```
