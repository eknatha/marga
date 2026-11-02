## Why use a virtual environment?
level: junior
It gives each project its own interpreter links and packages, so dependency versions do not conflict between projects or with the operating system's own Python tools. Create one with `python3 -m venv .venv`, activate it, install with `python -m pip`, and record versions in `requirements.txt`. In cron or systemd call the environment's interpreter by absolute path.

## What is the difference between a list, a tuple, a set and a dictionary?
level: junior
A list is an ordered, changeable sequence. A tuple is an ordered, immutable sequence. A set is an unordered collection of unique items with fast membership tests. A dictionary maps keys to values with fast lookup by key. Choose by need: order and mutation, immutability, uniqueness or lookup.

## How do you run an external command safely?
level: mid
Use `subprocess.run([...], capture_output=True, text=True, timeout=30, check=True)` with the command as a list, so no shell is involved. Avoid `shell=True` with any value from users, files or APIs because it allows command injection. Handle `CalledProcessError` and `TimeoutExpired`, and log the return code and standard error when something fails.

## How do you call a REST API reliably from Python?
level: mid
Use `requests` with a `Session`, always set a timeout, call `raise_for_status()`, and configure retries with backoff for transient errors such as 429 and 5xx. Read credentials from environment variables or a secret store. Handle pagination by following the next link until it is empty, ideally with a generator, and avoid blind retries on non-idempotent `POST` requests.

## What does if __name__ == "__main__" do?
level: junior
It runs the code under it only when the file is executed directly, not when another module imports it. That allows the same file to hold reusable functions and a command-line entry point, and it makes the functions testable by importing them without side effects.

## How do you write idempotent automation with boto3 or the Azure SDK?
level: senior
Check the current state first and act only if it differs: for example `head_bucket` before `create_bucket`, or list and compare tags. Use paginators so you see all resources, confirm the account or subscription before changing anything, support a dry-run mode, and use deterministic names or client tokens so retries do not create duplicates. Idempotent scripts are safe to schedule and to rerun after a partial failure.

## How would you test a script that calls external services?
level: mid
Separate logic from I/O, then use `unittest.mock.patch` or dependency injection to replace network calls and disks with fakes in unit tests. Use `pytest` fixtures such as `tmp_path` for files. Add a small number of integration tests against a sandbox, test failure paths such as timeouts and bad input, and run tests and linting in the pipeline.

## Explain generators and why they matter for automation.
level: senior
A generator produces values one at a time with `yield`, so it never holds the whole result in memory. That suits paginated APIs, large log files and long listings, where you can process each item as it arrives. Generators are lazy, which also lets you stop early. They compose well with `for` loops, comprehensions and functions like `any` or `itertools`.
