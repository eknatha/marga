---
title: Google Cloud: organization, projects and billing
minutes: 12
summary: Learn how Google Cloud organises resources into organization, folders and projects, and how IAM, billing accounts and budgets fit on top.
---

Before creating any server, learn the tree that holds it. Google Cloud's hierarchy decides who can do what, where policies apply and who receives the bill.

## What you will learn

- Organization, folders and projects
- Project id, name and number
- IAM inheritance and billing accounts
- Budgets and labels

## The hierarchy

An **organization** (tied to a Cloud Identity or Workspace domain) contains **folders** (for teams or environments) that contain **projects**. A project holds resources: virtual machines, buckets, databases. IAM policies and **organization policies** set higher up are **inherited** by everything below.

| Level | Typical use |
|---|---|
| Organization | Company-wide policies and admins |
| Folder | Team, business unit or environment |
| Project | One application in one environment |
| Resource | A VM, bucket, topic |

A project has a **name** (editable), an **id** (globally unique, permanent) and a **number**. Use the id in commands and code.

## Billing

A **billing account** pays for projects linked to it. Set **budgets** with alerts at 50, 90 and 100 percent, and export billing data to BigQuery for analysis. Use **labels** (`env=prod`, `team=payments`) to split costs.

```console
$ gcloud projects create acme-pay-prod --folder=123456789
$ gcloud billing projects link acme-pay-prod --billing-account=ABCDEF-123456-7890AB
$ gcloud services enable compute.googleapis.com --project=acme-pay-prod
```

APIs are **off by default** and enabled per project.

```diagram
title: The Google Cloud hierarchy
node: org | Organization | 0 | 1 | Top of the tree; company policies live here. | A policy set here applies everywhere.
node: fold | Folders | 1 | 1 | Group projects by team or environment. | Deep folder trees get hard to manage. | process
node: dev | Dev project | 2 | 0 | Test resources with relaxed access. | Shared with prod it risks production data. | store
node: prod | Prod project | 2 | 1 | Production resources with strict access. | Broad roles here widen the blast radius. | store
node: bill | Billing account | 2 | 2 | Pays for linked projects. | No budget means surprise bills. | security
edge: org | fold
edge: fold | dev
edge: fold | prod
edge: bill | prod
```

## Incident: Cleanup in the wrong place

> **Incident:** A script meant for dev deleted production disks because both lived in one project.

```console
$ gcloud compute disks delete prod-db-disk --project acme-app
Deleted [prod-db-disk]
project acme-app contains dev, test and prod resources
```

One project mixed all environments. The team created a project per environment, gave the cleanup tool permissions only in dev, and set budgets and alerts per project.

## Common mistakes

- One project for every environment
- Primitive roles such as Owner given widely
- No budget alert
- Using project names instead of ids in scripts

```quiz
Q: What is the main boundary for permissions and billing?
+ The project
- The VM :: No.
- The label :: No.
- The region :: No.
> Projects group resources.

Q: How do IAM policies flow?
+ Down the hierarchy
- Up only :: No.
- Sideways :: No.
- Not at all :: No.
> Children inherit parents' policies.

Q: Are APIs enabled by default?
+ No, per project
- Yes everywhere :: No.
- Only in folders :: No.
- Only for owners :: No.
> Enable what you use.

Q: What are labels for?
+ Cost split and organisation
- Encryption :: No.
- Networking :: No.
- Backups :: No.
> Key-value tags on resources.
```

```cards
Organization :: The root node of a company's Google Cloud resources
Folder :: A grouping of projects
Project :: The container for resources, billing and permissions
Billing account :: The payment object linked to projects
Organization policy :: A constraint applied down the hierarchy
```
