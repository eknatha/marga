---
title: Terraform
summary: Workflow commands, HCL syntax, state operations, meta-arguments and safe pipeline practices.
module: terraform
---

## Workflow

```bash
terraform init
terraform fmt -recursive
terraform validate
terraform plan -out=tfplan
terraform apply tfplan
terraform destroy
terraform output
terraform output -raw bucket_name
```

| Plan symbol | Meaning |
|-------------|---------|
| `+` | Create |
| `~` | Update in place |
| `-` | Destroy |
| `-/+` | Replace (destroy and recreate) |

Read the summary line and every `-` or `-/+` before you apply.

## Configuration skeleton

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
  region = var.region
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-${var.environment}"
}

output "bucket_arn" {
  value = aws_s3_bucket.logs.arn
}
```

## Variables

```hcl
variable "environment" {
  type        = string
  description = "dev, staging or prod"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Must be dev, staging or prod."
  }
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

Precedence (low to high): default, `TF_VAR_name`, `terraform.tfvars`, `-var-file`, `-var`.

## Expressions

```hcl
locals {
  prefix = "shop-${var.environment}"
  is_prod = var.environment == "prod"
  names   = [for n in var.names : upper(n)]
  size    = local.is_prod ? "m5.large" : "t3.micro"
}
```

| Function | Example |
|----------|---------|
| `merge(a, b)` | Combine maps |
| `lookup(map, key, default)` | Safe map access |
| `cidrsubnet(cidr, 8, 1)` | Carve a subnet |
| `join(",", list)` | Make a string |
| `try(expr, fallback)` | Fall back on error |

Experiment with `terraform console`.

## Meta-arguments

```hcl
resource "aws_subnet" "multi" {
  for_each          = var.subnets          # map or set, stable keys
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
}

resource "aws_instance" "web" {
  count = var.enabled ? 1 : 0              # on/off switch
  lifecycle {
    prevent_destroy       = true
    create_before_destroy = true
    ignore_changes        = [tags]
  }
}
```

Prefer `for_each` to `count` for collections; `count` shifts indexes when an item is removed.

## State

```bash
terraform state list
terraform state show aws_s3_bucket.logs
terraform state rm aws_s3_bucket.legacy     # forget, do not delete
terraform apply -refresh-only               # record reality without changing it
terraform force-unlock LOCK_ID              # only when no run is active
```

```hcl
moved {
  from = aws_s3_bucket.logs
  to   = aws_s3_bucket.audit_logs
}

import {
  to = aws_s3_bucket.legacy
  id = "acme-legacy-reports"
}
```

## Remote backend

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

Enable bucket versioning, restrict access, and keep one state per environment.

## Modules

```hcl
module "site" {
  source  = "../../modules/static-site"
  name    = "marketing-prod"
}

output "site_bucket" {
  value = module.site.bucket_name
}
```

Pin versions of modules you do not own. Run `terraform init` after adding a module.

## Pipeline checks

```bash
terraform fmt -check -recursive
terraform validate
tflint
trivy config .
terraform plan -detailed-exitcode     # 0 none, 1 error, 2 changes
terraform test
```

## Workflow with a saved plan

```bash
terraform fmt -recursive
terraform validate
terraform init -upgrade
terraform plan -out=tfplan -input=false
terraform show tfplan
terraform show -json tfplan | jq '.resource_changes[] | select(.change.actions != ["no-op"]) | {a: .address, c: .change.actions}'
terraform apply tfplan
terraform output -json
terraform providers
terraform version
```

> **Warning:** Read the plan before you apply it, especially lines marked `destroy` or `must be replaced`. A change to one argument can force a new resource, such as a database.

> **Warning:** `terraform apply -auto-approve` skips the human check. Use it only in a pipeline that applies a reviewed, saved plan.

## State inspection and surgery

```bash
terraform state list
terraform state show aws_instance.web
terraform state pull > backup.tfstate
terraform state mv aws_instance.web aws_instance.app
terraform state rm aws_instance.old
terraform import aws_s3_bucket.logs acme-logs
terraform force-unlock LOCK_ID
terraform refresh
terraform taint aws_instance.web
terraform apply -replace=aws_instance.web
```

> **Warning:** Always run `terraform state pull > backup.tfstate` before `state mv`, `state rm` or `import`. A wrong state edit can make Terraform destroy or duplicate real resources.

> **Warning:** `terraform force-unlock` is only safe when you are sure that no other run is active. Check who holds the lock first.

> **Warning:** Do not edit the state file by hand and do not commit it to a shared repository: it can contain secrets in plain text. Use a remote backend with encryption and locking.

> **Warning:** `terraform taint` is deprecated. Use `apply -replace=ADDRESS`, which shows the effect in the plan.

## Targeting, variables and workspaces

```bash
terraform plan -target=module.network
terraform plan -var 'env=staging' -var-file=staging.tfvars
terraform workspace list
terraform workspace new staging
terraform workspace select prod
terraform console
export TF_LOG=INFO TF_LOG_PATH=tf.log
TF_VAR_db_password="$DB_PASSWORD" terraform plan
```

> **Warning:** `-target` skips dependencies and leaves the state out of step with the code. Use it only for recovery, then run a full plan.

> **Warning:** `TF_LOG=TRACE` can write secrets and tokens into the log. Do not attach such logs to tickets.

> **Warning:** Check `terraform workspace show` before apply. Applying to the wrong workspace is a common cause of production changes.

## Destroy

```bash
terraform plan -destroy -out=destroy.tfplan
terraform show destroy.tfplan | less
terraform destroy -target=aws_instance.test
lifecycle { prevent_destroy = true }
```

> **Warning:** `terraform destroy` deletes everything in the state, including databases and buckets. Always review `plan -destroy`, set `prevent_destroy` on critical resources, and turn on deletion protection in the cloud.

> **Warning:** Provider upgrades with `init -upgrade` can change behaviour. Pin versions in `required_providers` and read the changelog.
