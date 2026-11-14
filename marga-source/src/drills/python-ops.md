## Works on my laptop only
level: junior
A script fails on the server with an import error.

```text
$ python backup.py
ModuleNotFoundError: No module named requests
```
? What is the fix?
+ Package it with declared dependencies and install into a virtual environment
- Copy site-packages
- Use sudo pip
why: Declared dependencies make installs repeatable.

## Script hangs overnight
level: mid
A scheduled job never finishes.

```text
$ ps -ef | grep sync.py
root 4102 sync.py (running 14h)
$ grep -c timeout sync.py
0
```
? What is missing?
+ A timeout on network calls
- More memory
- A faster disk
why: Without a timeout a call can wait forever.

## Missing results
level: mid
A report covers only 100 items.

```text
$ python usage.py | wc -l
100
```
? What do you check?
+ Whether the client follows pagination to the last page
- The font
- The Python version
why: One page is a common cause of silent gaps.

## Too many open files
level: mid
A parallel check fails halfway.

```text
$ python check.py
OSError: [Errno 24] Too many open files
```
? What helps?
+ Limit concurrency with a pool size or semaphore
- Raise ulimit only
- Use more threads
why: Unbounded parallelism exhausts descriptors.

## Test touches production
level: senior
A test deleted real resources.

```text
$ pytest
5 passed
$ env | grep AWS_PROFILE
AWS_PROFILE=prod
```
? What should change?
+ Use fakes and clear credentials in the test environment
- Run tests less
- Rename the profile
why: Tests must not be able to reach production.

## Cleanup matches everything
level: senior
A tag filter matched all resources.

```text
$ python cleanup.py --dry-run
matched: 4812
```
? What guardrail helps?
+ A per run limit, a required non empty filter and a dry run default
- Remove the dry run
- Run it twice
why: Limits stop a bad filter from becoming an outage.
