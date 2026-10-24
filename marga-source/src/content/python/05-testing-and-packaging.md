---
title: Testing and packaging a command-line tool
minutes: 15
summary: Build a real CLI with argparse, test it with pytest including mocks, and package it so teammates can install it with one command.
---

A script becomes a tool when it has arguments, tests and a way to install it. These habits turn a one-off helper into something your team trusts at 3 a.m.

## What you will learn

- Building a command-line interface with `argparse`
- Writing tests with `pytest` and mocking external calls
- Packaging with `pyproject.toml` and installing the tool
- Running linters and tests in a pipeline

## A small CLI

```python
import argparse
import sys


def parse_args(argv=None):
    p = argparse.ArgumentParser(prog="diskwatch", description="Warn when disks are nearly full")
    p.add_argument("paths", nargs="+", help="mount points to check")
    p.add_argument("--threshold", type=int, default=85, help="percent used that triggers a warning")
    p.add_argument("--json", action="store_true", help="print machine-readable output")
    return p.parse_args(argv)


def percent_used(path: str) -> int:
    import shutil
    usage = shutil.disk_usage(path)
    return round(usage.used / usage.total * 100)


def main(argv=None) -> int:
    args = parse_args(argv)
    bad = [(p, percent_used(p)) for p in args.paths if percent_used(p) >= args.threshold]
    for path, pct in bad:
        print(f"WARN {path} is {pct}% full")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
```

`argparse` generates `--help`, validates types and gives clear errors for free. Returning a non-zero exit code when a check fails lets cron, monitoring and pipelines react.

## Testing with pytest

Keep logic in small functions, then test them. Replace anything slow or dangerous, such as disks or HTTP calls, with a **mock**.

```python
from unittest import mock
import diskwatch


def test_warns_when_over_threshold(capsys):
    with mock.patch("diskwatch.percent_used", return_value=91):
        code = diskwatch.main(["/data", "--threshold", "85"])
    assert code == 1
    assert "WARN /data is 91% full" in capsys.readouterr().out


def test_ok_when_under_threshold():
    with mock.patch("diskwatch.percent_used", return_value=40):
        assert diskwatch.main(["/data"]) == 0


def test_requires_a_path():
    import pytest
    with pytest.raises(SystemExit):
        diskwatch.parse_args([])
```

```console
$ python -m pip install pytest
$ python -m pytest -q
...                                                                [100%]
3 passed in 0.04s
```

Test the failure paths as hard as the happy path: that is where operations scripts hurt.

## Packaging

A `pyproject.toml` describes the project. Installing it creates a real command on the PATH.

```text
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[project]
name = "diskwatch"
version = "0.1.0"
requires-python = ">=3.9"

[project.scripts]
diskwatch = "diskwatch:main"
```

The `[project.scripts]` table maps the command name to the function, so `pip install .` creates the `diskwatch` command. Install it into a virtual environment, or with `pipx` so it stays isolated:

```console
$ python -m pip install .
$ diskwatch /var --threshold 80
$ diskwatch --help
```

## Checks in a pipeline

```yaml
test:
  image: python:3.12-slim
  script:
    - python -m pip install -r requirements.txt pytest ruff
    - ruff check .
    - python -m pytest -q
```

Linting catches mistakes before runtime, and the test job blocks a merge when behaviour breaks.

## Incident: the quiet change to a shared script

> **Incident:** Someone improves a shared `rotate_logs.py` to compress files in place. Nobody tests it. The next night it raises an exception on a file name with spaces, stops halfway, and leaves partial archives. Disk fills up on three hosts by morning.

With a test suite the problem is found in seconds: add a test with an awkward file name that fails, fix the code, and keep the test forever.

```python
from pathlib import Path
import rotate_logs

def test_handles_spaces(tmp_path: Path):
    f = tmp_path / "app log 1.txt"
    f.write_text("data")
    rotate_logs.compress(f)
    assert (tmp_path / "app log 1.txt.gz").exists()
```

`tmp_path` gives each test a clean temporary directory, so tests never touch real data.

## Common mistakes

- Putting all logic under `if __name__ == "__main__"` where it cannot be tested
- Testing against real servers or production data
- Not returning meaningful exit codes
- Pinning nothing, so a new dependency release breaks the build
- Skipping tests for the error paths

```quiz
Q: Why return an exit code from a CLI tool?
- It makes the output colourful
+ Schedulers and pipelines use it to decide whether the run succeeded
- It speeds up Python
- It is needed for argparse
> A non-zero code signals failure to cron, monitoring and CI.

Q: What is a mock used for in tests?
- To encrypt test data
+ To replace slow or risky dependencies such as network or disk calls
- To format code
- To install packages
> Mocks let tests run fast and safely without touching real systems.

Q: What does pytest's tmp_path fixture provide?
- A copy of production data
+ A fresh temporary directory for each test
- A network connection
- A virtual environment
> It keeps tests isolated and clean.

Q: How does packaging make a script available as a command?
- By copying it to /usr/bin manually
+ A scripts entry point in pyproject.toml makes pip install create the command
- By renaming it to .exe
- By running it with sudo
> Entry points are the standard way to ship command-line tools.
```

```cards
What does argparse give you free? :: Help text, type checks, validation and error messages
What belongs in a test? :: Both the happy path and failures such as bad input and missing files
What is pipx for? :: Installing command-line Python tools into their own isolated environments
Why add linting to CI? :: It catches mistakes before runtime and keeps the code consistent
```
