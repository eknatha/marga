## Normalise file names
id: py-rename
module: python
level: Beginner
minutes: 20
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Write the string and file code that makes messy file names consistent, guided by tests.
@@ story
Photos arrive as `Photo 7.JPG`, `trip-12.png` and so on. `rename.py` must turn each name into a lowercase name with underscores and a number padded to three digits, and `rename_all(folder)` must apply it to a whole folder. The tests in `test_rename.py` describe exactly what is expected. Run them, read the failures, and write the code.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_rename.py is not edited.
@@ hints
- Run `python3 -m unittest -q 2>&1 | head -30` and read the first failure. Each test name says what it checks.
- `name.rpartition(".")` splits at the last dot. `.lower()` makes lowercase. `str(7).zfill(3)` gives `007`.
- `re.sub(r"[ -]+", "_", text)` replaces runs of spaces and hyphens. `re.search(r"_(\d+)$", base)` finds a trailing number.
- For rename_all use `os.listdir`, `os.path.join` and `os.rename`. Skip a file when the new name already exists.
@@ world
{}
@@ file /home/user/rename.py mode=644 owner=user
"""Normalise file names."""
import os
import re


def normalize(name):
    raise NotImplementedError


def rename_all(folder):
    """Rename every file in folder. Return how many were renamed."""
    raise NotImplementedError
@@ file /home/user/test_rename.py mode=644 owner=user
import os
import tempfile
import unittest
from rename import normalize, rename_all


class NormalizeTests(unittest.TestCase):
    def test_spaces_and_case(self):
        self.assertEqual(normalize("Photo 7.JPG"), "photo_007.jpg")

    def test_hyphen(self):
        self.assertEqual(normalize("trip-12.png"), "trip_012.png")

    def test_no_number(self):
        self.assertEqual(normalize("Notes.txt"), "notes.txt")

    def test_long_number_is_kept(self):
        self.assertEqual(normalize("img 1234.jpg"), "img_1234.jpg")

    def test_no_extension(self):
        self.assertEqual(normalize("README 2"), "readme_002")


class RenameAllTests(unittest.TestCase):
    def test_renames_and_counts(self):
        with tempfile.TemporaryDirectory() as d:
            for n in ["Photo 7.JPG", "trip-12.png", "ok.txt"]:
                open(os.path.join(d, n), "w").close()
            self.assertEqual(rename_all(d), 2)
            self.assertEqual(sorted(os.listdir(d)), ["ok.txt", "photo_007.jpg", "trip_012.png"])

    def test_never_overwrites(self):
        with tempfile.TemporaryDirectory() as d:
            with open(os.path.join(d, "a 1.txt"), "w") as f:
                f.write("new")
            with open(os.path.join(d, "a_001.txt"), "w") as f:
                f.write("old")
            self.assertEqual(rename_all(d), 0)
            with open(os.path.join(d, "a_001.txt")) as f:
                self.assertEqual(f.read(), "old")
            self.assertIn("a 1.txt", os.listdir(d))


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_rename.py", "label": "test_rename.py was not changed"},
 {"t": "cmd", "run": "python3 -c \"from rename import normalize; print(normalize('Report 5.PDF'))\"", "code": 0, "out": "^report_005\\.pdf$", "label": "a name that is not in the tests also works"}
]
@@ solution
cat > rename.py <<'EOF'
"""Normalise file names."""
import os
import re


def normalize(name):
    base, dot, ext = name.rpartition(".")
    if not dot:
        base, ext = name, ""
    base = re.sub(r"[ -]+", "_", base.lower())
    m = re.search(r"_(\d+)$", base)
    if m:
        base = base[:m.start()] + "_" + m.group(1).zfill(3)
    return base + ("." + ext.lower() if dot else "")


def rename_all(folder):
    count = 0
    for name in sorted(os.listdir(folder)):
        new = normalize(name)
        if new == name or os.path.exists(os.path.join(folder, new)):
            continue
        os.rename(os.path.join(folder, name), os.path.join(folder, new))
        count += 1
    return count
EOF
python3 -m unittest -q
@@ explain
Tests turn a vague request into exact examples. Work from the first failing test, make it pass, and run again. The last check uses a name that is not in the tests, to show that the code follows the rule and not just the examples.

## Parse a log file safely
id: py-log-parser
module: python
level: Beginner
minutes: 20
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Turn log lines into data, skip the broken ones, and count by level.
@@ story
`logparse.py` should read log lines such as `2026-01-05 10:00:01 ERROR payment failed order=1001`. Broken lines happen in real logs, and must not stop the program. Make the tests in `test_logparse.py` pass.
@@ goals
- `parse_line` returns a dict with ts, level and message, or None for a broken line.
- `summarize(path)` returns a dict of counts per level and ignores broken lines.
- `python3 -m unittest -q` reports OK.
@@ hints
- A line has three parts: date, time, level, then the rest. `line.split(None, 3)` splits on whitespace at most three times.
- Valid levels are INFO, WARN, ERROR and DEBUG. Anything else makes the line broken.
- `collections.Counter` counts items. Convert it with `dict(...)` before returning.
- Open files with `with open(path) as f:` and loop over `f`.
@@ world
{}
@@ file /home/user/logparse.py mode=644 owner=user
"""Parse application log lines."""

LEVELS = {"INFO", "WARN", "ERROR", "DEBUG"}


def parse_line(line):
    raise NotImplementedError


def summarize(path):
    raise NotImplementedError
@@ file /home/user/app.log mode=644 owner=user
2026-01-05 10:00:01 INFO started
2026-01-05 10:00:02 ERROR payment failed order=1001
this line is broken
2026-01-05 10:00:03 WARN slow query 2300ms
2026-01-05 10:00:04 ERROR payment failed order=1002
2026-01-05 10:00:05 TRACE unknown level
2026-01-05 10:00:06 INFO done
@@ file /home/user/test_logparse.py mode=644 owner=user
import unittest
from logparse import parse_line, summarize


class ParseTests(unittest.TestCase):
    def test_good_line(self):
        r = parse_line("2026-01-05 10:00:02 ERROR payment failed order=1001")
        self.assertEqual(r, {"ts": "2026-01-05 10:00:02", "level": "ERROR", "message": "payment failed order=1001"})

    def test_broken_line(self):
        self.assertIsNone(parse_line("this line is broken"))

    def test_unknown_level(self):
        self.assertIsNone(parse_line("2026-01-05 10:00:05 TRACE unknown level"))

    def test_empty_line(self):
        self.assertIsNone(parse_line(""))

    def test_level_without_message(self):
        self.assertEqual(parse_line("2026-01-05 10:00:09 INFO")["message"], "")


class SummaryTests(unittest.TestCase):
    def test_counts(self):
        self.assertEqual(summarize("app.log"), {"INFO": 2, "ERROR": 2, "WARN": 1})


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_logparse.py", "label": "test_logparse.py was not changed"},
 {"t": "unchanged", "path": "/home/user/app.log", "label": "app.log was not changed"}
]
@@ solution
cat > logparse.py <<'EOF'
"""Parse application log lines."""
from collections import Counter

LEVELS = {"INFO", "WARN", "ERROR", "DEBUG"}


def parse_line(line):
    parts = line.strip().split(None, 3)
    if len(parts) < 3 or parts[2] not in LEVELS:
        return None
    return {"ts": parts[0] + " " + parts[1], "level": parts[2], "message": parts[3] if len(parts) > 3 else ""}


def summarize(path):
    counts = Counter()
    with open(path) as f:
        for line in f:
            rec = parse_line(line)
            if rec:
                counts[rec["level"]] += 1
    return dict(counts)
EOF
python3 -m unittest -q
@@ explain
Real input is never perfect. A parser that returns None for a bad line, and a caller that skips it, keeps one broken line from stopping the whole job. Tests for the bad cases are as important as the tests for the good ones.

## Retry a flaky API call
id: py-api-retry
module: python
level: Intermediate
minutes: 25
lesson: python/http-apis-and-json
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Add retries with exponential waiting, and retry only the errors that can go away.
@@ story
`flaky_api.py` simulates a service that fails a few times before it works. Write `fetch_with_retry` in `client.py`. The `sleep` function is passed in, so the tests run instantly and can check the waiting times.
@@ goals
- Retry on ConnectionError and TimeoutError only. Any other error is raised at once.
- Wait base_delay, then twice as long, then twice again (0.5, 1.0, 2.0 by default) between attempts.
- After `retries` retries (so retries + 1 attempts) raise the last error.
- `python3 -m unittest -q` reports OK.
@@ hints
- Look at `flaky_api.py` and at the tests first. The tests record every sleep in a list.
- A loop `for attempt in range(retries + 1)` with `try` and `except (ConnectionError, TimeoutError)` is enough.
- The wait before retry number n (counting from 0) is `base_delay * 2 ** n`. Do not sleep after the last failed attempt.
- A bare `raise` in the last attempt re-raises the original error with its traceback.
@@ world
{}
@@ file /home/user/flaky_api.py mode=644 owner=user
"""A fake service that fails a number of times, then works."""


class FlakyApi:
    def __init__(self, failures, error=ConnectionError):
        self.failures = failures
        self.error = error
        self.calls = 0

    def get(self):
        self.calls += 1
        if self.calls <= self.failures:
            raise self.error("simulated failure %d" % self.calls)
        return {"ok": True}
@@ file /home/user/client.py mode=644 owner=user
"""A small retry helper."""
import time


def fetch_with_retry(call, retries=3, base_delay=0.5, sleep=time.sleep):
    raise NotImplementedError
@@ file /home/user/test_client.py mode=644 owner=user
import unittest
from client import fetch_with_retry
from flaky_api import FlakyApi


class RetryTests(unittest.TestCase):
    def run_it(self, api, **kw):
        sleeps = []
        try:
            result = fetch_with_retry(api.get, sleep=sleeps.append, **kw)
            return result, sleeps, None
        except Exception as e:
            return None, sleeps, e

    def test_works_first_time(self):
        result, sleeps, err = self.run_it(FlakyApi(0))
        self.assertEqual(result, {"ok": True})
        self.assertEqual(sleeps, [])

    def test_recovers_after_two_failures(self):
        api = FlakyApi(2)
        result, sleeps, err = self.run_it(api)
        self.assertEqual(result, {"ok": True})
        self.assertEqual(sleeps, [0.5, 1.0])
        self.assertEqual(api.calls, 3)

    def test_gives_up_and_raises_last_error(self):
        api = FlakyApi(10)
        result, sleeps, err = self.run_it(api)
        self.assertIsInstance(err, ConnectionError)
        self.assertEqual(sleeps, [0.5, 1.0, 2.0])
        self.assertEqual(api.calls, 4)

    def test_timeout_is_retried(self):
        result, sleeps, err = self.run_it(FlakyApi(1, TimeoutError))
        self.assertEqual(result, {"ok": True})

    def test_other_errors_are_not_retried(self):
        api = FlakyApi(5, ValueError)
        result, sleeps, err = self.run_it(api)
        self.assertIsInstance(err, ValueError)
        self.assertEqual(sleeps, [])
        self.assertEqual(api.calls, 1)

    def test_custom_settings(self):
        result, sleeps, err = self.run_it(FlakyApi(3), retries=5, base_delay=1)
        self.assertEqual(sleeps, [1, 2, 4])


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_client.py", "label": "test_client.py was not changed"},
 {"t": "unchanged", "path": "/home/user/flaky_api.py", "label": "flaky_api.py was not changed"}
]
@@ solution
cat > client.py <<'EOF'
"""A small retry helper."""
import time


def fetch_with_retry(call, retries=3, base_delay=0.5, sleep=time.sleep):
    for attempt in range(retries + 1):
        try:
            return call()
        except (ConnectionError, TimeoutError):
            if attempt == retries:
                raise
            sleep(base_delay * 2 ** attempt)
EOF
python3 -m unittest -q
@@ explain
Retries help only for failures that can disappear on their own. Waiting longer each time gives a struggling service room to recover, and giving up after a limit stops a client from hammering it forever. Passing the sleep function in is a small design choice that makes the code testable.

## Build a small command-line tool
id: py-argparse-cli
module: python
level: Intermediate
minutes: 25
lesson: python/writing-command-line-tools
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Use argparse, exit codes and JSON output to turn a function into a proper tool.
@@ story
`slow.py FILE` reads response times (one number per line, in milliseconds) and reports how many are above a threshold. Finish `main(argv)` so it behaves like a real command: options, readable output, JSON output on request, and exit codes that scripts can use.
@@ goals
- `slow.py times.txt` prints `2 of 6 requests above 500 ms` and returns 0.
- `--threshold N` changes the limit. `--json` prints `{"total": 6, "slow": 2, "threshold": 500}`.
- A missing file prints a message to stderr and returns 2.
- `python3 -m unittest -q` reports OK.
@@ hints
- `argparse.ArgumentParser(prog="slow")` with `add_argument("file")`, `add_argument("--threshold", type=float, default=500)` and `add_argument("--json", action="store_true")`.
- `parser.parse_args(argv)` raises SystemExit with code 2 when the arguments are wrong. That is the standard behaviour.
- Print errors with `print(..., file=sys.stderr)` and return the exit code instead of calling sys.exit inside main. The last two lines of the file call sys.exit(main()).
- `json.dumps(dict)` makes the JSON text. Print an integer threshold without .0 by converting whole numbers with int().
@@ world
{}
@@ file /home/user/slow.py mode=644 owner=user
"""Report slow requests."""
import argparse
import json
import sys


def main(argv=None):
    raise NotImplementedError


if __name__ == "__main__":
    sys.exit(main())
@@ file /home/user/times.txt mode=644 owner=user
120
480
950
300
1200
500
@@ file /home/user/test_slow.py mode=644 owner=user
import contextlib
import io
import unittest
from slow import main


def run(args):
    out, err = io.StringIO(), io.StringIO()
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = main(args)
        except SystemExit as e:
            code = e.code
    return code, out.getvalue(), err.getvalue()


class CliTests(unittest.TestCase):
    def test_default(self):
        code, out, err = run(["times.txt"])
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "2 of 6 requests above 500 ms")

    def test_threshold(self):
        code, out, err = run(["times.txt", "--threshold", "400"])
        self.assertEqual(out.strip(), "4 of 6 requests above 400 ms")

    def test_json(self):
        code, out, err = run(["times.txt", "--json"])
        self.assertEqual(out.strip(), '{"total": 6, "slow": 2, "threshold": 500}')

    def test_missing_file(self):
        code, out, err = run(["nope.txt"])
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertIn("nope.txt", err)

    def test_no_arguments(self):
        code, out, err = run([])
        self.assertEqual(code, 2)


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_slow.py", "label": "test_slow.py was not changed"},
 {"t": "cmd", "run": "python3 slow.py times.txt --threshold 1000", "code": 0, "out": "^1 of 6 requests above 1000 ms$", "label": "running the file itself works"},
 {"t": "cmd", "run": "python3 slow.py nope.txt 2>&1", "code": 2, "out": "nope\\.txt", "label": "running the file with a missing input returns status 2"}
]
@@ solution
cat > slow.py <<'EOF'
"""Report slow requests."""
import argparse
import json
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(prog="slow", description="Count slow requests.")
    parser.add_argument("file", help="file with one response time (ms) per line")
    parser.add_argument("--threshold", type=float, default=500)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        with open(args.file) as f:
            times = [float(line) for line in f if line.strip()]
    except OSError as e:
        print("slow: cannot read %s: %s" % (args.file, e.strerror), file=sys.stderr)
        return 2
    limit = int(args.threshold) if args.threshold == int(args.threshold) else args.threshold
    slow = sum(1 for t in times if t > args.threshold)
    if args.json:
        print(json.dumps({"total": len(times), "slow": slow, "threshold": limit}))
    else:
        print("%d of %d requests above %s ms" % (slow, len(times), limit))
    return 0


if __name__ == "__main__":
    sys.exit(main())
EOF
python3 -m unittest -q
@@ explain
A command-line tool has a contract: arguments in, output on stdout, problems on stderr, and an exit code. `main(argv)` takes its arguments as a parameter so tests can call it directly, and returning the exit code keeps the code easy to test.

## Fix the code, not the tests
id: py-tests-fix
module: python
level: Intermediate
minutes: 20
lesson: python/debugging-python
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Three small functions have bugs. The tests are right. Read each failure and fix the code.
@@ story
`stats.py` is used by a monitoring script and has three bugs. The tests in `test_stats.py` describe the correct behaviour and must not be changed. Fix one failure at a time and run the tests after each change.
@@ goals
- Fix `mean`, `percentile` and `human_size` in stats.py.
- `python3 -m unittest -q` reports OK.
- test_stats.py is not edited.
@@ hints
- Run the tests and read only the first failure: expected value, actual value, and the line in your code.
- mean of an empty list must raise ValueError, not ZeroDivisionError.
- percentile uses the nearest-rank method: the value at position ceil(n * p / 100), counting from 1. `math.ceil` helps, and Python lists count from 0.
- human_size divides by 1024, not 1000, and shows one decimal for KB and above. 512 stays `512 B`.
@@ world
{}
@@ file /home/user/stats.py mode=644 owner=user
"""Small statistics helpers."""


def mean(values):
    return sum(values) / len(values)


def percentile(values, p):
    ordered = sorted(values)
    k = int(len(ordered) * p / 100)
    return ordered[k]


def human_size(n):
    units = ["B", "KB", "MB", "GB"]
    size = float(n)
    for unit in units:
        if size < 1000 or unit == units[-1]:
            return "%d %s" % (size, unit) if unit == "B" else "%.1f %s" % (size, unit)
        size /= 1000
@@ file /home/user/test_stats.py mode=644 owner=user
import unittest
from stats import mean, percentile, human_size


class MeanTests(unittest.TestCase):
    def test_mean(self):
        self.assertEqual(mean([2, 4, 6]), 4)

    def test_empty_is_an_error(self):
        with self.assertRaises(ValueError):
            mean([])


class PercentileTests(unittest.TestCase):
    DATA = [15, 20, 35, 40, 50]

    def test_40th(self):
        self.assertEqual(percentile(self.DATA, 40), 20)

    def test_50th(self):
        self.assertEqual(percentile(self.DATA, 50), 35)

    def test_100th_is_the_maximum(self):
        self.assertEqual(percentile(self.DATA, 100), 50)

    def test_unsorted_input(self):
        self.assertEqual(percentile([50, 15, 40, 20, 35], 100), 50)

    def test_single_value(self):
        self.assertEqual(percentile([7], 50), 7)


class HumanSizeTests(unittest.TestCase):
    def test_bytes(self):
        self.assertEqual(human_size(512), "512 B")

    def test_kilobytes(self):
        self.assertEqual(human_size(2048), "2.0 KB")

    def test_megabytes(self):
        self.assertEqual(human_size(5 * 1024 * 1024), "5.0 MB")

    def test_boundary(self):
        self.assertEqual(human_size(1023), "1023 B")
        self.assertEqual(human_size(1024), "1.0 KB")


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_stats.py", "label": "test_stats.py was not changed"}
]
@@ solution
cat > stats.py <<'EOF'
"""Small statistics helpers."""
import math


def mean(values):
    if not values:
        raise ValueError("mean of an empty list")
    return sum(values) / len(values)


def percentile(values, p):
    ordered = sorted(values)
    rank = max(1, math.ceil(len(ordered) * p / 100))
    return ordered[rank - 1]


def human_size(n):
    units = ["B", "KB", "MB", "GB"]
    size = float(n)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return "%d %s" % (size, unit) if unit == "B" else "%.1f %s" % (size, unit)
        size /= 1024
EOF
python3 -m unittest -q
@@ explain
When tests and code disagree, decide which one is right before you change anything. Here the tests state the intended behaviour, so the code changes. Small, targeted fixes and a re-run after each one keep you from fixing one bug and creating another.

## Report config errors clearly
id: py-config-errors
module: python
level: Intermediate
minutes: 25
lesson: python/writing-command-line-tools
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Check a JSON configuration file, raise one clear error type, and turn it into a clean message and exit code.
@@ story
`config.py` loads `app.json`. Today any problem produces a Python traceback. Write `load_config` so that every problem raises `ConfigError` with a clear message, and make `main` print `config error: ...` to stderr and return 2 instead of crashing.
@@ goals
- Raise ConfigError when the file is missing, is not valid JSON, has no `port`, or when the port is not a whole number from 1 to 65535.
- `main(["app.json"])` prints `port=8080` and returns 0 for the good file.
- `main` prints `config error: <message>` on stderr and returns 2 for any ConfigError.
- `python3 -m unittest -q` reports OK.
@@ hints
- Define the error as `class ConfigError(Exception): pass`. One type for all configuration problems lets main handle them in one place.
- `json.JSONDecodeError` and `FileNotFoundError` should be caught and re-raised as ConfigError. `raise ConfigError(...) from e` keeps the cause.
- In Python `True` is also an int. Reject booleans explicitly when you check the port type.
- The message for a missing key should contain the key name, for example `missing required key: port`.
@@ world
{}
@@ file /home/user/config.py mode=644 owner=user
"""Load and check an application config file."""
import json
import sys


class ConfigError(Exception):
    pass


def load_config(path):
    with open(path) as f:
        return json.load(f)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    cfg = load_config(argv[0])
    print("port=%d" % cfg["port"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
@@ file /home/user/app.json mode=644 owner=user
{"port": 8080, "name": "orders"}
@@ file /home/user/bad.json mode=644 owner=user
{"port": 8080,
@@ file /home/user/noport.json mode=644 owner=user
{"name": "orders"}
@@ file /home/user/test_config.py mode=644 owner=user
import contextlib
import io
import json
import os
import tempfile
import unittest
from config import ConfigError, load_config, main


def write(text):
    fd, path = tempfile.mkstemp(suffix=".json")
    os.close(fd)
    with open(path, "w") as f:
        f.write(text)
    return path


class LoadTests(unittest.TestCase):
    def test_good(self):
        self.assertEqual(load_config("app.json")["port"], 8080)

    def test_missing_file(self):
        with self.assertRaises(ConfigError) as cm:
            load_config("does-not-exist.json")
        self.assertIn("does-not-exist.json", str(cm.exception))

    def test_invalid_json(self):
        with self.assertRaises(ConfigError):
            load_config("bad.json")

    def test_missing_port(self):
        with self.assertRaises(ConfigError) as cm:
            load_config("noport.json")
        self.assertIn("port", str(cm.exception))

    def test_port_must_be_a_whole_number(self):
        for bad in ['{"port": "8080"}', '{"port": 80.5}', '{"port": true}', '{"port": null}']:
            with self.subTest(bad=bad):
                with self.assertRaises(ConfigError):
                    load_config(write(bad))

    def test_port_range(self):
        for bad in ['{"port": 0}', '{"port": 70000}', '{"port": -1}']:
            with self.subTest(bad=bad):
                with self.assertRaises(ConfigError):
                    load_config(write(bad))
        self.assertEqual(load_config(write('{"port": 65535}'))["port"], 65535)


class MainTests(unittest.TestCase):
    def run_main(self, args):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = main(args)
        return code, out.getvalue(), err.getvalue()

    def test_ok(self):
        code, out, err = self.run_main(["app.json"])
        self.assertEqual((code, out.strip(), err), (0, "port=8080", ""))

    def test_error_becomes_message_and_status_2(self):
        code, out, err = self.run_main(["noport.json"])
        self.assertEqual(code, 2)
        self.assertEqual(out, "")
        self.assertTrue(err.startswith("config error: "))
        self.assertNotIn("Traceback", err)

    def test_missing_argument(self):
        code, out, err = self.run_main([])
        self.assertEqual(code, 2)


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_config.py", "label": "test_config.py was not changed"},
 {"t": "cmd", "run": "python3 config.py bad.json 2>&1", "code": 2, "out": "config error: ", "notOut": "Traceback", "label": "running the file on a broken config gives a clean message"}
]
@@ solution
cat > config.py <<'EOF'
"""Load and check an application config file."""
import json
import sys


class ConfigError(Exception):
    pass


def load_config(path):
    try:
        with open(path) as f:
            cfg = json.load(f)
    except FileNotFoundError as e:
        raise ConfigError("file not found: %s" % path) from e
    except json.JSONDecodeError as e:
        raise ConfigError("%s is not valid JSON (%s)" % (path, e.msg)) from e
    if not isinstance(cfg, dict) or "port" not in cfg:
        raise ConfigError("missing required key: port")
    port = cfg["port"]
    if isinstance(port, bool) or not isinstance(port, int):
        raise ConfigError("port must be a whole number")
    if not 1 <= port <= 65535:
        raise ConfigError("port must be between 1 and 65535")
    return cfg


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if not argv:
        print("config error: usage: config.py FILE", file=sys.stderr)
        return 2
    try:
        cfg = load_config(argv[0])
    except ConfigError as e:
        print("config error: %s" % e, file=sys.stderr)
        return 2
    print("port=%d" % cfg["port"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
EOF
python3 -m unittest -q
@@ explain
Users should see what to fix, not a stack trace. One error type for expected problems, caught in one place, gives clean messages and a predictable exit code. Unexpected bugs still produce tracebacks, which is what you want for those.
