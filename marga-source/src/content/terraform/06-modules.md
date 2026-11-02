---
title: Modules and project structure
minutes: 15
summary: Package reusable infrastructure as modules with clear inputs and outputs, version them, and lay out environments so changes stay isolated.
---

By the third environment you are copying the same hundred lines of network code and fixing the same bug in three places. A **module** is a folder of Terraform files used as a single building block. Every configuration is already a module (the "root" module). The skill is deciding what to extract and how to keep it clean.

## What you will learn

- How to write and call a module
- Good interfaces: inputs, outputs and sensible defaults
- Versioning and sourcing modules
- A directory layout for several environments

## A module

```text
modules/
  static-site/
    main.tf
    variables.tf
    outputs.tf
```

```hcl
# modules/static-site/variables.tf
variable "name" {
  type        = string
  description = "Prefix for all resource names"
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/static-site/main.tf
resource "aws_s3_bucket" "site" {
  bucket = "${var.name}-site"
  tags   = var.tags
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

```hcl
# modules/static-site/outputs.tf
output "bucket_name" {
  value = aws_s3_bucket.site.bucket
}
```

Calling it:

```hcl
module "marketing" {
  source = "../../modules/static-site"

  name = "marketing-prod"
  tags = { Owner = "web" }
}

output "marketing_bucket" {
  value = module.marketing.bucket_name
}
```

After adding a module call, run `terraform init` again so Terraform can load it. A module can only be read through its **outputs**; callers cannot reach resources inside it directly.

## Designing a good module

- **Small, clear purpose.** "A VPC with subnets" is a module. "Everything for our company" is not.
- **Few required inputs, safe defaults.** The secure choice should be the default.
- **Typed and described variables.** The interface is the documentation.
- **Useful outputs.** Return IDs and names that callers need to connect other things.
- **No provider configuration inside.** Let the caller configure providers, so the module works in any account or region.
- **Do not wrap a single resource without adding value.** A module that just renames one resource's arguments adds complexity only.

## Versions and sources

| Source | Example | Use |
|--------|---------|-----|
| Local path | `source = "../../modules/vpc"` | Same repository, changes together |
| Registry | `source = "terraform-aws-modules/vpc/aws"` with `version = "~> 5.0"` | Well-maintained community modules |
| Internal registry or archive | A versioned release your team publishes | Shared across many teams |

Always **pin versions** of modules you do not control, and read what a community module does before depending on it. An unpinned module can change under you on the next `init -upgrade`.

## Layout for environments

```text
infra/
  modules/
    network/
    app/
  envs/
    dev/
      main.tf
      backend.tf
      dev.tfvars
    prod/
      main.tf
      backend.tf
      prod.tfvars
```

Each environment is its own root module with its **own state**. They call the same modules with different inputs. A change to dev cannot touch production, and you promote a module change by updating the version or path in each environment in turn. Avoid using one set of files with `terraform workspace` to separate production from development. Workspaces share code and backend configuration, which makes it easy to run a command against the wrong one.

## Incident: a module change breaks every environment at once

> **Incident:** A fix to the shared `network` module is merged. The next scheduled run in production proposes to replace the subnets.

The environments referenced the module by local path, so they all picked up the change immediately, and the new code renamed an internal resource. The plan flagged it before any damage:

```console
  # module.network.aws_subnet.private[0] must be replaced
Plan: 3 to add, 0 to change, 3 to destroy.
```

Do not apply. Revert or correct the module change, and for a rename add a `moved` block inside the module so existing resources keep their identity. To avoid the class of problem, publish modules as **versioned releases** and let each environment upgrade deliberately: dev first, then staging, then production, reading the plan at each step.

## Common mistakes

- Giant modules that do everything
- Unpinned remote modules
- Environments that share one state
- Provider blocks inside reusable modules
- Renaming resources inside a module without a `moved` block

```quiz
Q: How does a caller read a value from inside a module?
- By referencing the resource directly
+ Through the module's outputs, such as module.marketing.bucket_name
- By reading the state file
- Through a data source
> Modules expose values only through outputs.

Q: Why should reusable modules not contain provider configuration?
- Providers cannot be configured twice
+ The caller should decide the account and region so the module is reusable
- It slows down plans
- Terraform forbids it
> Provider configuration belongs in the root module.

Q: What must you do after adding a new module call?
- Delete the state
+ Run terraform init so the module is loaded
- Run terraform destroy
- Nothing
> init downloads or links modules referenced in the configuration.

Q: Why give each environment its own state?
- To save storage
+ So a change or mistake in one environment cannot affect another
- Terraform requires it
- To avoid using variables
> Separate state isolates blast radius.
```

```cards
What is a module? :: A folder of Terraform files used as a reusable building block
Why pin module versions? :: So upgrades happen deliberately, not by surprise
Where should provider config live? :: In the root module, not in reusable modules
Directory pattern for environments? :: One root module per environment, each with its own state, calling shared modules
```
