---
title: Python
summary: Environments, core syntax, files, subprocess, HTTP, JSON, cloud SDK, testing and packaging snippets for automation.
module: python
---

## Environments

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install requests==2.32.3
python -m pip freeze > requirements.txt
python -m pip install -r requirements.txt
python -m pip list --outdated
deactivate
```

One virtual environment per project. Call `python -m pip` so pip matches the interpreter.

## Core syntax

```python
servers = ["web-1", "web-2", "db-1"]
limits = {"cpu": 80, "memory": 90}
web = [s for s in servers if s.startswith("web")]
by_len = {s: len(s) for s in servers}
print(f"{len(web)} web servers, cpu limit {limits.get('cpu', 100)}")

def over(metric: str, value: float) -> bool:
    return value > limits.get(metric, 100)

if __name__ == "__main__":
    raise SystemExit(0)
```

## Files and paths

```python
from pathlib import Path

p = Path("/etc/myapp/app.conf")
text = p.read_text(encoding="utf-8")
Path("/var/tmp/out").mkdir(parents=True, exist_ok=True)
for f in Path("/var/log/myapp").glob("*.log"):
    print(f.name, f.stat().st_size)
with open("report.txt", "w", encoding="utf-8") as fh:
    fh.write("done\n")
```

## Run commands

```python
import subprocess

r = subprocess.run(["systemctl", "is-active", "nginx"], capture_output=True, text=True, timeout=10)
print(r.returncode, r.stdout.strip())
subprocess.run(["tar", "-czf", "/tmp/site.tgz", "/var/www"], check=True)
```

Pass a list, avoid `shell=True`, always set a timeout.

## JSON and HTTP

```python
import json
import os
import requests

data = json.loads('{"name": "web-1", "cpu": 0.4}')
print(json.dumps(data, indent=2, sort_keys=True))

resp = requests.get(
    "https://api.example.com/v1/servers",
    headers={"Authorization": "Bearer " + os.environ["API_TOKEN"]},
    params={"limit": 50},
    timeout=10,
)
resp.raise_for_status()
items = resp.json()["items"]
```

Always set `timeout`, call `raise_for_status`, read tokens from the environment.

## Errors and logging

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("job")
try:
    risky()
except ValueError as exc:
    log.exception("failed: %s", exc)
    raise
```

## AWS and Azure SDKs

```python
import boto3

print(boto3.client("sts").get_caller_identity()["Arn"])
ec2 = boto3.client("ec2", region_name="eu-west-1")
for page in ec2.get_paginator("describe_instances").paginate():
    for res in page["Reservations"]:
        for inst in res["Instances"]:
            print(inst["InstanceId"])
```

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient

compute = ComputeManagementClient(DefaultAzureCredential(), "SUBSCRIPTION_ID")
for vm in compute.virtual_machines.list_all():
    print(vm.name)
```

## CLI, tests, packaging

```python
import argparse

p = argparse.ArgumentParser(prog="tool")
p.add_argument("paths", nargs="+")
p.add_argument("--threshold", type=int, default=85)
args = p.parse_args()
```

```bash
python -m pip install pytest
python -m pytest -q
python -m pytest -q -k "threshold" -x
python -m pip install .
python -m pip install pipx
```

Mock slow or risky calls with `unittest.mock.patch`; use the `tmp_path` fixture for files.

## Environments and packages

```bash
python3 -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install --upgrade pip
python -m pip freeze > requirements.lock
python -m pip list --outdated
python -m pip check
python -m pip install -e .
python -m pip install --require-hashes -r requirements.lock
python -m pip_audit
python -V; which python
```

> **Warning:** Do not run `sudo pip install`. It changes system packages and can break the operating system tools. Use a virtual environment.

> **Warning:** Installing a package runs its code, and a mistyped name can be a malicious look-alike. Check the name and use a lock file with hashes in production.

## Debug and profile

```bash
python -X dev -W error script.py
python -m pdb script.py
python -m trace --trace script.py | head
python -m cProfile -o out.prof -s cumtime script.py
python -m timeit -s 'import json' 'json.dumps({"a": 1})'
python -m http.server 8000 --bind 127.0.0.1
python -m json.tool data.json
python -c 'import sys; print(sys.path)'
```

> **Warning:** `python -m http.server` serves the current directory to anyone who can reach the port. Bind to `127.0.0.1`, and do not run it in a folder with secrets.

> **Warning:** `breakpoint()` and `pdb` left in code stop a service waiting for input. Remove them before you commit.

## Files, JSON and HTTP in scripts

```python
from pathlib import Path
import json, os, subprocess, requests

data = json.loads(Path("config.json").read_text())
Path("out").mkdir(parents=True, exist_ok=True)
r = requests.get(url, timeout=5, headers={"Authorization": f"Bearer {os.environ['TOKEN']}"})
r.raise_for_status()
out = subprocess.run(["kubectl", "get", "pods", "-o", "json"], capture_output=True, text=True, check=True, timeout=30)
pods = json.loads(out.stdout)["items"]
```

> **Warning:** `subprocess.run(cmd, shell=True)` with user input allows command injection. Pass a list of arguments, and keep `shell=False`.

> **Warning:** `requests.get` without `timeout` can hang forever. Always set one, and never disable certificate checks with `verify=False`.

> **Warning:** `pickle.load`, `yaml.load` and `eval` on untrusted data can run code. Use `json` and `yaml.safe_load`.

> **Warning:** Do not put tokens or passwords in the code or in logs. Read them from environment variables or a secrets manager.

## Testing and quality

```bash
python -m pytest -q -x --lf
python -m pytest --cov=app --cov-report=term-missing
python -m ruff check . && python -m ruff format --check .
python -m mypy app
python -m build
python -m twine check dist/*
```

> **Warning:** `twine upload` publishes to a public index and cannot be undone: a version number can never be reused. Test with the test index first.
