---
title: GCP IAM and service accounts
minutes: 12
summary: Understand Google Cloud IAM roles, the resource hierarchy, service accounts and how to avoid long-lived keys.
---

Google Cloud IAM has the same goals as other clouds but its own model: a resource hierarchy, role bindings and service accounts that are both identities and resources. Knowing it prevents common mistakes such as broad roles and exported keys.

## What you will learn

- The resource hierarchy and inheritance
- Roles: basic, predefined and custom
- Service accounts and impersonation
- Avoiding keys with workload identity

## Hierarchy

Policies are attached to **organization**, **folder**, **project** or individual resources, and grants are **inherited downward**. A role given at the folder applies to every project beneath it, so grant at the lowest level that works.

## Roles

**Basic roles** such as Owner, Editor and Viewer are very broad and should be avoided in production. **Predefined roles** are scoped to a service, such as `roles/storage.objectViewer`. **Custom roles** collect exact permissions when no predefined role fits.

```bash
gcloud projects add-iam-policy-binding shop-prod \
  --member="serviceAccount:api@shop-prod.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
gcloud projects get-iam-policy shop-prod --format=json | jq '.bindings[].role' | sort | uniq -c
```

## Service accounts

A workload runs **as** a service account. Create one per workload, give it minimal roles and attach it to the resource. To act as another account, use **impersonation**, which requires an explicit role.

```bash
gcloud iam service-accounts create api --display-name "API workload"
gcloud auth print-access-token --impersonate-service-account=api@shop-prod.iam.gserviceaccount.com
```

## No keys

Downloaded JSON keys are long-lived secrets. Prefer service accounts attached to Compute, Cloud Run or GKE through **Workload Identity**, and **Workload Identity Federation** for workloads outside Google Cloud. Enforce an organization policy that disables key creation.

## Incident: The key in the repository

> **Incident:** A service account key was committed and abused.

```console
commit a1b2c3: add sa-key.json
audit: storage.objects.list from 203.0.113.50
principal: api@shop-prod.iam.gserviceaccount.com
```

The key never expired and was valid from anywhere. After revoking it the team disabled key creation by organization policy, moved workloads to workload identity and added a scanner that blocks key files in commits.

## Common mistakes

- Using Owner or Editor in production
- Downloaded service account keys
- One service account shared by many workloads
- Granting roles at the folder when a project is enough

```quiz
Q: How do permissions flow in the hierarchy?
+ Downward from parent to child
- Upward only :: No.
- Sideways :: No.
- They do not :: No.
> Inheritance is downward.

Q: Which roles should you avoid in production?
+ Basic roles like Owner and Editor
- Predefined roles :: No.
- Custom roles :: No.
- Viewer for audits :: No.
> They are too broad. The lesson section above explains why.

Q: What replaces service account keys?
+ Workload identity
- Longer passwords :: No.
- Shared files :: No.
- Email :: No.
> Short-lived credentials.

Q: What does impersonation need?
+ An explicit role to act as the account
- Nothing :: No.
- The key file :: No.
- Public access :: No.
> It is controlled. The lesson section above explains why.
```

```cards
Resource hierarchy :: Organization, folder, project and resource
Predefined role :: Google-managed role scoped to a service
Impersonation :: Acting as a service account
Workload Identity :: Keyless access for workloads
```
