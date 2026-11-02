---
title: Expressions, loops and dynamic blocks
minutes: 16
summary: Create many resources from data with count and for_each, transform values with for expressions and functions, and generate nested blocks with dynamic.
---

Real infrastructure is repetitive: ten subnets, five security-group rules, three environments. Copying resource blocks is error-prone. Terraform's expression language lets you describe the pattern once and drive it from data.

## What you will learn

- `count` versus `for_each`, and why the difference matters
- `for` expressions, conditionals and common functions
- `dynamic` blocks for repeated nested configuration
- Keeping configurations readable

## count and for_each

`count` creates N copies addressed by index. `for_each` creates one instance per key in a map or set, addressed by that key.

```hcl
variable "subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
  default = {
    app-a = { cidr = "10.0.1.0/24", az = "eu-west-1a" }
    app-b = { cidr = "10.0.2.0/24", az = "eu-west-1b" }
    db-a  = { cidr = "10.0.11.0/24", az = "eu-west-1a" }
  }
}

resource "aws_subnet" "this" {
  for_each          = var.subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az
  tags = {
    Name = "shop-${each.key}"
  }
}
```

Each subnet is tracked as `aws_subnet.this["app-a"]`. If you later remove `app-b` from the map, Terraform destroys only that subnet. With `count`, instances are tracked by position, so removing the **middle** item shifts every later index and Terraform plans to destroy and recreate resources that did not change. Prefer `for_each` whenever the items have a natural name. Use `count` mainly for a simple on/off switch: `count = var.enabled ? 1 : 0`.

## for expressions and functions

A `for` expression transforms a list or map into another.

```hcl
locals {
  names      = [for k, v in var.subnets : "${k}-${v.az}"]
  app_cidrs  = [for k, v in var.subnets : v.cidr if startswith(k, "app")]
  az_by_name = { for k, v in var.subnets : k => v.az }

  common_tags = {
    Project = "shop"
    Env     = terraform.workspace
  }
  all_tags = merge(local.common_tags, { Owner = "platform" })
}

output "app_cidrs" {
  value = local.app_cidrs
}
```

The functions you will use most: `merge` for maps, `concat` and `flatten` for lists, `lookup` with a default, `coalesce` for the first non-empty value, `cidrsubnet` for carving address ranges, `format` and `join` for strings, and `try` to fall back when an expression fails.

```hcl
locals {
  vpc_cidr = "10.20.0.0/16"
  subnet_cidrs = [for i in range(3) : cidrsubnet(local.vpc_cidr, 8, i)]
  instance_type = lookup({ dev = "t3.small", prod = "m6i.large" }, terraform.workspace, "t3.small")
}
```

Test expressions interactively with `terraform console`:

```console
$ terraform console
> cidrsubnet("10.20.0.0/16", 8, 2)
"10.20.2.0/24"
> [for s in ["a","b"] : upper(s)]
```

## dynamic blocks

Some resources contain repeated nested blocks, such as ingress rules in a security group. A `dynamic` block generates one nested block per element.

```hcl
variable "ingress_rules" {
  type = list(object({
    port = number
    cidr = string
  }))
  default = [
    { port = 443, cidr = "0.0.0.0/0" },
    { port = 22, cidr = "10.0.0.0/8" },
  ]
}

resource "aws_security_group" "web" {
  name   = "shop-web"
  vpc_id = aws_vpc.main.id

  dynamic "ingress" {
    for_each = var.ingress_rules
    content {
      from_port   = ingress.value.port
      to_port     = ingress.value.port
      protocol    = "tcp"
      cidr_blocks = [ingress.value.cidr]
    }
  }
}
```

Inside `content`, the iterator is named after the block (`ingress`) and exposes `.key` and `.value`. Use dynamic blocks only when the data really varies. Overuse makes configuration hard to read, so a plain repeated block is better for two fixed rules.

## Conditionals and validation

```hcl
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be dev, staging or prod."
  }
}

resource "aws_db_instance" "main" {
  identifier          = "shop-${var.environment}"
  instance_class      = var.environment == "prod" ? "db.m6i.large" : "db.t3.medium"
  multi_az            = var.environment == "prod"
  deletion_protection = var.environment == "prod"
}
```

## Incident: the plan that wants to destroy the whole fleet

> **Incident:** Engineers remove one server name from the list that drives `count`. The next `terraform plan` shows 14 resources to destroy and 14 to create, including production instances that did not change.

```console
$ terraform plan | grep -E "must be replaced|will be destroyed" | head
  # aws_instance.web[1] must be replaced
  # aws_instance.web[2] must be replaced
```

The list shifted, so every instance after the removed one received a new index and a new identity. Convert to `for_each` and tell Terraform the instances are the same, using `moved` blocks:

```hcl
moved {
  from = aws_instance.web[1]
  to   = aws_instance.web["web-b"]
}
```

Run `terraform plan` again and confirm it shows no destroys before applying. Make it policy that anything keyed by names uses `for_each`.

## Common mistakes

- Using `count` over a list whose items can be removed from the middle
- Using `for_each` with values not known until apply
- Overusing `dynamic` blocks so readers cannot see the resulting resource
- Complex nested expressions in resource arguments instead of a named local
- Not testing with `terraform console` and `terraform plan` first

```quiz
Q: Why prefer for_each over count for named items?
- It is faster to run
+ Instances are tracked by key, so removing one does not reindex the others
- count is deprecated
- It uses less memory
> Index-based addressing shifts when you remove a middle item.

Q: What does a dynamic block do?
- Creates a new resource type
+ Generates repeated nested blocks from a collection
- Imports existing resources
- Changes provider versions
> It lets data drive nested configuration such as ingress rules.

Q: What does a moved block do?
- Moves files
+ Records that a resource has a new address so Terraform does not recreate it
- Copies state to another backend
- Renames a provider
> It keeps the existing object while changing its address in code.

Q: Which command lets you try an expression interactively?
- terraform plan
+ terraform console
- terraform validate
- terraform output
> The console evaluates expressions against your configuration.
```

```cards
count versus for_each addressing? :: count uses an index number; for_each uses the map key or set value
Purpose of cidrsubnet? :: Calculate a smaller CIDR block from a larger network
What does try do? :: Returns the first expression that evaluates without error
How to switch a resource on or off? :: count = var.enabled ? 1 : 0
```
