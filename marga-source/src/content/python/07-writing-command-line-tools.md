---
title: Writing command-line tools in Python
minutes: 13
summary: Build a clear, testable command-line tool with argparse, structured output, logging, exit codes and configuration from the environment, ready to be packaged and shared.
---

Many operations scripts start as twenty lines and grow into tools that a whole team runs. A good command-line tool is predictable: it has help text, validates input, logs sensibly, returns the right exit code and can be tested. Python's standard library gives you everything you need to get there.

## What you will learn

- Defining arguments and subcommands with `argparse`
- Reading configuration from options, environment variables and files
- Human and machine-readable output
- Logging, exit codes and error handling
- Testing a command-line tool and packaging an entry point

## Arguments with argparse

```python
import argparse, logging, sys

def build_parser():
    p = argparse.ArgumentParser(prog="svcctl", description="Inspect services")
    p.add_argument("-v", "--verbose", action="store_true", help="show debug logs")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("status", help="show service status")
    s.add_argument("name")
    s.add_argument("--json", action="store_true", help="machine-readable output")
    s.add_argument("--timeout", type=float, default=5.0)
    return p

def main(argv=None):
    args = build_parser().parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.WARNING,
                        format="%(levelname)s %(message)s", stream=sys.stderr)
    try:
        return run(args)
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        logging.error("%s", exc)
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

`argparse` builds `--help`, checks types and rejects unknown options with exit code 2. Taking `argv` as a parameter makes `main` easy to test.

## Configuration order

Use this order of precedence: command-line option, then environment variable, then a config file, then a default. Document it. Read secrets from the environment or a secret store, never from a flag (flags show up in process lists and shell history).

```python
import os
token = os.environ.get("SVC_TOKEN")
if not token:
    raise SystemExit("SVC_TOKEN is not set")
```

## Output

Print results to standard output and logs and errors to standard error. Offer `--json` for scripts and a readable table for people. Never mix log lines into JSON output. Keep field names stable, because other tools will depend on them.

## Exit codes

0 means success, 1 a general failure, 2 a usage error (the `argparse` default) and 130 an interrupt. If your tool is used in checks, define extra codes (for example 3 for "degraded") and document them.

## Testing

```python
def test_status_json(capsys, monkeypatch):
    monkeypatch.setattr("svcctl.fetch", lambda name, timeout: {"name": name, "ok": True})
    code = main(["status", "web", "--json"])
    out = capsys.readouterr().out
    assert code == 0 and '"ok": true' in out
```

Test the function, not the process. Use `subprocess` only for a small number of end-to-end checks.

## Packaging

In `pyproject.toml`, add `[project.scripts]` with `svcctl = "svcctl.cli:main"`. Installing the package (preferably with `pipx`) creates a `svcctl` command. Pin dependencies in a lock file and include a version flag (`--version`).

```predict
Q: A user runs your tool as `svcctl status` with no name. What should happen?
???
argparse prints a usage error to standard error and exits with code 2.
> Required arguments are validated before your code runs, so no custom handling is needed.
```

## Incident: the JSON that wasn't JSON

> **Incident:** A monitoring job that parses the tool's `--json` output starts failing after a release.

```console
$ svcctl status web --json | head -2
INFO connecting to web
{"name": "web", "ok": true}
```

A new log line went to standard output and broke the parser. The fix sent logs to standard error, added a test that parses the output as JSON, and documented that standard output contains only the result.

## Common mistakes

- Printing logs on standard output
- Secrets passed as flags
- Unclear exit codes
- Code in `if __name__` blocks that cannot be tested

```quiz
Q: What exit code does argparse use for bad usage?
- 0 :: That means success.
- 1 :: A general failure.
+ 2
- 255 :: Not the default.
> Code 2 is the conventional usage error.

Q: Why take argv as a parameter of main?
+ So tests can call main with a list of arguments
- To make it faster :: No speed change.
- To hide options :: No.
- To avoid logging :: Unrelated.
> It separates the logic from the process arguments.

Q: Where should log messages go in a tool that prints JSON results?
- Standard output :: It corrupts the JSON.
+ Standard error
- The same line :: It corrupts the data.
- Nowhere :: You need diagnostics.
> Keeping streams separate allows pipes and parsers to work.

Q: Why avoid passing secrets as command-line flags?
+ They appear in process lists and shell history
- Flags are slow :: Not the reason.
- argparse cannot read them :: It can.
- They are too short :: Not the reason.
> Environment variables or secret stores keep them out of those places.
```

```cards
Library for arguments in the standard library? :: argparse
Order of configuration precedence? :: Option, environment, file, default
Exit code for Ctrl+C? :: 130
How to expose a command after install? :: project.scripts entry point
Where do logs and errors go? :: Standard error
```
