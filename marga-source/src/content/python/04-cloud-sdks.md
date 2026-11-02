---
title: Cloud SDKs: boto3 and the Azure SDK
minutes: 16
summary: Automate AWS with boto3 and Azure with its Python SDK, authenticate without hard-coded keys, paginate results and write idempotent scripts.
---

The cloud consoles and CLIs are fine for exploring, but repeatable work belongs in code. Both AWS and Azure publish official Python SDKs, and the patterns you learn for one transfer directly to the other.

## What you will learn

- Authenticating with roles and default credential chains
- Listing and filtering resources with boto3, including pagination
- The same tasks with the Azure SDK
- Writing scripts that are safe to run twice

## Authentication first

Never put access keys in a script. On a developer machine use SSO or a profile. On a server or pipeline use an **instance role**, a **workload identity** or an assumed role, so the SDK finds short-lived credentials by itself.

```console
$ aws sso login --profile dev
$ export AWS_PROFILE=dev
$ python3 -c "import boto3; print(boto3.client('sts').get_caller_identity()['Arn'])"
arn:aws:sts::123456789012:assumed-role/Developer/reddy
```

Always print the identity first in any script that changes things. Running the right code against the wrong account is a classic way to cause an outage.

## boto3 essentials

```python
import boto3

ec2 = boto3.client("ec2", region_name="eu-west-1")

paginator = ec2.get_paginator("describe_instances")
pages = paginator.paginate(
    Filters=[{"Name": "tag:Env", "Values": ["prod"]},
             {"Name": "instance-state-name", "Values": ["running"]}]
)
for page in pages:
    for reservation in page["Reservations"]:
        for inst in reservation["Instances"]:
            name = next((t["Value"] for t in inst.get("Tags", []) if t["Key"] == "Name"), "-")
            print(inst["InstanceId"], inst["InstanceType"], name)
```

API calls return at most one page of results. A **paginator** hides the continuation tokens; without it you silently process only the first page. Filter on the server with `Filters=` instead of downloading everything.

## A safe, repeatable task

Scripts that change infrastructure should be **idempotent**: running them twice has the same result as once.

```python
import boto3
from botocore.exceptions import ClientError

s3 = boto3.client("s3")

def ensure_bucket(name: str, region: str) -> None:
    try:
        s3.head_bucket(Bucket=name)
        print("exists:", name)
    except ClientError as exc:
        if exc.response["Error"]["Code"] not in ("404", "NoSuchBucket"):
            raise
        s3.create_bucket(Bucket=name,
                         CreateBucketConfiguration={"LocationConstraint": region})
        s3.put_public_access_block(
            Bucket=name,
            PublicAccessBlockConfiguration={
                "BlockPublicAcls": True, "IgnorePublicAcls": True,
                "BlockPublicPolicy": True, "RestrictPublicBuckets": True})
        print("created:", name)

ensure_bucket("acme-reports-eu", "eu-west-1")
```

Check first, create only if missing, and apply the secure settings in the same script.

## The Azure equivalent

```python
from azure.identity import DefaultAzureCredential
from azure.mgmt.compute import ComputeManagementClient

cred = DefaultAzureCredential()          # CLI login, managed identity, or env vars
compute = ComputeManagementClient(cred, subscription_id="00000000-0000-0000-0000-000000000000")

for vm in compute.virtual_machines.list_all():
    print(vm.name, vm.location, vm.hardware_profile.vm_size)
```

`DefaultAzureCredential` tries several sources in order, so the same code works on a laptop after `az login` and in Azure with a managed identity. Install the packages in your virtual environment:

```console
$ python -m pip install boto3 azure-identity azure-mgmt-compute
$ python -m pip freeze | grep -E "boto3|azure"
```

## Incident: the script that ran in the wrong account

> **Incident:** An engineer runs a cleanup script that deletes untagged volumes. Their shell still has the production profile exported from the previous day. Forty production volumes are removed before the first alert fires.

Credentials came from ambient shell state, and the script never confirmed where it was running. Add three guards:

```python
import sys
import boto3

EXPECTED_ACCOUNT = "111122223333"
account = boto3.client("sts").get_caller_identity()["Account"]
if account != EXPECTED_ACCOUNT:
    sys.exit(f"refusing to run in account {account}")
```

Pair this with a dry-run default, a tag-based allow list and snapshots before deletion. Production permissions should also be separate roles that require an explicit assume-role step.

## Common mistakes

- Hard-coding access keys in scripts or committing them
- Ignoring pagination and processing only the first page
- Running without checking the account or subscription
- Writing scripts that fail when a resource already exists
- Catching `ClientError` broadly and hiding real permission problems

```quiz
Q: What is the best way for a script on an EC2 instance to authenticate?
- Embed an access key in the script
+ Use the instance role through the default credential chain
- Ask the user to type a key
- Store a key in the AMI
> Roles provide short-lived credentials without any secret in code.

Q: Why use a paginator?
- It makes calls faster
+ API responses are split into pages and you would otherwise see only the first
- It encrypts results
- It is needed for authentication
> Without pagination, large result sets are silently truncated.

Q: What does idempotent mean for an automation script?
- It runs only once
+ Running it repeatedly has the same result as running it once
- It never prints output
- It requires admin rights
> Idempotent scripts are safe to retry and to schedule.

Q: What does DefaultAzureCredential do?
+ Tries several credential sources in order, such as CLI login or managed identity
- Stores your password
- Creates a service principal
- Disables authentication
> The same code works locally and in Azure without changes.
```

```cards
First thing a changing script should print? :: The identity and account or subscription it is acting on
What is a boto3 paginator for? :: Iterating through all pages of a list API without handling tokens by hand
Why filter server-side? :: Less data transferred, faster, and fewer permissions needed
Safe default for destructive scripts? :: Dry run, account check, tag allow list and a snapshot first
```
