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

## Parse a key=value log line
id: kvline
task: Write parse_kv(line) that turns 'level=error svc=api code=502' into a dict {"level": "error", "svc": "api", "code": "502"}. Values stay strings.
hint: Split on spaces, then split each piece once on the equals sign.
@@ start
def parse_kv(line):
    pass
@@ sol
def parse_kv(line):
    out = {}
    for part in line.split():
        k, _, v = part.partition("=")
        out[k] = v
    return out
@@ tests
assert parse_kv("level=error svc=api code=502") == {"level": "error", "svc": "api", "code": "502"}
assert parse_kv("a=1") == {"a": "1"}
assert parse_kv("") == {}

## Count status codes
id: statuscount
task: Write count_codes(lines) that takes access log lines such as '10.0.0.1 GET /x 200' and returns a dict of status code to count. The code is the last field.
hint: collections.Counter is a good fit.
@@ start
def count_codes(lines):
    pass
@@ sol
from collections import Counter

def count_codes(lines):
    return dict(Counter(l.split()[-1] for l in lines if l.strip()))
@@ tests
logs = ["1.1.1.1 GET /a 200", "1.1.1.2 GET /b 500", "1.1.1.3 GET /c 200", ""]
assert count_codes(logs) == {"200": 2, "500": 1}
assert count_codes([]) == {}

## Find the slowest endpoint
id: slowest
task: Write slowest(samples) where samples is a list of (path, milliseconds) tuples. Return the path with the highest average time.
hint: Group the times by path in a dict of lists, then use max with a key.
@@ start
def slowest(samples):
    pass
@@ sol
def slowest(samples):
    groups = {}
    for path, ms in samples:
        groups.setdefault(path, []).append(ms)
    return max(groups, key=lambda p: sum(groups[p]) / len(groups[p]))
@@ tests
assert slowest([("/a", 10), ("/b", 50), ("/a", 20), ("/b", 70)]) == "/b"
assert slowest([("/x", 5)]) == "/x"
assert slowest([("/a", 100), ("/a", 100), ("/b", 150)]) == "/b"

## Validate an IPv4 address
id: ipv4
task: Write is_ipv4(text) that returns True for a valid dotted IPv4 address and False otherwise. Four parts, each 0 to 255, digits only.
hint: Split on dots, check there are four parts, and test isdigit and the range.
@@ start
def is_ipv4(text):
    pass
@@ sol
def is_ipv4(text):
    parts = text.split(".")
    if len(parts) != 4:
        return False
    return all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)
@@ tests
assert is_ipv4("10.0.0.1") is True
assert is_ipv4("256.1.1.1") is False
assert is_ipv4("1.2.3") is False
assert is_ipv4("a.b.c.d") is False
assert is_ipv4("0.0.0.0") is True

## Convert an IP address to an integer
id: ip2int
task: Write ip_to_int(ip) that converts '192.168.1.10' to its integer value (192*2^24 + 168*2^16 + 1*2^8 + 10).
hint: Shift the running total left by 8 bits for each part and add the part.
@@ start
def ip_to_int(ip):
    pass
@@ sol
def ip_to_int(ip):
    n = 0
    for part in ip.split("."):
        n = (n << 8) + int(part)
    return n
@@ tests
assert ip_to_int("0.0.0.1") == 1
assert ip_to_int("192.168.1.10") == 3232235786
assert ip_to_int("255.255.255.255") == 4294967295

## Is an address inside a CIDR range?
id: incidr
task: Write in_cidr(ip, cidr) that returns True when ip is inside cidr, for example in_cidr("10.1.2.3", "10.1.0.0/16"). Use the ipaddress module.
hint: ipaddress.ip_address(ip) in ipaddress.ip_network(cidr).
@@ start
def in_cidr(ip, cidr):
    pass
@@ sol
import ipaddress

def in_cidr(ip, cidr):
    return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr)
@@ tests
assert in_cidr("10.1.2.3", "10.1.0.0/16") is True
assert in_cidr("10.2.0.1", "10.1.0.0/16") is False
assert in_cidr("192.168.1.5", "192.168.1.0/24") is True

## Group consecutive duplicates
id: collapse
task: Write collapse(lines) that removes consecutive duplicate lines, like uniq. ["a","a","b","a"] becomes ["a","b","a"].
hint: Keep a result list and append only when the line differs from the last one.
@@ start
def collapse(lines):
    pass
@@ sol
def collapse(lines):
    out = []
    for l in lines:
        if not out or out[-1] != l:
            out.append(l)
    return out
@@ tests
assert collapse(["a", "a", "b", "a"]) == ["a", "b", "a"]
assert collapse([]) == []
assert collapse(["x", "x", "x"]) == ["x"]

## Mask a password in a URL
id: urlmask
task: Write mask_url(url) that replaces the password in 'postgres://user:secret@db:5432/app' with ***. URLs without a password stay unchanged.
hint: A regular expression like ://([^:/@]+):[^@]+@ works.
@@ start
def mask_url(url):
    pass
@@ sol
import re

def mask_url(url):
    return re.sub(r"://([^:/@]+):[^@]+@", r"://\1:***@", url)
@@ tests
assert mask_url("postgres://user:secret@db:5432/app") == "postgres://user:***@db:5432/app"
assert mask_url("https://example.com/path") == "https://example.com/path"

## Read a JSON list of events
id: jsonerrors
task: Write error_services(text) where text is a JSON array like '[{"svc":"api","level":"error"},{"svc":"db","level":"info"}]'. Return a sorted list of unique service names that have level "error".
hint: json.loads, then a set comprehension.
@@ start
def error_services(text):
    pass
@@ sol
import json

def error_services(text):
    return sorted({e["svc"] for e in json.loads(text) if e.get("level") == "error"})
@@ tests
t = '[{"svc":"api","level":"error"},{"svc":"db","level":"info"},{"svc":"api","level":"error"},{"svc":"auth","level":"error"}]'
assert error_services(t) == ["api", "auth"]
assert error_services("[]") == []

## Compute a checksum of text
id: checksum
task: Write sha256_hex(text) that returns the SHA-256 hash of the text (encoded as UTF-8) as a lowercase hex string.
hint: hashlib.sha256(text.encode()).hexdigest().
@@ start
def sha256_hex(text):
    pass
@@ sol
import hashlib

def sha256_hex(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
@@ tests
assert sha256_hex("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
assert sha256_hex("abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"

## Build a query string
id: querystring
task: Write build_query(params) that turns {"q": "disk full", "page": 2} into 'q=disk%20full&page=2'. Keep the dict order and encode spaces as %20.
hint: urllib.parse.quote encodes one value. Join the pairs with &.
@@ start
def build_query(params):
    pass
@@ sol
from urllib.parse import quote

def build_query(params):
    return "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
@@ tests
assert build_query({"q": "disk full", "page": 2}) == "q=disk%20full&page=2"
assert build_query({}) == ""
assert build_query({"a": "b&c"}) == "a=b%26c"

## Find the first failing check
id: firstfail
task: Write first_failure(results) where results is a list of (name, ok) tuples. Return the name of the first check with ok False, or None if all passed.
hint: Loop and return as soon as you see a False.
@@ start
def first_failure(results):
    pass
@@ sol
def first_failure(results):
    for name, ok in results:
        if not ok:
            return name
    return None
@@ tests
assert first_failure([("lint", True), ("test", False), ("scan", False)]) == "test"
assert first_failure([("lint", True)]) is None
assert first_failure([]) is None

## Compute an error budget in minutes
id: budgetmin
task: Write budget_minutes(slo_percent, days) that returns the allowed downtime in minutes, rounded to 1 decimal. For 99.9 percent over 30 days the answer is 43.2.
hint: total minutes = days * 24 * 60. Allowed = total * (100 - slo) / 100.
@@ start
def budget_minutes(slo_percent, days):
    pass
@@ sol
def budget_minutes(slo_percent, days):
    return round(days * 24 * 60 * (100 - slo_percent) / 100, 1)
@@ tests
assert budget_minutes(99.9, 30) == 43.2
assert budget_minutes(99.0, 30) == 432.0
assert budget_minutes(99.99, 7) == 1.0

## Pick the oldest files to delete
id: oldfiles
task: Write to_delete(files, keep) where files is a list of (name, age_days) tuples. Keep the newest keep files and return the names of the rest, oldest first.
hint: Sort by age descending, then slice off the first len(files) - keep items.
@@ start
def to_delete(files, keep):
    pass
@@ sol
def to_delete(files, keep):
    ordered = sorted(files, key=lambda f: f[1], reverse=True)
    cut = max(len(ordered) - keep, 0)
    return [n for n, _ in ordered[:cut]]
@@ tests
files = [("a", 5), ("b", 30), ("c", 1), ("d", 12)]
assert to_delete(files, 2) == ["b", "d"]
assert to_delete(files, 10) == []
assert to_delete(files, 0) == ["b", "d", "a", "c"]

## Merge two inventories
id: inventory
task: Write merge_inventory(a, b) where each is a dict of hostname to list of tags. Return one dict with the tags combined, without duplicates, sorted.
hint: Loop over both dicts and use a set per host.
@@ start
def merge_inventory(a, b):
    pass
@@ sol
def merge_inventory(a, b):
    out = {}
    for src in (a, b):
        for host, tags in src.items():
            out.setdefault(host, set()).update(tags)
    return {h: sorted(t) for h, t in out.items()}
@@ tests
a = {"web1": ["prod", "eu"], "db1": ["prod"]}
b = {"web1": ["eu", "canary"], "cache1": ["dev"]}
r = merge_inventory(a, b)
assert r["web1"] == ["canary", "eu", "prod"]
assert r["db1"] == ["prod"] and r["cache1"] == ["dev"]

## Check disk usage thresholds
id: diskwarn
task: Write disk_alerts(usage) where usage maps a mount to a percent. Return a sorted list of (mount, level) where level is "critical" at 90 or more and "warning" at 80 or more. Skip the rest.
hint: Check the higher threshold first.
@@ start
def disk_alerts(usage):
    pass
@@ sol
def disk_alerts(usage):
    out = []
    for mount, pct in usage.items():
        if pct >= 90:
            out.append((mount, "critical"))
        elif pct >= 80:
            out.append((mount, "warning"))
    return sorted(out)
@@ tests
u = {"/": 45, "/var": 91, "/data": 80, "/tmp": 79}
assert disk_alerts(u) == [("/data", "warning"), ("/var", "critical")]
assert disk_alerts({}) == []

## Chunk a list for rate limits
id: chunkrate
task: Write plan_batches(items, size, pause) that returns a list of (batch, wait) pairs. Each batch has up to size items. The wait before the first batch is 0 and before every other batch is pause seconds.
hint: Slice with range(0, len(items), size).
@@ start
def plan_batches(items, size, pause):
    pass
@@ sol
def plan_batches(items, size, pause):
    out = []
    for i in range(0, len(items), size):
        out.append((items[i:i + size], 0 if i == 0 else pause))
    return out
@@ tests
assert plan_batches([1, 2, 3, 4, 5], 2, 10) == [([1, 2], 0), ([3, 4], 10), ([5], 10)]
assert plan_batches([], 3, 5) == []

## Redact emails from text
id: redact
task: Write redact(text) that replaces every email address with [email]. An address is non-space characters, an at sign, and a domain with a dot.
hint: A pattern like \S+@\S+\.\S+ is enough for this exercise.
@@ start
def redact(text):
    pass
@@ sol
import re

def redact(text):
    return re.sub(r"\S+@\S+\.\S+", "[email]", text)
@@ tests
assert redact("mail ann@example.com now") == "mail [email] now"
assert redact("a@b.io and c@d.org") == "[email] and [email]"
assert redact("no address here") == "no address here"

## Next run of a fixed interval job
id: nextrun
task: Write next_run(last, interval) where last is seconds since midnight of the last run and interval is seconds. Return the next run time, wrapped into a 24 hour day (86400 seconds).
hint: Add the two values and use the modulo operator.
@@ start
def next_run(last, interval):
    pass
@@ sol
def next_run(last, interval):
    return (last + interval) % 86400
@@ tests
assert next_run(3600, 900) == 4500
assert next_run(86000, 900) == 500
assert next_run(0, 86400) == 0
