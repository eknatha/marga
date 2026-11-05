---
title: SRE automation: AWS with boto3, safely
minutes: 13
summary: Write boto3 scripts that paginate, filter by tags, default to a dry run and use least-privilege roles, so automation helps and never surprises.
---

Scripts that talk to a cloud account can delete real things. The difference between a helpful script and an outage is a few habits: listing completely, selecting narrowly, previewing first and running with the least permission needed.

## What you will learn

- Create sessions and clients with the right profile, role and region
- Use paginators so you never miss resources beyond the first page
- Select by tags and keep a dry-run default
- Handle errors from the API cleanly

## Sessions, roles and regions

Never hard-code keys. Use a named profile or an assumed role, and set the region explicitly, since a script that quietly uses the default region will inspect the wrong place.

```python
import boto3

def session(profile=None, region="eu-west-1"):
    return boto3.Session(profile_name=profile, region_name=region)

ec2 = session().client("ec2")
sts = session().client("sts")
print(sts.get_caller_identity()["Arn"])
```

Print the caller identity at the start of a risky script. It is a cheap guard against running against production by mistake.

## Always paginate

API calls return limited pages. A loop that reads only the first response will miss resources and make your report wrong.

```python
def untagged_volumes(ec2):
    paginator = ec2.get_paginator("describe_volumes")
    for page in paginator.paginate(Filters=[{"Name": "status", "Values": ["available"]}]):
        for vol in page["Volumes"]:
            tags = {t["Key"]: t["Value"] for t in vol.get("Tags", [])}
            if "owner" not in tags:
                yield vol["VolumeId"], vol["Size"]
```

Server-side filters reduce data; tags decide ownership. Treat a missing tag as "unknown owner", which is a reason to ask, not a reason to delete.

## Dry run first

```python
import botocore.exceptions as bx

def delete_volumes(ec2, ids, apply=False):
    for vid in ids:
        try:
            ec2.delete_volume(VolumeId=vid, DryRun=not apply)
        except bx.ClientError as err:
            code = err.response["Error"]["Code"]
            if code == "DryRunOperation":
                print("would delete", vid)
            else:
                print("failed", vid, code)
```

Many EC2 calls support `DryRun`, which returns the error `DryRunOperation` when the call would have succeeded. For services without it, implement your own: print the plan by default and require an explicit `--apply` flag. Catch `ClientError` and look at the error code, because a throttling or permission error needs different handling from a missing resource.

## Least privilege

Give automation its own role that can do only the listed actions in the accounts it needs, and no more. A read-only role for reporting scripts and a separate, narrower one for changes makes accidents smaller. Log every change with the caller identity, the resource and the time.

```predict
Q: A cleanup script lists volumes with one describe_volumes call and finds 1000 results. Is the list complete?
???
Not necessarily. Responses are paged, so use a paginator or follow the next token until none remains.
> Always paginate.
```

## Incident: The cleanup that found nothing and then too much

> **Incident:** A script meant to delete unattached volumes reported "0 candidates" in the test account and deleted volumes in production.

```console
$ python cleanup.py --region eu-west-1
caller: arn:aws:iam::111122223333:role/ops-admin
deleting 14 volumes
```

The test run had used the default region, which had no volumes. In production the region was set, the role was an admin role, and the script had no dry run. Some volumes were detached snapshots-in-waiting for a migration. The team restored from snapshots, changed the script to print the plan by default, require `--apply`, check an `owner` tag and run with a narrow role, and added the caller identity and region to the first line of output.

## Common mistakes

- Reading only the first page of results
- Relying on the default region or credentials
- Deleting on "no owner tag" without asking
- Using one powerful role for everything

```quiz
Q: Why use a paginator?
+ API responses are limited in size, so you must read every page
- To make the script faster than the API :: It does not speed the API.
- To hide errors :: It does not.
- To avoid credentials :: Unrelated.
> Missing pages means wrong results.

Q: What does a DryRunOperation error mean for an EC2 call made with DryRun?
+ The call would have succeeded
- The call failed :: It reports the opposite.
- The account is closed :: Not the meaning.
- The region is wrong :: Not the meaning.
> It confirms permissions without making the change.

Q: What is a safe default for a destructive script?
+ Print the plan and require an explicit apply flag
- Delete immediately :: Too risky.
- Run only at night :: Timing is not safety.
- Hide the output :: Reduces visibility.
> Preview the plan before you apply it.

Q: Why print the caller identity at the start?
+ To confirm which account and role the script is using
- To speed up API calls :: It does not.
- To avoid tagging :: Unrelated.
- To rotate keys :: Unrelated.
> It catches wrong-account mistakes.
```

```cards
Paginator :: reads every page of a list API
DryRun :: asks the API to check permission without changing anything
Caller identity :: sts get_caller_identity shows the active role
ClientError :: botocore exception with an error code
Safe default :: plan only, then apply with a flag
```
