## How do you package an ops tool?
level: mid
A src layout with pyproject.toml, pinned dependencies in a lock file, an entry point command and a virtual environment or container for installs. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you make a CLI safe?
level: mid
Dry run by default for destructive actions, explicit environment, clear exit codes, JSON output and tests. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How should an API client retry?
level: mid
Timeouts, backoff with jitter, a retry limit, only on transient errors, idempotency for writes and respect for Retry-After. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## Threads, asyncio or processes?
level: mid
Threads or asyncio for I/O waiting, processes for CPU work. Limit concurrency and handle per task errors. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you test infrastructure code?
level: mid
Separate logic from I/O, inject fakes, parametrise edge cases and run tests in CI with no production credentials. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you keep cloud automation safe?
level: senior
Least privilege roles, list and review before acting, tags and audit logs, caps per run and a kill switch. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
