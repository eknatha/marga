---
title: Python basics and virtual environments
minutes: 15
summary: Write readable Python for automation, keep each project's packages isolated in a virtual environment, and run scripts the same way everywhere.
---

Bash is perfect for gluing commands together. Once a script needs data structures, error handling, JSON or an API call, Python is the better tool. Almost every cloud SDK, Ansible module and monitoring plugin you will meet is written in it, so a working knowledge pays off quickly.

## What you will learn

- The small set of Python features that cover most automation work
- Why every project gets its own virtual environment
- How to install and pin dependencies with pip
- How to structure a script so it can be run and imported

## The core you actually use

Python is indentation-sensitive: four spaces define a block. These building blocks show up in nearly every ops script.

```python
servers = ["web-1", "web-2", "db-1"]            # list
limits = {"cpu": 80, "memory": 90}               # dict
name, port = "web-1", 8080                       # tuple unpacking

web = [s for s in servers if s.startswith("web")]   # list comprehension
print(f"{name}:{port} has {len(web)} web peers")    # f-string

def over_limit(metric: str, value: float) -> bool:
    """Return True when value is above the configured limit."""
    return value > limits.get(metric, 100)

for metric, value in {"cpu": 91.5, "memory": 40}.items():
    if over_limit(metric, value):
        print(f"ALERT {metric}={value}")
```

Three habits make scripts safer. Use **f-strings** for formatting, use `dict.get(key, default)` instead of indexing when a key may be missing, and add short **type hints** so the next reader knows what a function expects.

## Virtual environments

Python packages install into a Python interpreter. If every project installs into the system Python, two projects needing different versions of the same library will break each other, and an OS upgrade can break your tools. A **virtual environment** is a private folder holding its own interpreter links and packages.

```console
$ python3 -m venv .venv
$ source .venv/bin/activate
$ python -m pip install --upgrade pip
$ python -m pip install requests==2.32.3
$ python -m pip freeze > requirements.txt
$ deactivate
```

Create the environment once per project, activate it in each new shell, and keep `.venv/` out of version control and out of container images built from your code. The `requirements.txt` file records exact versions so a teammate or a pipeline can reproduce the same set:

```console
$ python3 -m venv .venv && . .venv/bin/activate
$ python -m pip install -r requirements.txt
$ python -m pip list --outdated
```

Always call pip as `python -m pip`. That guarantees the pip belongs to the interpreter you think you are using.

## A script that can also be imported

```python
import sys


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: check.py HOSTNAME", file=sys.stderr)
        return 2
    print(f"checking {argv[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
```

The `if __name__ == "__main__"` guard means the file runs when executed but does nothing when another file imports a function from it. Returning an integer and passing it to `SystemExit` gives the shell a proper exit code, which pipelines rely on.

## Incident: the upgrade that broke the backup script

> **Incident:** After a routine OS update, the nightly backup script fails with `ModuleNotFoundError: No module named 'boto3'`. The script ran for two years. Nobody remembers installing boto3, and a quick `pip install` as root makes the error go away until the next update.

The script depended on a package that had been installed into the system Python, and the update replaced that interpreter. The durable fix is to give the script its own environment and record its dependencies:

```console
$ python3 -m venv /opt/backup/.venv
$ /opt/backup/.venv/bin/python -m pip install -r /opt/backup/requirements.txt
$ /opt/backup/.venv/bin/python /opt/backup/backup.py
```

Call the environment's interpreter by absolute path in cron or systemd, so no activation step is needed. The script is now independent of the OS Python, and a rebuilt server gets the same versions from `requirements.txt`.

## Common mistakes

- Installing packages into the system Python with `sudo pip`
- Forgetting to pin versions, so a new release breaks a working script
- Using mutable default arguments such as `def f(items=[])`
- Catching every exception with a bare `except:` and hiding the real failure
- Mixing tabs and spaces for indentation

```quiz
Q: Why create a virtual environment per project?
- It makes Python run faster
- It is required by the pip command
+ It isolates each project's packages so versions do not conflict
- It encrypts the installed packages
> Separate environments stop one project's dependencies from breaking another or the operating system's tools.

Q: What does `python -m pip freeze > requirements.txt` produce?
- A compiled copy of your script
+ A list of installed packages with exact versions, usable to recreate the environment
- A backup of the interpreter
- A list of unused packages
> Pinned versions let teammates and pipelines install exactly what you tested.

Q: What does the `if __name__ == "__main__"` guard do?
- Prevents the script from running at all
+ Runs the code only when the file is executed, not when it is imported
- Checks that Python 3 is installed
- Converts the script to a module
> It lets the same file be both a runnable script and an importable library.

Q: How should cron run a script that needs a virtual environment?
- Activate the environment with a login shell prompt
+ Call the environment's interpreter by absolute path, such as .venv/bin/python
- Install the packages system-wide first
- Run it as root
> Absolute paths work without an interactive activation step.
```

```cards
Why use python -m pip? :: It guarantees pip belongs to the same interpreter you are running
What is a virtual environment? :: A private folder with its own packages so projects do not conflict
How does a script return an exit code? :: raise SystemExit(main()) where main returns an integer
Why avoid a bare except? :: It hides the real error and also catches Ctrl+C and exit requests
```
