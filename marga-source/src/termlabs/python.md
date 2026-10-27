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

## Total a CSV by category
id: py-csv-totals
module: python
level: Beginner
minutes: 15
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Read a CSV with the csv module and add up values per group.
@@ story
`expenses.py` must read a CSV file with the columns `category,amount` and return the total per category. The tests in `test_expenses.py` describe the exact behaviour, including how bad rows are handled.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_expenses.py is not edited.
@@ hints
- Run `python3 -m unittest -q 2>&1 | head -30` and read the first failure.
- `csv.DictReader(f)` yields one dict per row. Amounts are text, so convert with `float(...)`.
- A plain dict with `totals[cat] = totals.get(cat, 0) + amount` is enough. Skip rows whose amount is not a number.
@@ world
{}
@@ file /home/user/expenses.py mode=644 owner=user
"""Add up expenses by category."""
import csv


def totals(path):
    """Return {category: total} for a CSV file with category,amount columns."""
    raise NotImplementedError
@@ file /home/user/test_expenses.py mode=644 owner=user
import os
import tempfile
import unittest
from expenses import totals


def write(text):
    d = tempfile.mkdtemp()
    p = os.path.join(d, "e.csv")
    with open(p, "w") as f:
        f.write(text)
    return p


class TotalsTests(unittest.TestCase):
    def test_groups_and_sums(self):
        p = write("category,amount\nfood,10.5\nrent,500\nfood,4.5\n")
        self.assertEqual(totals(p), {"food": 15.0, "rent": 500.0})

    def test_skips_bad_amounts(self):
        p = write("category,amount\nfood,abc\nfood,2\n,5\n")
        self.assertEqual(totals(p), {"food": 2.0})

    def test_empty_file_has_no_totals(self):
        self.assertEqual(totals(write("category,amount\n")), {})


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_expenses.py", "label": "test_expenses.py was not changed"}
]
@@ solution
cat > expenses.py <<'EOF'
"""Add up expenses by category."""
import csv


def totals(path):
    out = {}
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            cat = (row.get("category") or "").strip()
            try:
                amount = float(row.get("amount"))
            except (TypeError, ValueError):
                continue
            if not cat:
                continue
            out[cat] = out.get(cat, 0.0) + amount
    return out
EOF
python3 -m unittest -q
@@ explain
Reading data is easy; deciding what to do with bad rows is the real work. Tests that state the rule (skip the row, do not crash) keep a nightly report from failing because of one typo.

## Merge defaults with overrides
id: py-config-merge
module: python
level: Intermediate
minutes: 20
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Combine two nested dictionaries without changing the originals.
@@ story
`merge.py` must combine a defaults dictionary with an overrides dictionary, as configuration systems do. Nested dictionaries are merged key by key, any other value in the overrides wins, and the inputs must not be modified.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_merge.py is not edited.
@@ hints
- Run the tests and start with the simplest failing one.
- Recurse when both values are dictionaries: `if isinstance(a, dict) and isinstance(b, dict): merge(a, b)`.
- Build a new dict, for example `out = dict(defaults)`, and use `copy.deepcopy` so nested values are not shared with the input.
@@ world
{}
@@ file /home/user/merge.py mode=644 owner=user
"""Merge configuration dictionaries."""
import copy


def merge(defaults, overrides):
    """Return a new dict: overrides applied on top of defaults, recursively."""
    raise NotImplementedError
@@ file /home/user/test_merge.py mode=644 owner=user
import unittest
from merge import merge


class MergeTests(unittest.TestCase):
    def test_override_wins(self):
        self.assertEqual(merge({"a": 1, "b": 2}, {"b": 3}), {"a": 1, "b": 3})

    def test_new_keys_are_added(self):
        self.assertEqual(merge({"a": 1}, {"c": 9}), {"a": 1, "c": 9})

    def test_nested_dicts_are_merged(self):
        d = {"db": {"host": "x", "port": 1}}
        o = {"db": {"port": 2}}
        self.assertEqual(merge(d, o), {"db": {"host": "x", "port": 2}})

    def test_inputs_are_not_changed(self):
        d = {"db": {"host": "x"}}
        o = {"db": {"port": 2}}
        merge(d, o)
        self.assertEqual(d, {"db": {"host": "x"}})
        self.assertEqual(o, {"db": {"port": 2}})

    def test_result_does_not_share_nested_objects(self):
        d = {"db": {"host": "x"}}
        r = merge(d, {})
        r["db"]["host"] = "changed"
        self.assertEqual(d["db"]["host"], "x")


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_merge.py", "label": "test_merge.py was not changed"}
]
@@ solution
cat > merge.py <<'EOF'
"""Merge configuration dictionaries."""
import copy


def merge(defaults, overrides):
    out = copy.deepcopy(defaults)
    for key, value in overrides.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = merge(out[key], value)
        else:
            out[key] = copy.deepcopy(value)
    return out
EOF
python3 -m unittest -q
@@ explain
Layered configuration (defaults, then file, then environment) is everywhere in operations. Copying instead of modifying in place avoids a classic bug where one caller changes the shared defaults for everyone else.

## Count the busiest words
id: py-word-count
module: python
level: Beginner
minutes: 15
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Use Counter to rank words in a text and ignore case and punctuation.
@@ story
`words.py` must report the most common words in a piece of text. Words are compared without regard to case, punctuation is ignored, and ties are listed alphabetically so the output is stable.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_words.py is not edited.
@@ hints
- Run the tests and read the first failure.
- `re.findall(r"[a-z0-9]+", text.lower())` extracts the words.
- `collections.Counter` counts them. Sort with `sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))` for count descending, then name.
@@ world
{}
@@ file /home/user/words.py mode=644 owner=user
"""Find the most common words."""
import re
from collections import Counter


def top_words(text, n=3):
    """Return a list of (word, count) for the n most common words."""
    raise NotImplementedError
@@ file /home/user/test_words.py mode=644 owner=user
import unittest
from words import top_words


class TopWordsTests(unittest.TestCase):
    def test_counts_and_orders(self):
        self.assertEqual(top_words("b a b c b a", 2), [("b", 3), ("a", 2)])

    def test_ignores_case_and_punctuation(self):
        self.assertEqual(top_words("Error, error! ERROR: ok.", 1), [("error", 3)])

    def test_ties_are_alphabetical(self):
        self.assertEqual(top_words("pear apple fig", 3), [("apple", 1), ("fig", 1), ("pear", 1)])

    def test_fewer_words_than_n(self):
        self.assertEqual(top_words("one", 5), [("one", 1)])

    def test_empty_text(self):
        self.assertEqual(top_words("", 3), [])


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_words.py", "label": "test_words.py was not changed"}
]
@@ solution
cat > words.py <<'EOF'
"""Find the most common words."""
import re
from collections import Counter


def top_words(text, n=3):
    words = re.findall(r"[a-z0-9]+", text.lower())
    counts = Counter(words)
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return ranked[:n]
EOF
python3 -m unittest -q
@@ explain
Counting is the first step of most log analysis. A stable tie-break (here the alphabet) matters in operations, because reports that change order between runs look like changes in the system.

## Parse a service URL
id: py-url-parse
module: python
level: Intermediate
minutes: 20
lesson: python/http-apis-and-json
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Split a URL into parts with urllib and validate it.
@@ story
`endpoint.py` receives service addresses such as `https://api.example.com:8443/v1/items?limit=10&sort=name`. It must return the pieces in a dictionary, fill in default ports, and reject addresses that are not http or https.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_endpoint.py is not edited.
@@ hints
- `urllib.parse.urlparse(url)` gives `.scheme`, `.hostname`, `.port`, `.path` and `.query`.
- `urllib.parse.parse_qs` turns the query into lists; take the first value of each key.
- Raise `ValueError` for other schemes or a missing host. Default ports: 80 for http and 443 for https.
@@ world
{}
@@ file /home/user/endpoint.py mode=644 owner=user
"""Parse service URLs."""
from urllib.parse import urlparse, parse_qs


def parse(url):
    """Return a dict with scheme, host, port, path and query."""
    raise NotImplementedError
@@ file /home/user/test_endpoint.py mode=644 owner=user
import unittest
from endpoint import parse


class ParseTests(unittest.TestCase):
    def test_full_url(self):
        r = parse("https://api.example.com:8443/v1/items?limit=10&sort=name")
        self.assertEqual(r, {"scheme": "https", "host": "api.example.com", "port": 8443, "path": "/v1/items", "query": {"limit": "10", "sort": "name"}})

    def test_default_ports(self):
        self.assertEqual(parse("http://a.example/")["port"], 80)
        self.assertEqual(parse("https://a.example/")["port"], 443)

    def test_empty_path_becomes_slash(self):
        self.assertEqual(parse("http://a.example")["path"], "/")

    def test_no_query_gives_empty_dict(self):
        self.assertEqual(parse("http://a.example/x")["query"], {})

    def test_rejects_other_schemes(self):
        with self.assertRaises(ValueError):
            parse("ftp://a.example/")

    def test_rejects_missing_host(self):
        with self.assertRaises(ValueError):
            parse("http:///path")


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_endpoint.py", "label": "test_endpoint.py was not changed"}
]
@@ solution
cat > endpoint.py <<'EOF'
"""Parse service URLs."""
from urllib.parse import urlparse, parse_qs


def parse(url):
    u = urlparse(url)
    if u.scheme not in ("http", "https"):
        raise ValueError("unsupported scheme: %r" % u.scheme)
    if not u.hostname:
        raise ValueError("missing host")
    port = u.port or (443 if u.scheme == "https" else 80)
    query = {k: v[0] for k, v in parse_qs(u.query).items()}
    return {"scheme": u.scheme, "host": u.hostname, "port": port, "path": u.path or "/", "query": query}
EOF
python3 -m unittest -q
@@ explain
Parsing with the standard library is safer than splitting strings yourself, because URLs have many edge cases. Failing early with a clear ValueError beats sending a request to a broken address later.

## Keep only the newest backups
id: py-keep-newest
module: python
level: Intermediate
minutes: 20
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Delete old files in a folder but keep the N most recently modified.
@@ story
`prune.py` cleans a backup folder. `prune(folder, keep)` must keep the `keep` most recently modified files, delete the others, and return the names it deleted, oldest first. Sub-folders are never touched.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_prune.py is not edited.
@@ hints
- Run the tests and read the first failure.
- `os.stat(path).st_mtime` is the modification time. Sort the files by it.
- List only files with `os.path.isfile`. The oldest are `files[:-keep]` when sorted oldest to newest. Take care when keep is 0.
@@ world
{}
@@ file /home/user/prune.py mode=644 owner=user
"""Prune old backup files."""
import os


def prune(folder, keep):
    """Delete all but the newest `keep` files. Return deleted names, oldest first."""
    raise NotImplementedError
@@ file /home/user/test_prune.py mode=644 owner=user
import os
import tempfile
import unittest
from prune import prune


def make(d, names):
    for i, n in enumerate(names):
        p = os.path.join(d, n)
        open(p, "w").close()
        os.utime(p, (1000 + i, 1000 + i))


class PruneTests(unittest.TestCase):
    def test_keeps_newest(self):
        with tempfile.TemporaryDirectory() as d:
            make(d, ["a", "b", "c", "d"])
            self.assertEqual(prune(d, 2), ["a", "b"])
            self.assertEqual(sorted(os.listdir(d)), ["c", "d"])

    def test_nothing_to_delete(self):
        with tempfile.TemporaryDirectory() as d:
            make(d, ["a", "b"])
            self.assertEqual(prune(d, 5), [])
            self.assertEqual(sorted(os.listdir(d)), ["a", "b"])

    def test_keep_zero_removes_all_files(self):
        with tempfile.TemporaryDirectory() as d:
            make(d, ["a", "b"])
            self.assertEqual(prune(d, 0), ["a", "b"])
            self.assertEqual(os.listdir(d), [])

    def test_folders_are_left_alone(self):
        with tempfile.TemporaryDirectory() as d:
            make(d, ["a", "b"])
            os.mkdir(os.path.join(d, "sub"))
            prune(d, 1)
            self.assertIn("sub", os.listdir(d))


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_prune.py", "label": "test_prune.py was not changed"}
]
@@ solution
cat > prune.py <<'EOF'
"""Prune old backup files."""
import os


def prune(folder, keep):
    paths = [os.path.join(folder, n) for n in os.listdir(folder)]
    files = [p for p in paths if os.path.isfile(p)]
    files.sort(key=lambda p: (os.stat(p).st_mtime, p))
    old = files[:len(files) - keep] if keep < len(files) else []
    for p in old:
        os.remove(p)
    return [os.path.basename(p) for p in old]
EOF
python3 -m unittest -q
@@ explain
Retention code deletes data, so it deserves tests for the edges: nothing to delete, keep zero, and things that are not files. The slice `files[:-keep]` is wrong when keep is 0, which is exactly why the test exists.

## Validate ports and hosts
id: py-validate-input
module: python
level: Beginner
minutes: 15
lesson: python/debugging-python
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Write small validators that raise clear errors for bad input.
@@ story
`validate.py` checks values that come from configuration files. `port(value)` accepts an int or a numeric string between 1 and 65535 and returns an int. `host(value)` accepts a non-empty host name made of letters, digits, dots and hyphens and returns it in lowercase. Bad input raises `ValueError` with a message that names the problem.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_validate.py is not edited.
@@ hints
- Run the tests and read what each one expects.
- `int(value)` raises ValueError for text such as "abc". Catch it and raise your own message, or let the range check do the work.
- `re.fullmatch(r"[a-z0-9.-]+", value)` checks the characters after `value.strip().lower()`. Reject names that start or end with a hyphen or dot.
@@ world
{}
@@ file /home/user/validate.py mode=644 owner=user
"""Validate configuration values."""
import re


def port(value):
    """Return the port as int or raise ValueError."""
    raise NotImplementedError


def host(value):
    """Return the host name in lowercase or raise ValueError."""
    raise NotImplementedError
@@ file /home/user/test_validate.py mode=644 owner=user
import unittest
from validate import port, host


class PortTests(unittest.TestCase):
    def test_accepts_int_and_text(self):
        self.assertEqual(port(8080), 8080)
        self.assertEqual(port("443"), 443)

    def test_range_limits(self):
        self.assertEqual(port(1), 1)
        self.assertEqual(port(65535), 65535)
        for bad in (0, 65536, -1):
            with self.assertRaises(ValueError):
                port(bad)

    def test_rejects_text(self):
        with self.assertRaises(ValueError) as cm:
            port("abc")
        self.assertIn("port", str(cm.exception))

    def test_rejects_none(self):
        with self.assertRaises(ValueError):
            port(None)


class HostTests(unittest.TestCase):
    def test_lowercases(self):
        self.assertEqual(host(" Web-01.Example.COM "), "web-01.example.com")

    def test_rejects_empty(self):
        with self.assertRaises(ValueError):
            host("   ")

    def test_rejects_bad_characters(self):
        for bad in ("a b", "a_b", "a/b", "-start", "end-", ".dot"):
            with self.assertRaises(ValueError):
                host(bad)


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_validate.py", "label": "test_validate.py was not changed"}
]
@@ solution
cat > validate.py <<'EOF'
"""Validate configuration values."""
import re


def port(value):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise ValueError("port must be a number, got %r" % (value,))
    if not 1 <= number <= 65535:
        raise ValueError("port must be between 1 and 65535, got %d" % number)
    return number


def host(value):
    text = str(value).strip().lower()
    if not text:
        raise ValueError("host must not be empty")
    if not re.fullmatch(r"[a-z0-9]([a-z0-9.-]*[a-z0-9])?", text):
        raise ValueError("host has invalid characters: %r" % text)
    return text
EOF
python3 -m unittest -q
@@ explain
Validate at the edge, where data enters, and say what is wrong in the message. A clear error at start-up is much cheaper than a confusing failure an hour into a deployment.

## Remove duplicates, keep the order
id: py-dedupe-order
module: python
level: Beginner
minutes: 10
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Remove repeated items from a list without changing the order of first appearance.
@@ story
`dedupe.py` receives lists such as host names collected from several sources. `dedupe(items)` must return a new list without repeats, keeping the first occurrence of each item in its original place. The input must not be changed.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_dedupe.py is not edited.
@@ hints
- Run the tests and read the first failure.
- A set remembers what you have seen: `seen = set()`; add each item as you go.
- Build a new list in a loop, and only append items that are not yet in `seen`. Items may be strings or numbers.
@@ world
{}
@@ file /home/user/dedupe.py mode=644 owner=user
"""Remove duplicates, keep order."""


def dedupe(items):
    """Return a new list with repeats removed, first occurrence kept."""
    raise NotImplementedError
@@ file /home/user/test_dedupe.py mode=644 owner=user
import unittest
from dedupe import dedupe


class DedupeTests(unittest.TestCase):
    def test_keeps_first_occurrence(self):
        self.assertEqual(dedupe(["b", "a", "b", "c", "a"]), ["b", "a", "c"])

    def test_numbers(self):
        self.assertEqual(dedupe([3, 1, 3, 2, 1]), [3, 1, 2])

    def test_empty(self):
        self.assertEqual(dedupe([]), [])

    def test_input_is_not_changed(self):
        data = ["x", "x", "y"]
        dedupe(data)
        self.assertEqual(data, ["x", "x", "y"])

    def test_works_on_any_iterable(self):
        self.assertEqual(dedupe(iter("aabbc")), ["a", "b", "c"])


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_dedupe.py", "label": "test_dedupe.py was not changed"}
]
@@ solution
cat > dedupe.py <<'EOF'
"""Remove duplicates, keep order."""


def dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item not in seen:
            seen.add(item)
            out.append(item)
    return out
EOF
python3 -m unittest -q
@@ explain
A plain set() loses the order, and sorting would change it. Remembering what you have seen while you build a new list keeps the order and costs one pass.

## Parse durations like 1h30m
id: py-parse-duration
module: python
level: Intermediate
minutes: 20
lesson: python/debugging-python
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Convert text such as 2h, 45m or 1h30m15s into seconds, rejecting nonsense.
@@ story
`duration.py` reads time limits from configuration. `to_seconds(text)` accepts hours, minutes and seconds written as `1h`, `45m`, `30s` or combined in that order, such as `1h30m15s`. It returns the total number of seconds as an int. Anything else raises `ValueError`.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_duration.py is not edited.
@@ hints
- Run the tests and read the first failure.
- `re.fullmatch(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?", text)` matches all the valid forms. Groups that did not match are None.
- An empty string also matches that pattern, so reject it separately. Compute `h*3600 + m*60 + s`.
@@ world
{}
@@ file /home/user/duration.py mode=644 owner=user
"""Parse time limits."""
import re


def to_seconds(text):
    """Return the duration in seconds or raise ValueError."""
    raise NotImplementedError
@@ file /home/user/test_duration.py mode=644 owner=user
import unittest
from duration import to_seconds


class DurationTests(unittest.TestCase):
    def test_single_units(self):
        self.assertEqual(to_seconds("2h"), 7200)
        self.assertEqual(to_seconds("45m"), 2700)
        self.assertEqual(to_seconds("30s"), 30)

    def test_combined(self):
        self.assertEqual(to_seconds("1h30m15s"), 5415)
        self.assertEqual(to_seconds("1h5s"), 3605)

    def test_rejects_bad_text(self):
        for bad in ("", "abc", "10", "5x", "1m2h", "-5m", "1.5h", " 5m"):
            with self.assertRaises(ValueError):
                to_seconds(bad)

    def test_rejects_non_text(self):
        with self.assertRaises(ValueError):
            to_seconds(None)


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_duration.py", "label": "test_duration.py was not changed"}
]
@@ solution
cat > duration.py <<'EOF'
"""Parse time limits."""
import re

PATTERN = re.compile(r"(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?")


def to_seconds(text):
    if not isinstance(text, str) or not text:
        raise ValueError("duration must be a non-empty string")
    m = PATTERN.fullmatch(text)
    if not m:
        raise ValueError("bad duration: %r" % text)
    h, mi, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mi * 60 + s
EOF
python3 -m unittest -q
@@ explain
A regular expression with optional groups describes every valid shape at once. The empty string matches it too, which is why the explicit check exists, and fullmatch makes sure nothing extra is left over.

## Read settings from the environment
id: py-env-settings
module: python
level: Intermediate
minutes: 15
lesson: python/writing-command-line-tools
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Load typed settings from environment variables with defaults and clear errors.
@@ story
`settings.py` follows the twelve-factor habit of reading configuration from the environment. `load()` returns a dict with `port` (int, default 8080, from PORT), `debug` (bool, default False, from DEBUG where `1`, `true` or `yes` in any case mean True) and `name` (text, required, from APP_NAME). A missing APP_NAME or a PORT that is not a number raises `ValueError`.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_settings.py is not edited.
@@ hints
- Run the tests and read the first failure.
- `os.environ.get("PORT", "8080")` gives text. Convert it with `int(...)` and wrap the error in your own `ValueError` message.
- `os.environ.get("DEBUG", "").lower() in ("1", "true", "yes")` handles the flag.
@@ world
{}
@@ file /home/user/settings.py mode=644 owner=user
"""Application settings from the environment."""
import os


def load():
    """Return {"port": int, "debug": bool, "name": str}."""
    raise NotImplementedError
@@ file /home/user/test_settings.py mode=644 owner=user
import os
import unittest
from unittest import mock
from settings import load


def env(**kw):
    return mock.patch.dict(os.environ, kw, clear=True)


class SettingsTests(unittest.TestCase):
    def test_defaults(self):
        with env(APP_NAME="shop"):
            self.assertEqual(load(), {"port": 8080, "debug": False, "name": "shop"})

    def test_values_are_converted(self):
        with env(APP_NAME="shop", PORT="9000", DEBUG="TRUE"):
            self.assertEqual(load(), {"port": 9000, "debug": True, "name": "shop"})

    def test_debug_off_values(self):
        for v in ("0", "false", "no", ""):
            with env(APP_NAME="x", DEBUG=v):
                self.assertFalse(load()["debug"])

    def test_name_is_required(self):
        with env():
            with self.assertRaises(ValueError) as cm:
                load()
            self.assertIn("APP_NAME", str(cm.exception))

    def test_bad_port(self):
        with env(APP_NAME="x", PORT="eighty"):
            with self.assertRaises(ValueError) as cm:
                load()
            self.assertIn("PORT", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_settings.py", "label": "test_settings.py was not changed"}
]
@@ solution
cat > settings.py <<'EOF'
"""Application settings from the environment."""
import os


def load():
    name = os.environ.get("APP_NAME")
    if not name:
        raise ValueError("APP_NAME is required")
    raw = os.environ.get("PORT", "8080")
    try:
        port = int(raw)
    except ValueError:
        raise ValueError("PORT must be a number, got %r" % raw)
    debug = os.environ.get("DEBUG", "").lower() in ("1", "true", "yes")
    return {"port": port, "debug": debug, "name": name}
EOF
python3 -m unittest -q
@@ explain
Environment variables are always text, so conversion and validation belong in one place that runs at start-up. Failing fast with the name of the variable saves the on-call engineer from guessing which setting was wrong.

## Count log levels from JSON lines
id: py-json-lines
module: python
level: Intermediate
minutes: 20
lesson: python/files-and-processes
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Read a JSON-lines log, count the levels, and skip lines that are damaged.
@@ story
`jsonlog.py` reads application logs that contain one JSON object per line, for example `{"level": "ERROR", "msg": "x"}`. `count_levels(path)` returns a dict of level to count. Blank lines and lines that are not valid JSON objects are skipped. A missing `level` counts as `UNKNOWN`. The file is read line by line, never all at once.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_jsonlog.py is not edited.
@@ hints
- Run the tests and read the first failure.
- Loop over the open file: `for line in f:`. Skip blank lines with `line.strip()`.
- `json.loads` raises `json.JSONDecodeError` (a ValueError) for bad lines, and a valid line might not be a dict, so check `isinstance(obj, dict)`.
@@ world
{}
@@ file /home/user/jsonlog.py mode=644 owner=user
"""Summarise JSON-lines logs."""
import json


def count_levels(path):
    """Return {level: count}."""
    raise NotImplementedError
@@ file /home/user/test_jsonlog.py mode=644 owner=user
import os
import tempfile
import unittest
from jsonlog import count_levels


def write(text):
    d = tempfile.mkdtemp()
    p = os.path.join(d, "app.log")
    with open(p, "w") as f:
        f.write(text)
    return p


class CountTests(unittest.TestCase):
    def test_counts(self):
        p = write('{"level": "INFO"}\n{"level": "ERROR"}\n{"level": "INFO"}\n')
        self.assertEqual(count_levels(p), {"INFO": 2, "ERROR": 1})

    def test_skips_damaged_and_blank_lines(self):
        p = write('{"level": "INFO"}\n\nnot json\n[1, 2]\n"text"\n{"level": "INFO"}\n')
        self.assertEqual(count_levels(p), {"INFO": 2})

    def test_missing_level(self):
        p = write('{"msg": "hi"}\n')
        self.assertEqual(count_levels(p), {"UNKNOWN": 1})

    def test_empty_file(self):
        self.assertEqual(count_levels(write("")), {})


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_jsonlog.py", "label": "test_jsonlog.py was not changed"}
]
@@ solution
cat > jsonlog.py <<'EOF'
"""Summarise JSON-lines logs."""
import json


def count_levels(path):
    counts = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except ValueError:
                continue
            if not isinstance(obj, dict):
                continue
            level = str(obj.get("level", "UNKNOWN"))
            counts[level] = counts.get(level, 0) + 1
    return counts
EOF
python3 -m unittest -q
@@ explain
Logs are messy: a crash can cut the last line in half. Reading line by line keeps memory flat for huge files, and tolerating bad lines means one damaged record does not stop the whole report.

## Process items in batches
id: py-batches
module: python
level: Intermediate
minutes: 15
lesson: python/debugging-python
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Write a generator that yields fixed-size batches, for APIs that accept limited requests.
@@ story
`batches.py` helps send many items to an API that accepts at most N per request. `batches(items, size)` is a generator that yields lists of up to `size` items, in order. The last batch may be shorter. A size below 1 raises `ValueError` when the generator is first used. It must work on any iterable, including generators.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_batches.py is not edited.
@@ hints
- Run the tests and read the first failure.
- Collect items in a list; when it reaches `size`, `yield` it and start a new one. After the loop, yield what is left if it is not empty.
- Check `size` at the start of the function body, before the first yield.
@@ world
{}
@@ file /home/user/batches.py mode=644 owner=user
"""Split work into batches."""


def batches(items, size):
    """Yield lists of at most `size` items."""
    raise NotImplementedError
@@ file /home/user/test_batches.py mode=644 owner=user
import unittest
from batches import batches


class BatchTests(unittest.TestCase):
    def test_splits_evenly(self):
        self.assertEqual(list(batches([1, 2, 3, 4], 2)), [[1, 2], [3, 4]])

    def test_last_batch_is_shorter(self):
        self.assertEqual(list(batches(range(5), 2)), [[0, 1], [2, 3], [4]])

    def test_empty_input(self):
        self.assertEqual(list(batches([], 3)), [])

    def test_is_lazy(self):
        def source():
            yield 1
            yield 2
            raise RuntimeError("read too far")
        g = batches(source(), 2)
        self.assertEqual(next(g), [1, 2])

    def test_bad_size(self):
        with self.assertRaises(ValueError):
            list(batches([1], 0))


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_batches.py", "label": "test_batches.py was not changed"}
]
@@ solution
cat > batches.py <<'EOF'
"""Split work into batches."""


def batches(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    batch = []
    for item in items:
        batch.append(item)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch
EOF
python3 -m unittest -q
@@ explain
A generator produces one batch at a time, so a million items never sit in memory together. The laziness test shows that the function does not read ahead of what it has been asked for.

## Sort version numbers correctly
id: py-version-sort
module: python
level: Intermediate
minutes: 15
lesson: python/debugging-python
engine: Simulated shell with real Python (Pyodide in the browser)
summary: Sort versions like 1.10.0 and 1.9.2 as numbers, not as text.
@@ story
`versions.py` picks the newest release from a list. `parse(text)` turns `1.10.2` into the tuple `(1, 10, 2)`; an optional leading `v` is accepted. `newest(items)` returns the highest version as it was written. `sort_versions(items)` returns the list from oldest to newest. Invalid versions raise `ValueError`.
@@ goals
- `python3 -m unittest -q` reports OK.
- test_versions.py is not edited.
@@ hints
- Run the tests and read the first failure.
- Strip a leading v, split on dots and convert each part with `int(...)`. Wrong shapes raise ValueError (for example `1.x` or an empty string).
- Sort with `key=parse`. Tuples compare number by number, so `(1, 10, 0) > (1, 9, 2)`.
@@ world
{}
@@ file /home/user/versions.py mode=644 owner=user
"""Compare release versions."""


def parse(text):
    """Return the version as a tuple of ints."""
    raise NotImplementedError


def sort_versions(items):
    """Return the versions sorted from oldest to newest."""
    raise NotImplementedError


def newest(items):
    """Return the highest version, as written."""
    raise NotImplementedError
@@ file /home/user/test_versions.py mode=644 owner=user
import unittest
from versions import parse, sort_versions, newest


class VersionTests(unittest.TestCase):
    def test_parse(self):
        self.assertEqual(parse("1.10.2"), (1, 10, 2))
        self.assertEqual(parse("v2.0"), (2, 0))

    def test_numbers_not_text(self):
        self.assertEqual(sort_versions(["1.9.2", "1.10.0", "1.2.0"]), ["1.2.0", "1.9.2", "1.10.0"])

    def test_newest_keeps_the_original_text(self):
        self.assertEqual(newest(["v1.2.0", "v1.10.1", "v1.9.9"]), "v1.10.1")

    def test_input_is_not_changed(self):
        data = ["2.0", "1.0"]
        sort_versions(data)
        self.assertEqual(data, ["2.0", "1.0"])

    def test_bad_versions(self):
        for bad in ("", "1.x", "1..2", "latest"):
            with self.assertRaises(ValueError):
                parse(bad)

    def test_newest_of_nothing(self):
        with self.assertRaises(ValueError):
            newest([])


if __name__ == "__main__":
    unittest.main()
@@ checks
[
 {"t": "cmd", "run": "python3 -m unittest -q 2>&1", "code": 0, "out": "OK", "label": "all the tests pass"},
 {"t": "unchanged", "path": "/home/user/test_versions.py", "label": "test_versions.py was not changed"}
]
@@ solution
cat > versions.py <<'EOF'
"""Compare release versions."""


def parse(text):
    if not isinstance(text, str):
        raise ValueError("version must be text")
    t = text[1:] if text.startswith("v") else text
    parts = t.split(".")
    if not t or not all(p.isdigit() for p in parts):
        raise ValueError("bad version: %r" % text)
    return tuple(int(p) for p in parts)


def sort_versions(items):
    return sorted(items, key=parse)


def newest(items):
    if not items:
        raise ValueError("no versions given")
    return max(items, key=parse)
EOF
python3 -m unittest -q
@@ explain
Version numbers are not decimals and not text: "1.10" is newer than "1.9". Converting to a tuple of integers makes the standard comparison do the right thing, and keeping the original text in the result avoids changing what the user wrote.
