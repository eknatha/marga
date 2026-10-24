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
