## pip refuses to install a package
level: junior
A new engineer cannot install a library on a recent Linux server.

```text
$ pip install requests
error: externally-managed-environment

x This environment is externally managed
```
? What is the recommended way to proceed?
+ Create a virtual environment for the project and install the package inside it
- Use --break-system-packages in every project
- Delete the EXTERNALLY-MANAGED marker file
- Reinstall Python from source over the system one
why: The operating system's package manager owns the system Python, and the error stops pip from changing it. A virtual environment (`python3 -m venv .venv` then `.venv/bin/pip install requests`) keeps project dependencies separate and reproducible. Tools such as pipx suit command-line applications.

## List that keeps growing between calls
level: mid
A small helper that collects errors returns old entries in later calls.

```text
def add_error(msg, errors=[]):
    errors.append(msg)
    return errors

>>> add_error("disk full")
['disk full']
>>> add_error("timeout")
['disk full', 'timeout']
```
? What is the cause and the fix?
+ The default list is created once when the function is defined, so use errors=None and create a new list inside
- Python caches return values by default
- append() copies the list in the wrong order
- The function needs a global statement
why: Default argument values are evaluated once, at definition time, and then shared by every call that does not pass its own value. Use `None` as the default and create the list in the body: `if errors is None: errors = []`. The same applies to dictionaries and sets.

## Script that hangs forever
level: mid
A monitoring script runs from cron every minute and slowly piles up stuck processes.

```text
import requests
r = requests.get("https://api.internal.example/health")
print(r.status_code)

$ ps aux | grep health.py | wc -l
38
```
? What is the best fix?
+ Pass an explicit timeout, for example timeout=(3, 10), and handle the exception
- Call the script less often
- Wrap the call in a bare except
- Use a global retry loop with no limit
why: `requests` has no default timeout, so a server that accepts the connection and stays silent blocks forever. Set connect and read timeouts, catch `requests.exceptions.RequestException`, and exit with a non-zero status so the failure shows up. Add a lock or `timeout` command so runs cannot overlap.
