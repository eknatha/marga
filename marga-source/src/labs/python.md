## Read a CPU request such as 250m
id: cpu
task: Write cpu_millis(text) that turns a Kubernetes CPU value into millicores. "250m" is 250. "2" is 2000. "0.5" is 500. Return an int.
hint: If the text ends with m, drop it and use the number. Otherwise multiply by 1000.
@@ start
def cpu_millis(text):
    pass
@@ sol
def cpu_millis(text):
    t = text.strip()
    if t.endswith("m"):
        return int(t[:-1])
    return int(round(float(t) * 1000))
@@ tests
assert cpu_millis("250m") == 250
assert cpu_millis("2") == 2000
assert cpu_millis("0.5") == 500
assert cpu_millis(" 1500m ") == 1500
assert isinstance(cpu_millis("1"), int)

## Parse a duration such as 1h30m
id: duration
task: Write parse_duration(text) that turns "1h30m", "45s", "2h" or "1d2h" into seconds. Units are d, h, m and s.
hint: A regular expression like (\d+)([dhms]) with re.findall does most of the work.
@@ start
import re

def parse_duration(text):
    pass
@@ sol
import re

def parse_duration(text):
    mult = {"d": 86400, "h": 3600, "m": 60, "s": 1}
    return sum(int(n) * mult[u] for n, u in re.findall(r"(\d+)([dhms])", text))
@@ tests
assert parse_duration("45s") == 45
assert parse_duration("1h30m") == 5400
assert parse_duration("2h") == 7200
assert parse_duration("1d2h") == 93600
assert parse_duration("") == 0

## Compare version numbers
id: semver
task: Write newer(a, b). It returns True when version a is newer than version b. Versions look like "1.10.2". Compare each part as a number, so 1.10 is newer than 1.9.
hint: Split on dots, convert each part with int, and compare the tuples.
@@ start
def newer(a, b):
    pass
@@ sol
def newer(a, b):
    pa = tuple(int(x) for x in a.split("."))
    pb = tuple(int(x) for x in b.split("."))
    return pa > pb
@@ tests
assert newer("1.10.0", "1.9.9") is True
assert newer("1.2.3", "1.2.3") is False
assert newer("2.0.0", "10.0.0") is False
assert newer("1.2.4", "1.2.3") is True

## Calculate a percentile
id: percentile
task: Write percentile(values, p) using the nearest-rank method. Sort the values, then return the value at position ceil(p/100 * n) (counting from 1). Raise ValueError for an empty list.
hint: Use math.ceil and remember that list positions start at 0.
@@ start
import math

def percentile(values, p):
    pass
@@ sol
import math

def percentile(values, p):
    if not values:
        raise ValueError("no values")
    s = sorted(values)
    rank = max(1, math.ceil(p / 100 * len(s)))
    return s[rank - 1]
@@ tests
data = [15, 20, 35, 40, 50]
assert percentile(data, 50) == 35
assert percentile(data, 100) == 50
assert percentile(data, 20) == 15
assert percentile(list(range(1, 101)), 99) == 99
try:
    percentile([], 50)
    raise AssertionError("empty list should raise ValueError")
except ValueError:
    pass

## Hide secrets in a log line
id: mask
task: Write mask_secrets(line). Replace the value after password=, token= or secret= with ***. Keep the rest of the line. Ignore case in the key.
hint: re.sub with a group for the key lets you keep it, for example r"(?i)(password|token|secret)=\S+".
@@ start
import re

def mask_secrets(line):
    pass
@@ sol
import re

def mask_secrets(line):
    return re.sub(r"(?i)\b(password|token|secret)=\S+", lambda m: m.group(1) + "=***", line)
@@ tests
assert mask_secrets("login user=ann password=hunter2 ok") == "login user=ann password=*** ok"
assert mask_secrets("TOKEN=abc123") == "TOKEN=***"
assert mask_secrets("nothing here") == "nothing here"
assert mask_secrets("a secret=x b token=y") == "a secret=*** b token=***"

## Group errors by service
id: bysvc
task: Write errors_by_service(events). Each event is a dict such as {"service": "api", "level": "ERROR"}. Return a dict that counts only the ERROR events for each service.
hint: Skip events whose level is not ERROR, and use dict.get(key, 0) + 1.
@@ start
def errors_by_service(events):
    pass
@@ sol
def errors_by_service(events):
    out = {}
    for e in events:
        if e.get("level") == "ERROR":
            out[e["service"]] = out.get(e["service"], 0) + 1
    return out
@@ tests
ev = [{"service": "api", "level": "ERROR"}, {"service": "api", "level": "INFO"}, {"service": "db", "level": "ERROR"}, {"service": "api", "level": "ERROR"}]
assert errors_by_service(ev) == {"api": 2, "db": 1}
assert errors_by_service([]) == {}

## Flatten nested settings
id: flatten
task: Write flatten(d). Turn a nested dict into a flat dict with dotted keys. {"a": {"b": 1}, "c": 2} becomes {"a.b": 1, "c": 2}.
hint: Recurse when a value is a dict, and pass the key prefix down.
@@ start
def flatten(d, prefix=""):
    pass
@@ sol
def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = prefix + "." + k if prefix else k
        if isinstance(v, dict):
            out.update(flatten(v, key))
        else:
            out[key] = v
    return out
@@ tests
assert flatten({"a": {"b": 1}, "c": 2}) == {"a.b": 1, "c": 2}
assert flatten({}) == {}
assert flatten({"x": {"y": {"z": 3}}}) == {"x.y.z": 3}

## Process items in batches
id: batches
task: Write batches(items, size). Return a list of lists, each with at most size items, in the original order. Raise ValueError if size is less than 1.
hint: Range with a step of size gives you the start of each batch.
@@ start
def batches(items, size):
    pass
@@ sol
def batches(items, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [items[i:i + size] for i in range(0, len(items), size)]
@@ tests
assert batches([1, 2, 3, 4, 5], 2) == [[1, 2], [3, 4], [5]]
assert batches([], 3) == []
try:
    batches([1], 0)
    raise AssertionError("size 0 should raise ValueError")
except ValueError:
    pass

## Retry a flaky call
id: retry
task: Write retry(fn, attempts=3). Call fn(). If it raises an exception, try again, up to attempts calls in total. Return the result of the first success. If every call fails, raise the last exception.
hint: Keep the last exception in a variable and raise it after the loop.
@@ start
def retry(fn, attempts=3):
    pass
@@ sol
def retry(fn, attempts=3):
    last = None
    for _ in range(attempts):
        try:
            return fn()
        except Exception as exc:
            last = exc
    raise last
@@ tests
calls = {"n": 0}
def flaky():
    calls["n"] += 1
    if calls["n"] < 3:
        raise RuntimeError("busy")
    return "ok"
assert retry(flaky, attempts=3) == "ok"
assert calls["n"] == 3
def always():
    raise KeyError("down")
try:
    retry(always, attempts=2)
    raise AssertionError("should raise")
except KeyError:
    pass

## Check a hostname
id: hostname
task: Write valid_hostname(name). A valid name has labels separated by dots. Each label is 1 to 63 characters of letters, digits or hyphens and does not start or end with a hyphen. The whole name is at most 253 characters.
hint: Check each label with one regular expression and the total length once.
@@ start
import re

def valid_hostname(name):
    pass
@@ sol
import re

def valid_hostname(name):
    if not name or len(name) > 253:
        return False
    label = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$")
    return all(label.match(p) for p in name.split("."))
@@ tests
assert valid_hostname("api.example.com") is True
assert valid_hostname("-bad.example.com") is False
assert valid_hostname("a" * 64 + ".com") is False
assert valid_hostname("under_score.com") is False
assert valid_hostname("") is False
assert valid_hostname("localhost") is True

## Do two networks overlap?
id: overlap
task: Write overlaps(a, b) with the ipaddress module. It returns True when the two CIDR blocks share any address. Overlapping ranges cannot be peered or routed together.
hint: ip_network has an overlaps method.
@@ start
import ipaddress

def overlaps(a, b):
    pass
@@ sol
import ipaddress

def overlaps(a, b):
    return ipaddress.ip_network(a).overlaps(ipaddress.ip_network(b))
@@ tests
assert overlaps("10.0.0.0/16", "10.0.5.0/24") is True
assert overlaps("10.0.0.0/24", "10.0.1.0/24") is False
assert overlaps("192.168.0.0/16", "10.0.0.0/8") is False
assert overlaps("172.16.0.0/12", "172.31.255.0/24") is True

## Read an env file
id: envfile
task: Write parse_env(text). Each line is KEY=value. Ignore blank lines and lines that start with #. Strip spaces around the key and value, and remove one pair of surrounding double quotes from the value. Return a dict.
hint: Use split("=", 1) so that a value can contain an equals sign.
@@ start
def parse_env(text):
    pass
@@ sol
def parse_env(text):
    out = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        v = v.strip()
        if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
            v = v[1:-1]
        out[k.strip()] = v
    return out
@@ tests
t = '# comment\nHOST = db.local\nURL="a=b"\n\nEMPTY=\n'
assert parse_env(t) == {"HOST": "db.local", "URL": "a=b", "EMPTY": ""}
assert parse_env("") == {}

## Busiest client addresses
id: topips
task: Write top_ips(lines, n). Each line starts with a client IP address followed by a space. Return a list of (ip, count) pairs for the n most common addresses, highest count first. Break ties by the address in alphabetical order.
hint: collections.Counter plus a sort key of (-count, ip) is enough.
@@ start
from collections import Counter

def top_ips(lines, n):
    pass
@@ sol
from collections import Counter

def top_ips(lines, n):
    c = Counter(l.split()[0] for l in lines if l.strip())
    return sorted(c.items(), key=lambda kv: (-kv[1], kv[0]))[:n]
@@ tests
lines = ["1.1.1.1 GET /", "2.2.2.2 GET /", "1.1.1.1 GET /a", "3.3.3.3 GET /", "2.2.2.2 POST /b", "1.1.1.1 GET /c"]
assert top_ips(lines, 2) == [("1.1.1.1", 3), ("2.2.2.2", 2)]
assert top_ips(lines, 5)[2] == ("3.3.3.3", 1)
assert top_ips([], 3) == []

## Alert on a sliding error rate
id: window
task: Write should_alert(results, window, limit). results is a list of True (success) and False (failure) in time order. Look at the last window results only. Return True if more than limit of them (as a fraction) are failures. With fewer than window results, use what you have. Empty input returns False.
hint: Slice with results[-window:] and divide failures by the number of items.
@@ start
def should_alert(results, window, limit):
    pass
@@ sol
def should_alert(results, window, limit):
    recent = results[-window:]
    if not recent:
        return False
    return (recent.count(False) / len(recent)) > limit
@@ tests
assert should_alert([True] * 9 + [False], 10, 0.05) is True
assert should_alert([True] * 10, 10, 0.05) is False
assert should_alert([False] + [True] * 10, 10, 0.05) is False
assert should_alert([], 5, 0.1) is False
assert should_alert([False, False], 10, 0.5) is True

## Availability from check results
id: availability
task: Write availability(up, total). Return the percentage of successful checks, rounded to 3 decimals. If total is 0 return 100.0. Raise ValueError if up is larger than total.
hint: 100 * up / total, then round(value, 3).
@@ start
def availability(up, total):
    pass
@@ sol
def availability(up, total):
    if up > total:
        raise ValueError("up cannot exceed total")
    if total == 0:
        return 100.0
    return round(100 * up / total, 3)
@@ tests
assert availability(999, 1000) == 99.9
assert availability(0, 0) == 100.0
assert availability(2, 3) == 66.667
try:
    availability(5, 3)
    raise AssertionError("should raise")
except ValueError:
    pass

## Merge configuration, deeply
id: deepmerge
task: Write deep_merge(base, override). Return a new dict. Values from override win. When both values are dicts, merge them recursively. Do not change the input dicts.
hint: Copy base first, then loop over the override items.
@@ start
def deep_merge(base, override):
    pass
@@ sol
import copy

def deep_merge(base, override):
    out = copy.deepcopy(base)
    for k, v in override.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out
@@ tests
a = {"db": {"host": "a", "port": 1}, "debug": False}
b = {"db": {"host": "b"}, "extra": 1}
r = deep_merge(a, b)
assert r == {"db": {"host": "b", "port": 1}, "debug": False, "extra": 1}
assert a == {"db": {"host": "a", "port": 1}, "debug": False}, "the input must not change"

## Name rotated log files
id: rotate
task: Write rotate_names(base, keep). Return the file names after rotation as a list: base, base.1, base.2 and so on up to keep rotated copies. rotate_names("app.log", 3) gives ["app.log", "app.log.1", "app.log.2", "app.log.3"].
hint: A list comprehension with range(1, keep + 1) is enough.
@@ start
def rotate_names(base, keep):
    pass
@@ sol
def rotate_names(base, keep):
    return [base] + ["%s.%d" % (base, i) for i in range(1, keep + 1)]
@@ tests
assert rotate_names("app.log", 3) == ["app.log", "app.log.1", "app.log.2", "app.log.3"]
assert rotate_names("x", 0) == ["x"]

## Classify an HTTP status code
id: status
task: Write classify(code). Return "success" for 200 to 299, "redirect" for 300 to 399, "client error" for 400 to 499, "server error" for 500 to 599, and "other" for anything else.
hint: Use integer division, code // 100, and a dict.
@@ start
def classify(code):
    pass
@@ sol
def classify(code):
    return {2: "success", 3: "redirect", 4: "client error", 5: "server error"}.get(code // 100, "other") if 100 <= code <= 599 else "other"
@@ tests
assert classify(204) == "success"
assert classify(301) == "redirect"
assert classify(404) == "client error"
assert classify(503) == "server error"
assert classify(101) == "other"
assert classify(700) == "other"

## Show bytes for people
id: human
task: Write human_bytes(n). Use 1024 steps and the units B, KB, MB, GB, TB. Show one decimal for KB and above, none for B. human_bytes(1536) is "1.5 KB". human_bytes(512) is "512 B".
hint: Divide by 1024 in a loop while the number is at least 1024 and there is a next unit.
@@ start
def human_bytes(n):
    pass
@@ sol
def human_bytes(n):
    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(n)
    i = 0
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    return "%d B" % n if i == 0 else "%.1f %s" % (size, units[i])
@@ tests
assert human_bytes(512) == "512 B"
assert human_bytes(1536) == "1.5 KB"
assert human_bytes(5 * 1024 ** 2) == "5.0 MB"
assert human_bytes(3 * 1024 ** 4) == "3.0 TB"

## Order incident events by time
id: timeline
task: Write timeline(events). Each event is a (iso_time, text) pair such as ("2026-03-01T10:05:00", "rollback"). Return the list of texts ordered by time, earliest first. Use datetime.fromisoformat so that different spellings still sort correctly.
hint: sorted with key=lambda e: datetime.fromisoformat(e[0]).
@@ start
from datetime import datetime

def timeline(events):
    pass
@@ sol
from datetime import datetime

def timeline(events):
    return [t for _, t in sorted(events, key=lambda e: datetime.fromisoformat(e[0]))]
@@ tests
ev = [("2026-03-01T10:05:00", "rollback"), ("2026-03-01T09:58:30", "alert"), ("2026-03-01T10:20:00", "resolved")]
assert timeline(ev) == ["alert", "rollback", "resolved"]
assert timeline([]) == []

## A token bucket rate limiter
id: bucket
task: Write class TokenBucket(capacity, rate). The bucket starts full. allow(now) takes the current time in seconds. It first adds rate tokens per second since the last call (never above capacity), then removes one token and returns True if there is one, otherwise returns False.
hint: Store tokens as a float and remember the time of the last call.
@@ start
class TokenBucket:
    def __init__(self, capacity, rate):
        pass

    def allow(self, now):
        pass
@@ sol
class TokenBucket:
    def __init__(self, capacity, rate):
        self.capacity = capacity
        self.rate = rate
        self.tokens = float(capacity)
        self.last = None

    def allow(self, now):
        if self.last is not None:
            self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
@@ tests
b = TokenBucket(2, 1)
assert b.allow(0) is True
assert b.allow(0) is True
assert b.allow(0) is False, "the bucket is empty"
assert b.allow(1) is True, "one token came back after one second"
assert b.allow(1) is False
assert b.allow(100) is True
assert b.allow(100) is True
assert b.allow(100) is False, "capacity is 2, so no more than 2 tokens"

## Is this a valid Kubernetes name?
id: k8sname
task: Write valid_k8s_name(name). It must be 1 to 253 characters, use only lowercase letters, digits, hyphens and dots, and start and end with a letter or digit.
hint: One regular expression anchored at both ends plus a length check.
@@ start
import re

def valid_k8s_name(name):
    pass
@@ sol
import re

def valid_k8s_name(name):
    return 0 < len(name) <= 253 and re.fullmatch(r"[a-z0-9]([a-z0-9.-]*[a-z0-9])?", name) is not None
@@ tests
assert valid_k8s_name("web-1") is True
assert valid_k8s_name("my.app") is True
assert valid_k8s_name("Web") is False
assert valid_k8s_name("-web") is False
assert valid_k8s_name("web-") is False
assert valid_k8s_name("a_b") is False
assert valid_k8s_name("") is False

## What does this exit code mean?
id: exitcode
task: Write explain_exit(code). Return "ok" for 0. For 128 + N return "killed by signal N" using the number (137 gives "killed by signal 9"). For 126 return "not executable", for 127 "command not found". For any other code return "error".
hint: Check the special values first, then the range 129 to 255.
@@ start
def explain_exit(code):
    pass
@@ sol
def explain_exit(code):
    if code == 0:
        return "ok"
    if code == 126:
        return "not executable"
    if code == 127:
        return "command not found"
    if 129 <= code <= 255:
        return "killed by signal %d" % (code - 128)
    return "error"
@@ tests
assert explain_exit(0) == "ok"
assert explain_exit(137) == "killed by signal 9"
assert explain_exit(143) == "killed by signal 15"
assert explain_exit(127) == "command not found"
assert explain_exit(126) == "not executable"
assert explain_exit(1) == "error"
