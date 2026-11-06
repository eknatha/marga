---
title: Terraform on Google Cloud
minutes: 12
summary: Manage Google Cloud with Terraform: the google provider, remote state in Cloud Storage, service accounts for pipelines, and project factories.
---

Terraform is the most common way to manage Google Cloud as code. The provider is simple; the work is in state, identity and structure, which decide whether it stays safe as the team grows.

## What you will learn

- Provider, backend and authentication
- Remote state in Cloud Storage
- Pipelines with federated identity
- Structure: environments, modules and project factories

## Provider and state

```hcl
terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 6.0" }
  }
  backend "gcs" {
    bucket = "acme-tfstate-prod"
    prefix = "network"
  }
}

provider "google" {
  project = var.project_id
  region  = "europe-west1"
}

resource "google_compute_network" "vpc" {
  name                    = "prod-vpc"
  auto_create_subnetworks = false
}
```

The `gcs` backend stores state in a bucket with locking. Turn on **object versioning** so you can recover a bad state, restrict access to the bucket, and use **one state per layer** (network, data, apps) to limit blast radius.

## Authentication

Locally use `gcloud auth application-default login`, or better `GOOGLE_IMPERSONATE_SERVICE_ACCOUNT=tf-deployer@...`. In CI use **Workload Identity Federation** so GitHub or GitLab exchanges its token for the service account with no key stored.

## Structure

Use modules for patterns (a standard project, a VPC), a **project factory** module to create projects with budgets, APIs and service accounts, and review `terraform plan` output on pull requests. **Config Connector** manages Google resources from Kubernetes objects, and **Infrastructure Manager** runs Terraform as a Google-managed service.

```diagram
title: Terraform pipeline on Google Cloud
node: pr | Pull request | 0 | 0 | Plan output reviewed by people. | An unreviewed plan can destroy resources.
node: ci | CI job | 1 | 0 | Runs fmt, validate, plan and apply. | Long-lived keys in settings can leak.
node: wif | Workload Identity Federation | 2 | 0 | Token exchange for a narrow service account. | A broad role defeats the benefit. | security
node: state | State bucket | 3 | 0 | Versioned and locked remote state. | Public or shared access exposes secrets in state. | store
node: gcp | Google Cloud resources | 3 | 1 | The projects, networks and services managed. | Console edits cause drift. | store
edge: pr | ci
edge: ci | wif
edge: wif | state
edge: wif | gcp
```

## Incident: The leaked key

> **Incident:** A service account key in pipeline settings was exposed with the repository.

```console
$ gcloud iam service-accounts keys list --iam-account=tf-deployer@acme.iam.gserviceaccount.com
KEY_ID  CREATED_AT  2024-06-12
audit log: tf-deployer from 203.0.113.9 (unknown)
```

The key had wide rights and no expiry. The team deleted it, moved the pipeline to federation, narrowed the role per layer and enabled an organization policy blocking new key creation.

## Common mistakes

- Committing keys or state to Git
- One giant state for everything
- A single owner-level deployer
- A state bucket without versioning or access limits

```quiz
Q: Where should state live on Google Cloud?
+ A versioned Cloud Storage bucket
- A laptop :: No.
- An email :: No.
- A public repo :: No.
> GCS backend supports locking.

Q: What replaces key files in CI?
+ Workload Identity Federation
- Longer keys :: No.
- Shared drives :: No.
- Plain passwords :: No.
> Short-lived token exchange.

Q: Why split state per layer?
+ Limit blast radius
- More cost :: No.
- Bigger plans :: No.
- Fewer reviews :: No.
> Smaller units fail separately.

Q: What does a project factory do?
+ Creates standard projects with settings
- Compiles code :: No.
- Sends mail :: No.
- Replaces IAM :: No.
> Repeatable project setup.
```

```cards
Backend :: Where Terraform stores its state
Workload Identity Federation :: Exchanging external tokens for a Google identity
Project factory :: A module that creates configured projects
Config Connector :: Kubernetes add-on to manage Google resources
Infrastructure Manager :: Google-managed service that runs Terraform
```
