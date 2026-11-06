---
title: Google Cloud
summary: gcloud commands for projects, networks, compute, storage, Cloud Run, GKE and logs, plus a debugging order for permission errors.
module: gcp
---

## Configuration

```bash
gcloud auth login
gcloud config configurations list
gcloud config set project acme-pay-dev
gcloud services enable compute.googleapis.com run.googleapis.com
gcloud projects get-iam-policy acme-pay-dev --format=json
```

## Network and compute

```bash
gcloud compute networks create prod-vpc --subnet-mode=custom
gcloud compute firewall-rules list --filter="network:prod-vpc"
gcloud compute instances list --filter="labels.env=prod"
gcloud compute ssh web-1 --zone europe-west1-b --tunnel-through-iap
gcloud compute instance-groups managed list-instances web --region europe-west1
```

## Storage and data

```bash
gcloud storage ls --long gs://acme-exports/
gcloud storage buckets describe gs://acme-exports --format='value(iamConfiguration)'
gcloud sql instances list
bq query --dry_run --use_legacy_sql=false 'select count(*) from logs.events where dt = "2026-11-05"'
```

## Containers

```bash
gcloud run deploy web --image=REGION-docker.pkg.dev/PROJECT/app/web:1.0 --region=europe-west1 --no-allow-unauthenticated
gcloud run services describe web --region europe-west1
gcloud container clusters get-credentials prod --region europe-west1
kubectl get pods -A
```

## Logs

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND severity>=ERROR' --limit=20 --freshness=1h
gcloud pubsub subscriptions describe billing
```

## Common errors

| Message | First step |
|---------|------------|
| PERMISSION_DENIED | Policy Troubleshooter, then a narrow role |
| API has not been used | Enable the API in the project |
| Quota exceeded | Check quotas, request an increase or change region |
| Blocked by organization policy | Read the constraint, use the approved path |
| VPC Service Controls violation | Read the audit log violation entry |

## Safe habits

```bash
gcloud config list
```

```bash
gcloud projects get-iam-policy my-project --format=json
```

```bash
gcloud compute instances list --filter="status=RUNNING"
```

```bash
gcloud logging read 'severity>=ERROR' --limit=10 --freshness=1h
```

```bash
gcloud run services describe web --region=europe-west1
```

> **Warning:** Check `gcloud config list` before every change. The active project decides where a command runs.

> **Danger:** Granting `roles/owner` or `roles/editor` to a service account gives it broad power. Use the narrowest predefined role.

> **Warning:** Making a bucket public with `allUsers` exposes every object. Use uniform access and signed URLs instead.

> **Warning:** Deleting a project starts a 30 day shutdown for everything in it. Confirm the project ID first.
