---
title: Providers, resources and data sources
minutes: 15
summary: Build real infrastructure with dependencies, query existing resources with data sources, and use lifecycle rules and meta-arguments safely.
---

A bucket is a toy. Real infrastructure has a network, subnets, security groups and servers that refer to each other. Terraform handles this by building a **dependency graph** from your references, creating things in a valid order and in parallel where it can.

## What you will learn

- Providers and how they authenticate
- Resources with references and implicit dependencies
- Data sources for things that already exist
- `count`, `for_each`, `depends_on` and `lifecycle`

## Providers

A provider is a plugin that knows how to manage one platform's API: AWS, Azure, Kubernetes, Cloudflare and many more. `terraform init` downloads the versions you pinned. Give providers credentials through the environment or the platform's own mechanisms (roles, workload identity), **not** through values written in your files.

```bash
export AWS_PROFILE=dev
terraform init
```

## A small network and server

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "demo" }
}

resource "aws_subnet" "app" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.20.1.0/24"
  availability_zone = "eu-west-1a"
}

resource "aws_security_group" "web" {
  name   = "web"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }
}

resource "aws_instance" "web" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.app.id
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

Notice that `aws_subnet.app` uses `aws_vpc.main.id`. That reference is an **implicit dependency**: Terraform knows the VPC must exist first. A **data source** (`data "..."`) reads something that already exists or is published, here the latest machine image, without managing it.

## Many of the same thing

```hcl
variable "subnets" {
  type = map(string)
  default = {
    a = "10.20.1.0/24"
    b = "10.20.2.0/24"
  }
}

resource "aws_subnet" "multi" {
  for_each          = var.subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = "eu-west-1${each.key}"
}
```

| Meta-argument | Use |
|---------------|-----|
| `count` | N copies indexed by number (`[0]`, `[1]`). Removing an item from the middle shifts the rest |
| `for_each` | One copy per key of a map or set. Each has a stable key such as `["a"]` |
| `depends_on` | An explicit dependency when Terraform cannot see one from references |
| `lifecycle` | `prevent_destroy`, `create_before_destroy`, `ignore_changes` |

Prefer `for_each` over `count` for anything that is not a simple on/off switch (`count = var.enabled ? 1 : 0`). With `count`, deleting the second of three items makes Terraform rename the third, which can destroy and recreate a real resource.

## Inspecting the graph and state

```console
$ terraform state list
aws_vpc.main
aws_subnet.multi["a"]
aws_subnet.multi["b"]
$ terraform graph | head
```

## Incident: the plan wants to recreate subnets after a harmless edit

> **Incident:** You delete the first of three subnets defined with `count`. The plan wants to destroy and recreate the other two.

```console
  # aws_subnet.app[1] must be replaced
  # aws_subnet.app[2] must be replaced
Plan: 2 to add, 3 to destroy
```

With `count`, items are tracked by position. Removing index 0 moves the old index 1 into position 0, so Terraform sees every address as changed. Switch the resource to `for_each` over a map with stable keys, then tell Terraform that existing resources simply moved, using `moved` blocks so nothing is destroyed:

```hcl
moved {
  from = aws_subnet.app[1]
  to   = aws_subnet.multi["b"]
}
```

Rerun the plan and confirm it shows only the intended removal. Moves are refactors of the *code*, not of the real infrastructure, and the `moved` block expresses exactly that.

## Common mistakes

- Putting credentials in configuration files
- Using `count` for lists whose members may be removed
- Hard-coding AMI IDs that differ per region instead of using a data source
- Opening security groups to the whole internet on administrative ports

```quiz
Q: What does Terraform use to decide creation order?
- Alphabetical order of files
- The order resources appear in the file
+ A dependency graph built from references between resources
- Random order
> References create implicit dependencies, and independent resources can be created in parallel.

Q: What is a data source for?
- Creating a new resource
+ Reading information about something that already exists or is published
- Storing state remotely
- Declaring outputs
> Data sources are read-only lookups.

Q: Why prefer for_each over count for a list of subnets?
- It is faster
+ Items have stable keys, so removing one does not shift the others
- count cannot be used with subnets
- for_each hides the plan
> count tracks by position; removing a middle item renumbers the rest.

Q: What does a moved block do?
- Moves data between regions
+ Tells Terraform a resource address changed so it does not destroy and recreate
- Moves files between modules
- Deletes the old resource
> It records a refactor in state without touching real infrastructure.
```

```cards
What is a provider? :: A plugin that manages one platform's API, such as AWS or Kubernetes
Implicit dependency? :: Created automatically when one resource references another's attribute
count vs for_each? :: count indexes by position; for_each uses stable map or set keys
What does a moved block express? :: A code refactor: the same real resource now has a new address
```
