---
title: Security, cost and debugging on Google Cloud
minutes: 14
summary: Apply Google Cloud security controls such as IAM, organization policy and VPC Service Controls, control cost, and debug permission and quota errors.
---

Google Cloud is secure by design but easy to misconfigure. The same short list of controls shows up in nearly every well-run organisation, and a repeatable debugging routine saves hours.

## What you will learn

- IAM least privilege and recommender
- Organization policies and VPC Service Controls
- Audit logs and cost control
- A routine for permission, quota and API errors

## IAM

Grant **predefined roles** to groups at the lowest level (bucket or project, not organization). Avoid basic roles Owner, Editor and Viewer in production. Use **IAM Recommender** to remove unused permissions and **conditions** for time-limited access. Service accounts get one job each.

## Organization policies and perimeters

Constraints enforced across the tree: disable service account key creation, require OS Login, restrict public IPs, restrict resource locations, enforce public access prevention. **VPC Service Controls** draw a perimeter around sensitive services (BigQuery, Cloud Storage) so data cannot be copied out even with valid credentials from outside the perimeter. **Cloud Audit Logs** record admin activity (always on) and data access (enable for sensitive data). **Security Command Center** surfaces misconfigurations.

## Cost

Set budgets and alerts, export billing to BigQuery, label resources, rightsize with recommendations, delete idle disks and IPs, use committed use discounts for steady load and Spot for tolerant jobs.

## Debugging errors

| Error | Meaning | First step |
|---|---|---|
| `PERMISSION_DENIED` | Identity lacks a permission | Policy Troubleshooter for the exact permission |
| `API has not been used` | Service not enabled in the project | `gcloud services enable` |
| `RESOURCE_EXHAUSTED` / quota | Limit reached | Check quotas page; request an increase or change region |
| `Request is prohibited by organization's policy` | Org policy denies | View the constraint and use the approved path |
| VPC-SC violation | Perimeter blocked the call | Read the audit log violation entry |

```diagram
title: Debugging a denied request
node: err | Error message | 0 | 0 | Names the code and often the permission. | Skimming the message hides the real cause.
node: kind | Which kind | 1 | 0 | Permission, API, quota, policy or perimeter. | A wrong guess leads to a wrong fix.
node: pt | Policy Troubleshooter | 2 | 0 | Shows which role would allow the call. | Granting Owner hides the real gap. | observe
node: log | Audit logs | 2 | 1 | Show the caller, method and denial reason. | Disabled data-access logs hide reads. | observe
node: fix | Smallest fix | 3 | 0 | Grant a narrow role or enable the API. | Broad grants widen the blast radius. | security
edge: err | kind
edge: kind | pt
edge: kind | log
edge: pt | fix
```

## Incident: Owner to make it work

> **Incident:** A permission error was silenced by granting Owner to a developer.

```console
$ gcloud projects get-iam-policy acme-pay-prod --flatten=bindings --filter=bindings.role:roles/owner
user:dev@acme.example  roles/owner
troubleshooter: missing storage.objects.get on bucket acme-exports
```

The developer needed one read permission on one bucket. The team removed Owner, granted the narrow bucket role and enabled IAM Recommender reviews every quarter.

## Common mistakes

- Granting Owner or Editor to fix errors
- Service account keys left in the wild
- No budgets or labels
- No data-access audit logging for sensitive data

```quiz
Q: What shows the exact missing permission?
+ Policy Troubleshooter
- Cloud DNS :: No.
- Billing export :: No.
- Filestore :: No.
> It evaluates access.

Q: What do VPC Service Controls protect against?
+ Data leaving a perimeter
- Slow disks :: No.
- Missing labels :: No.
- Cold starts :: No.
> They prevent exfiltration.

Q: First fix for API has not been used?
+ Enable the API in the project
- Delete the project :: No.
- Grant Owner :: No.
- Change regions :: No.
> APIs are off by default.

Q: Which should you avoid in production?
+ Basic Owner and Editor roles
- Predefined roles :: No.
- Groups :: No.
- Conditions :: No.
> They are too broad. The lesson section above explains why.
```

```cards
Predefined role :: A Google-curated set of permissions for a job
Organization policy :: A constraint applied across the hierarchy
VPC Service Controls :: Perimeters that restrict data movement
Audit log :: A record of admin and data access activity
Policy Troubleshooter :: Tool that explains why access was allowed or denied
```
