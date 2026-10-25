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

## Mutable default argument keeps old data
level: junior
A function that collects errors returns items from earlier calls.

```text
def add_error(msg, errors=[]):
    errors.append(msg)
    return errors

>>> add_error("disk full")
['disk full']
>>> add_error("timeout")
['disk full', 'timeout']
```
? What is the right fix?
+ Use None as the default and create a new list inside the function when it is None
- Call the function with a bigger list
- Use a tuple as the default and keep calling append
- Add global before errors
why: Default values are created once, when the function is defined, so every call shares the same list. Write def add_error(msg, errors=None): and then if errors is None: errors = []. This applies to dicts and sets too.

## Script slow when reading a huge log
level: mid
A script that reads a 6 GB log file uses all the memory on the server.

```text
def count_errors(path):
    lines = open(path).readlines()
    return sum(1 for l in lines if "ERROR" in l)

$ /usr/bin/time -v python count.py app.log
Maximum resident set size: 7340032 kB
```
? What is the best change?
+ Iterate over the file object line by line inside a with block, so that only one line is in memory at a time
- Buy more memory
- Use readlines with a larger buffer
- Convert the file to a list of lists first
why: readlines builds a list of every line in memory. A file object is an iterator, so for line in f reads one buffered line at a time and uses a small, constant amount of memory. Use with open(path) as f so that the file is closed even if an error occurs.

## Script works locally but not in the container
level: junior
A script imports a library without errors on a laptop but fails in the container.

```text
$ docker run --rm tools:1.0 python report.py
Traceback (most recent call last):
  File "report.py", line 1, in <module>
    import yaml
ModuleNotFoundError: No module named 'yaml'
requirements.txt: (no pyyaml line)
```
? What is the fix?
+ Add pyyaml to requirements with a pinned version and install the file in the image build
- Copy the laptop site-packages into the image
- Use python2
- Ignore the error
why: The laptop had the package installed globally by chance. The image only has what the build installs. Declare every dependency in requirements, pin versions, and build from that file so that environments match.

## Retries make an outage worse
level: senior
A client library retries failed calls immediately in a loop.

```text
def call(url):
    while True:
        try:
            return requests.get(url, timeout=2).json()
        except Exception:
            pass
Server: 5xx rate 40%, request rate 6x normal
```
? What should change?
+ Limit attempts, wait with exponential back-off and jitter, retry only errors that are safe to retry, and stop when the failure persists
- Retry faster
- Catch no exceptions at all
- Remove the timeout
why: Immediate unlimited retries multiply the load on a struggling server and keep it down. Bounded retries with back-off and jitter spread the load and give it time to recover. Only retry idempotent calls, and surface a clear error in the end.
