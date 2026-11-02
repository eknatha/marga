---
title: Infrastructure as code and HCL basics
minutes: 14
summary: Understand why infrastructure is described in files, learn the Terraform workflow, and read the basic HCL syntax.
---

A teammate builds a network by clicking through a cloud console. Six months later nobody remembers which options they chose, the staging copy differs from production in ways no one can list, and rebuilding after a disaster is guesswork. Infrastructure as code (IaC) replaces memory and clicking with files that can be reviewed, repeated and tested.

## What you will learn

- What infrastructure as code gives you
- The Terraform workflow: init, plan, apply, destroy
- HCL blocks, arguments and references
- How to read a plan

## Why IaC

- **Repeatable**: the same files create the same result in every environment
- **Reviewable**: changes appear as a diff that a colleague approves before anything happens
- **Documented**: the files are the truth about what exists
- **Recoverable**: rebuilding is running a command, not recalling a procedure

Terraform is **declarative**. You describe the end result ("a storage bucket with these settings") and Terraform works out the steps to get there from whatever exists now.

## The workflow

| Command | What it does |
|---------|--------------|
| `terraform init` | Downloads providers and modules, prepares the backend |
| `terraform fmt` | Formats files consistently |
| `terraform validate` | Checks syntax and internal consistency |
| `terraform plan` | Shows what would change, without changing anything |
| `terraform apply` | Makes the changes (asks for confirmation) |
| `terraform destroy` | Removes everything this configuration manages |

## HCL in five minutes

HCL (HashiCorp Configuration Language) is built from **blocks** that contain **arguments**:

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "eu-west-1"
}

resource "aws_s3_bucket" "logs" {
  bucket = "eknatha-demo-logs-12345"

  tags = {
    Environment = "dev"
    Owner       = "platform"
  }
}

output "bucket_arn" {
  value = aws_s3_bucket.logs.arn
}
```

Read it this way:

- `terraform` pins the Terraform and provider versions, so a teammate or a pipeline gets the same behaviour.
- `provider` configures how to talk to a platform.
- `resource "TYPE" "NAME"` declares one thing to manage. The pair of type and name (`aws_s3_bucket.logs`) is its address inside Terraform.
- `aws_s3_bucket.logs.arn` is a **reference**. Terraform sees that the output depends on the bucket and orders the work correctly without being told.
- `~> 5.0` means "5.x but not 6.0".

## Reading a plan

```console
$ terraform init
$ terraform plan
Terraform will perform the following actions:

  # aws_s3_bucket.logs will be created
  + resource "aws_s3_bucket" "logs" {
      + bucket = "eknatha-demo-logs-12345"
      + id     = (known after apply)
      ...
    }

Plan: 1 to add, 0 to change, 0 to destroy.
```

This is abbreviated sample output. The symbols matter:

| Symbol | Meaning |
|--------|---------|
| `+` | Create |
| `~` | Update in place |
| `-` | Destroy |
| `-/+` | Destroy and recreate (replacement) |

**Always read the summary line and look for `-` and `-/+` before applying.** A replacement of a database or a load balancer is the kind of change a plan exists to catch.

> **Tip:** Save a plan with `terraform plan -out=tfplan` and apply exactly that file with `terraform apply tfplan`. What was reviewed is then exactly what runs.

## Incident: the plan wants to destroy the database

> **Incident:** A small change to a tag is proposed in review. The plan output says `1 to add, 0 to change, 1 to destroy`, and the destroyed resource is the production database.

```console
  # aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ identifier = "shop-prod" -> "shop-production" # forces replacement
```

Someone renamed the `identifier` while "tidying up". For that resource, a new identifier means a new database, so Terraform plans to delete the old one. The plan caught it because the reviewer read it. Revert the rename, rerun the plan, and confirm it now shows `No changes` or only the tag update. Protect the resource so this cannot happen quietly again:

```hcl
resource "aws_db_instance" "main" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}
```

With `prevent_destroy`, any plan that would delete it fails with an error. It is a safety net, not a substitute for reading plans.

## Common mistakes

- Applying without reading the plan
- Editing resources in the console, so reality drifts from the code
- Leaving provider versions unpinned
- Using the same names and state for every environment

```quiz
Q: What does "declarative" mean for Terraform?
- You write step-by-step scripts
+ You describe the desired end state and Terraform works out the steps
- It only runs on a schedule
- It can only create resources
> Terraform compares desired configuration with known state and computes the changes.

Q: In a plan, what does -/+ mean?
- The resource is unchanged
- The resource is updated in place
+ The resource will be destroyed and recreated
- The resource will be imported
> A replacement. Check it carefully, especially for stateful resources.

Q: What does terraform plan do?
- Applies changes after confirmation
+ Shows the changes that would be made without making them
- Deletes the state
- Formats the code
> Plan is a preview.

Q: What does the version constraint ~> 5.0 allow?
- Only exactly 5.0
- Any version, including 6.x
+ Versions from 5.0 up to but not including 6.0
- Only versions below 5.0
> The pessimistic constraint allows increments of the last specified part.
```

```cards
Terraform workflow commands? :: init, validate, plan, apply, destroy
What is a resource address? :: TYPE.NAME, for example aws_s3_bucket.logs
Why save a plan with -out? :: So apply runs exactly what was reviewed
What does prevent_destroy do? :: Makes any plan that would delete that resource fail
```
