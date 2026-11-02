---
title: HTTP, REST APIs and JSON
minutes: 15
summary: Call REST APIs with requests, parse and build JSON, handle timeouts, retries and pagination, and keep tokens out of your code.
---

Cloud providers, ticketing systems, chat tools and monitoring platforms all expose REST APIs. Calling them from Python turns a repetitive console task into a script you can schedule and review.

## What you will learn

- Making GET and POST requests with the `requests` library
- Working with JSON in both directions
- Timeouts, status codes, retries and pagination
- Reading secrets from the environment

## A first request

```python
import requests

resp = requests.get(
    "https://api.example.com/v1/servers",
    headers={"Accept": "application/json"},
    params={"status": "running", "limit": 50},
    timeout=10,
)
resp.raise_for_status()
for server in resp.json()["items"]:
    print(server["id"], server["name"])
```

Three details matter. **Always set a timeout**: without one, `requests` can wait forever. **Call `raise_for_status()`** so 4xx and 5xx responses become exceptions instead of silently parsed error pages. **Use `params=`** rather than building query strings by hand, because it handles encoding.

## Sending JSON

```python
import os
import requests

token = os.environ["API_TOKEN"]          # never hard-code tokens
payload = {"name": "web-3", "size": "small", "tags": ["prod", "web"]}

resp = requests.post(
    "https://api.example.com/v1/servers",
    json=payload,                         # sets the header and encodes for you
    headers={"Authorization": f"Bearer {token}"},
    timeout=10,
)
if resp.status_code == 409:
    print("already exists")
else:
    resp.raise_for_status()
    print("created", resp.json()["id"])
```

Reading `os.environ["API_TOKEN"]` fails immediately with a `KeyError` if the variable is missing, which is better than sending an empty header. Never commit tokens, print them or include them in error messages.

## Pagination and retries

APIs return data in pages. A reusable session with retries handles brief outages and rate limits.

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def make_session() -> requests.Session:
    retry = Retry(total=4, backoff_factor=0.5,
                  status_forcelist=(429, 500, 502, 503, 504),
                  allowed_methods=("GET", "PUT", "DELETE"))
    s = requests.Session()
    s.mount("https://", HTTPAdapter(max_retries=retry))
    return s

def all_servers(session: requests.Session):
    url = "https://api.example.com/v1/servers"
    while url:
        r = session.get(url, timeout=10)
        r.raise_for_status()
        body = r.json()
        yield from body["items"]
        url = body.get("next")
```

Do not retry non-idempotent `POST` requests blindly: a retry after a timeout could create a duplicate. Honour `Retry-After` headers and use exponential backoff so you do not hammer a service that is already struggling.

## JSON basics

```python
import json

raw = '{"name": "web-1", "cpu": 0.42, "tags": ["prod"]}'
data = json.loads(raw)                  # string -> dict
data["cpu"] += 0.1
print(json.dumps(data, indent=2, sort_keys=True))

with open("servers.json", "w", encoding="utf-8") as fh:
    json.dump(data, fh, indent=2)
```

```console
$ python3 list_servers.py | head -3
srv-001 web-1
srv-002 web-2
srv-003 db-1
```

## Incident: the script that hung the deployment

> **Incident:** A deployment step calls a status API with `requests.get(url)`. The API's load balancer stalls, the connection never closes, and the pipeline job hangs for six hours until a runner timeout kills it. The release is delayed and the runner pool is exhausted.

`requests` has no default timeout. The fix is a single argument, and a retry policy for the transient case:

```python
resp = requests.get(url, timeout=(3.05, 10))   # connect timeout, read timeout
```

Wrap the call in the session from the previous section so a short outage is retried a few times with backoff, then fails the job quickly with a clear error. A fast failure with a message is always better than a silent hang.

```diagram
title: A reliable API call from a script
node: build | Build the request | 0 | 1 | URL, headers, token from the environment and a timeout. | No timeout means a hung server hangs your script forever.
node: send | Send with retries | 1 | 1 | A session retries on 429 and 5xx with backoff. | Retrying non-idempotent calls can create duplicates.
node: status | Check the status | 2 | 0 | Call raise_for_status so 4xx and 5xx become errors. | Ignoring status parses an error page as data.
node: parse | Parse JSON | 2 | 2 | Use response.json() and read fields with get. | A missing key raises KeyError or silently gives None.
node: out | Use or log the result | 3 | 1 | Return data or log the failure with the request id. | Without the id you cannot find the matching server log.
edge: build | send
edge: send | status
edge: send | parse
edge: status | out
edge: parse | out
```

## Common mistakes

- Omitting `timeout`, which allows indefinite hangs
- Parsing the body without checking the status code
- Building URLs and query strings with string concatenation
- Logging full request headers, which leaks tokens
- Retrying `POST` requests that are not idempotent

```quiz
Q: What happens if you call requests.get(url) without a timeout?
- It uses a safe 30 second default
+ It can wait indefinitely if the server never responds
- It raises an error immediately
- It retries three times
> requests has no default timeout, so you must set one.

Q: What does resp.raise_for_status() do?
- Retries failed requests
+ Raises an exception for 4xx and 5xx responses
- Parses the JSON body
- Prints the status code
> It stops your code from treating an error response as valid data.

Q: Where should an API token be stored for a script?
- In a constant at the top of the file
- In the repository README
+ In an environment variable or secret store read at runtime
- In the URL query string
> Secrets in code leak through repositories, logs and screenshots.

Q: Why be careful retrying a POST request?
- POST is not supported by the retry library
+ A retry after a timeout might create a duplicate resource
- Servers reject repeated POSTs
- It uses more bandwidth
> POST is not idempotent by default, so repeats can have side effects.
```

```cards
json= argument in requests? :: Encodes the dict as JSON and sets the Content-Type header
json.loads versus json.load? :: loads parses a string; load reads from a file object
How to handle API pages? :: Loop following the next link or cursor until it is empty, ideally as a generator
Why use a Session? :: Reuses connections and lets you attach retries and default headers
```
