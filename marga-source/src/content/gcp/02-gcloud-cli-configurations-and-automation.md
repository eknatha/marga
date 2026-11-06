---
title: gcloud CLI: configurations and automation
minutes: 12
summary: Use the gcloud CLI with named configurations, service account impersonation, output formats and filters, and write safe scripts.
---

Almost everything you do in the console can be scripted. A few habits around configurations, credentials and output formatting keep your scripts safe and your commands readable.

## What you will learn

- Install, login and configurations
- Credentials for people and for code
- Formats, filters and queries
- Safe scripting habits

## Setup

```console
$ gcloud auth login
$ gcloud config configurations create prod
$ gcloud config set project acme-pay-prod
$ gcloud config set compute/region europe-west1
$ gcloud config configurations list
NAME  IS_ACTIVE  ACCOUNT           PROJECT
dev   False      me@acme.example   acme-pay-dev
prod  True       me@acme.example   acme-pay-prod
$ gcloud config configurations activate dev
```

A **configuration** stores account, project, region and zone. Keep one per project and make the active one visible in your prompt. Cloud Shell in the browser has the CLI ready.

## Credentials

- `gcloud auth login` signs in **you** for CLI commands.
- `gcloud auth application-default login` creates **Application Default Credentials** that client libraries and Terraform use locally.
- On Google Cloud, code uses the **attached service account** with no key file.
- Prefer **impersonation**: `--impersonate-service-account=deployer@acme-pay-prod.iam.gserviceaccount.com` runs a command as that account without downloading a key.

## Output

```console
$ gcloud compute instances list --filter="labels.env=prod AND status=RUNNING" \
    --format="table(name,zone.basename(),networkInterfaces[0].networkIP)"
$ gcloud compute instances describe web-1 --zone europe-west1-b --format="value(status)"
$ gcloud run services list --format=json | jq '.[].metadata.name'
```

## Safe scripts

Pass `--project` and `--quiet` explicitly, use `set -euo pipefail`, run a list command first and review it before delete, and prefer Terraform for anything long-lived.

```diagram
title: Where gcloud gets its identity
node: me | You | 0 | 0 | Sign in with gcloud auth login. | A shared login hides who did what.
node: cfg | Configuration | 1 | 0 | Holds account, project and region. | A forgotten active project targets the wrong place.
node: imp | Impersonation | 2 | 0 | Run as a service account without a key file. | Too powerful a service account negates the safety. | security
node: api | Google Cloud APIs | 3 | 0 | Receive the call and check IAM. | Disabled APIs reject the call. | process
node: adc | Application default credentials | 1 | 1 | Used by libraries and Terraform locally. | A downloaded key file can leak. | security
edge: me | cfg
edge: cfg | imp
edge: imp | api
edge: adc | api
```

## Incident: Deleted in the wrong project

> **Incident:** A delete ran against production because an old configuration was still active.

```console
$ gcloud config list
[core] project = acme-pay-prod
$ gcloud compute instances delete batch-1 --zone europe-west1-b
Deleted [batch-1]
```

The engineer believed the CLI pointed at dev. The team added the project to the shell prompt, put --project in scripts and used one configuration per environment.

## Common mistakes

- Relying on whichever project happens to be active
- Downloading service account key files
- Parsing human text output instead of --format
- Scripts without a dry run or list step

```quiz
Q: What does a gcloud configuration hold?
+ Account, project and region settings
- A VM image :: No.
- Billing data :: No.
- A bucket :: No.
> It stores named settings.

Q: What lets code on a VM authenticate without a key file?
+ The attached service account
- A saved password :: No.
- A shared email :: No.
- A cron job :: No.
> Metadata server provides tokens.

Q: Which flag formats output as a table or value?
+ --format
- --force :: No.
- --bind :: No.
- --mode :: No.
> Format controls output.

Q: What is safer than a downloaded key?
+ Service account impersonation
- Emailing the key :: No.
- A shared drive :: No.
- A longer filename :: No.
> No key to leak. The lesson section above explains why.
```

```cards
Configuration :: A named set of gcloud settings
ADC :: Application Default Credentials used by client libraries
Impersonation :: Acting as a service account without its key
Service account :: An identity for programs and machines
Cloud Shell :: A browser terminal with gcloud preinstalled
```
