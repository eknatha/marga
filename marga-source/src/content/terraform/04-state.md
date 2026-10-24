---
title: State, backends and locking
minutes: 16
summary: Understand what Terraform state is, store it remotely with locking, and use import and state commands without breaking things.
---

Terraform has to remember which real resources belong to which blocks in your code. That memory is the **state**. It is the most important and most dangerous file in the system: lose it and Terraform forgets what it created, corrupt it and plans become nonsense, expose it and you leak secrets.

## What you will learn

- What state contains and why it matters
- Remote backends and state locking
- Importing existing resources
- Safe use of the `terraform state` commands

## What state is

State maps each resource address (`aws_s3_bucket.logs`) to the real object's ID and records its attributes. During `plan`, Terraform refreshes state from the real world, compares it with your code, and computes the difference.

State also contains **every attribute**, including passwords and keys that you marked sensitive. Treat it as a secret.

> **Warning:** Never edit the state file by hand and never share it over chat or email. Keep it out of any repository, and restrict who can read the storage that holds it.

## Remote backends and locking

A local `terraform.tfstate` file works for experiments. On a team it fails quickly: two people run `apply` at once, or one person's copy is out of date. A **remote backend** stores state centrally, and **locking** stops two runs from changing it simultaneously.

```hcl
terraform {
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "shop/prod/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

This stores state in an S3 bucket with encryption and uses S3's own lock file support (recent Terraform releases). Older setups use a DynamoDB table for locks, and you will still see `dynamodb_table` in existing code. For the storage itself, enable bucket **versioning** so you can recover a previous state, block public access, and allow only the pipeline and a small group to read it. Azure Storage and Terraform Cloud-style services provide the same ideas.

Use a separate `key` (or a separate bucket or account) per environment, so a mistake in dev can never touch production state.

## Importing existing resources

When something already exists in the cloud, bring it under management instead of recreating it. With current Terraform, write the target in code and add an `import` block:

```hcl
import {
  to = aws_s3_bucket.legacy
  id = "acme-legacy-reports"
}

resource "aws_s3_bucket" "legacy" {
  bucket = "acme-legacy-reports"
}
```

Run `terraform plan`, which shows the import, and `apply` to record it. Then keep running `plan` and adjust the code until it reports no changes. The older command form is `terraform import aws_s3_bucket.legacy acme-legacy-reports`.

## State commands

```console
$ terraform state list
$ terraform state show aws_s3_bucket.logs
$ terraform state mv aws_s3_bucket.logs aws_s3_bucket.audit_logs
$ terraform state rm aws_s3_bucket.legacy
```

| Command | Effect |
|---------|--------|
| `state list` / `show` | Read-only inspection |
| `state mv` | Renames the address in state only (prefer a `moved` block, which is reviewable) |
| `state rm` | Makes Terraform forget a resource **without** deleting it in the cloud |
| `force-unlock ID` | Releases a stuck lock. Use only if you are certain no run is active |

## Incident: "Error acquiring the state lock"

> **Incident:** A pipeline run fails immediately with `Error: Error acquiring the state lock`, and the message shows a lock held by another run.

```console
Error: Error acquiring the state lock
Lock Info:
  ID:        3f6c0a1e-...
  Operation: OperationTypeApply
  Who:       ci-runner@build-17
  Created:   2026-10-24 02:14:09 UTC
```

First find out whether that run is genuinely still going. Look at your CI system for job `build-17`. If it is still applying, **wait**: unlocking during an apply is how state gets corrupted. If the job crashed or was cancelled and clearly is not running, release the lock deliberately:

```console
$ terraform force-unlock 3f6c0a1e-...
```

Then run `terraform plan` to check that state and reality agree. Prevent recurrences by allowing one run per environment at a time in the pipeline, and by never killing an apply mid-way.

## Common mistakes

- Keeping state in a repository or on a laptop
- No encryption, versioning or access control on the state bucket
- One giant state for everything, so every plan is slow and a mistake can touch anything
- Running `force-unlock` without checking for an active run

```quiz
Q: What does Terraform state store?
- Only the code
+ A mapping from resource addresses to real resource IDs and their attributes
- Cloud provider passwords only
- Plan output
> State links code to reality and includes attribute values, some of them sensitive.

Q: Why use a remote backend with locking?
- It makes plans faster
+ It shares state safely and prevents concurrent runs from corrupting it
- It removes the need for plans
- It encrypts the code
> Teams need one consistent state and mutual exclusion on writes.

Q: What does terraform state rm do to the real resource?
- Deletes it
+ Nothing; Terraform just stops tracking it
- Replaces it
- Moves it to another region
> It removes the entry from state only.

Q: A run holds the state lock and is still applying. What should you do?
- Force-unlock immediately
+ Wait for it to finish
- Delete the state file
- Start a second apply
> Breaking a live lock risks two writers and a corrupted state.
```

```cards
What is state? :: Terraform's record mapping code addresses to real resources and their attributes
What does locking prevent? :: Two runs modifying the same state at the same time
state rm effect? :: Terraform forgets the resource; the real one is not deleted
Safest way to rename a resource address? :: A moved block, which can be reviewed in a plan
```
