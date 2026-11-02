---
title: Variables, locals, outputs and validation
minutes: 14
summary: Make configurations reusable with typed variables, validation, locals and outputs, and keep sensitive values out of your files.
---

Hard-coded values make a configuration usable exactly once. Variables turn it into something you can reuse for dev, staging and production, and validation catches bad input before a cloud API call does.

## What you will learn

- Input variables with types, defaults and validation
- Ways to supply values and their order of precedence
- Locals for computed values
- Outputs, and handling sensitive values

## Input variables

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

variable "instance_count" {
  type    = number
  default = 2
}

variable "allowed_cidrs" {
  type    = list(string)
  default = ["10.0.0.0/8"]
}

variable "db_password" {
  type      = string
  sensitive = true
}
```

Always give variables a `type` and a `description`. `sensitive = true` hides the value in plan and apply output (but not from the state file, which the next lesson covers).

## Supplying values

Terraform picks a value using this order, with later sources winning:

1. The variable's `default`
2. Environment variables named `TF_VAR_name`
3. `terraform.tfvars` and `*.auto.tfvars` files
4. `-var-file=` and `-var` options on the command line

```hcl
# prod.tfvars
environment    = "prod"
instance_count = 4
```

```console
$ terraform plan -var-file=prod.tfvars
$ export TF_VAR_db_password="$(cat /run/secrets/db_password)"
```

Never write real secrets into `.tfvars` files that are shared. Pass them from the environment or from a secret manager at run time.

## Locals

Locals give names to expressions so you write them once:

```hcl
locals {
  name_prefix = "shop-${var.environment}"

  common_tags = {
    Environment = var.environment
    Owner       = "platform"
    ManagedBy   = "terraform"
  }

  is_prod = var.environment == "prod"
}

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
  tags   = local.common_tags
}
```

Use locals for derived values and variables for inputs. Do not overuse locals to the point where readers must jump around to follow the code.

## Expressions you will use constantly

| Expression | Example | Result |
|-----------|---------|--------|
| Conditional | `local.is_prod ? "m5.large" : "t3.micro"` | Chooses a value |
| `for` expression | `[for s in var.names : upper(s)]` | Transforms a list |
| String template | `"${var.environment}-api"` | Builds a string |
| Functions | `merge(a, b)`, `lookup(map, key, default)`, `cidrsubnet(cidr, 8, 1)` | Built-in helpers |

Use `terraform console` to try expressions without applying anything:

```console
$ terraform console
> cidrsubnet("10.20.0.0/16", 8, 3)
"10.20.3.0/24"
> [for s in ["a","b"] : upper(s)]
[
  "A",
  "B",
]
```

## Outputs

```hcl
output "assets_bucket" {
  description = "Name of the assets bucket"
  value       = aws_s3_bucket.assets.bucket
}

output "db_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}
```

Outputs print after `apply` and are how modules return values to their callers. Read one with `terraform output assets_bucket`.

## Incident: a secret shows up in a pipeline log

> **Incident:** A reviewer notices a database password in a CI job's plan output.

The variable had no `sensitive = true`, so Terraform printed it in the plan. First **rotate the password**, because anything printed to a log must be treated as exposed. Then fix the cause:

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}
```

Also mark any output that exposes a derived secret as `sensitive`, and make sure the value arrives through `TF_VAR_db_password` from your CI system's secret store instead of a file. Finally, remember `sensitive` only masks display. The value still lives in the state file, so state must be stored in an encrypted backend with restricted access.

## Common mistakes

- Variables without types, so a string sneaks in where a number is expected
- Secrets in `.tfvars` files that are shared
- Forgetting that `sensitive` does not protect state
- Constructing complex logic in locals that nobody can read

```quiz
Q: Which source of a variable value wins over an environment variable TF_VAR_x?
- The default value
+ A -var option on the command line
- The variable description
- The provider block
> Command-line -var and -var-file take precedence over environment variables and defaults.

Q: What does sensitive = true on a variable do?
- Encrypts the value in the state file
+ Hides the value in plan and apply output
- Prevents the variable from being used
- Makes it required
> It only masks display. The value is still stored in state.

Q: What is a local value used for?
- Receiving input from the user
+ Naming an expression so it can be reused within the module
- Configuring a provider
- Declaring a backend
> Locals compute and name values internal to a module.

Q: Which command lets you test an expression such as cidrsubnet without applying?
- terraform validate
+ terraform console
- terraform graph
- terraform import
> The console evaluates expressions against your configuration.
```

```cards
Variable precedence (low to high)? :: default, TF_VAR environment variables, tfvars files, then -var and -var-file
What does validation do in a variable? :: Rejects bad input with a clear error before any API call
Does sensitive protect state? :: No, it only masks output; protect state separately
How do modules return values? :: Through outputs
```
