---
title: End to end: a web stack on AWS and on Azure
minutes: 18
summary: Build the same small web platform with Terraform on AWS and on Azure, network, compute, load balancer and database, and compare the equivalent resources.
---

Concepts become clear when you build something. This lesson assembles a small, realistic stack on both clouds: a private network, a load balancer, application servers and a managed database. The resources differ in name, but the design is the same.

## What you will learn

- A reference layout: public edge, private application tier, private data tier
- The AWS resources and their Azure equivalents
- How to structure the project, remote state and variables
- A safe plan, apply and destroy routine

## The design

| Layer | AWS | Azure |
|-------|-----|-------|
| Network | VPC, subnets, route tables | Virtual network, subnets, route tables |
| Internet access | Internet gateway, NAT gateway | Public IP, NAT gateway |
| Traffic filtering | Security groups | Network security groups |
| Edge | Application Load Balancer | Application Gateway or Load Balancer |
| Compute | EC2 or Auto Scaling group | Virtual machine scale set |
| Database | RDS PostgreSQL | Azure Database for PostgreSQL flexible server |
| Identity | IAM role on the instance | Managed identity |

Only the load balancer is public. Application servers sit in private subnets and the database in its own subnets, reachable only from the application tier.

## Project layout

```text
infra/
  aws/
    main.tf
    variables.tf
    outputs.tf
    backend.tf
  azure/
    main.tf
    variables.tf
    outputs.tf
    backend.tf
  modules/
    network/
```

Keep each cloud in its own root module with its own state. Do not try to make one configuration create both: the providers, authentication and lifecycle differ.

## AWS network and compute

```hcl
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "acme-tfstate"
    key            = "shop/aws/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = "eu-west-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.10.0.0/16"
  enable_dns_hostnames = true
  tags                 = { Name = "shop" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_security_group" "app" {
  name   = "shop-app"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "alb" {
  name   = "shop-alb"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

The application security group allows traffic **only from the load balancer's security group**, not from an address range. That is the AWS idiom for tier-to-tier rules.

## Azure network and compute

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.100"
    }
  }
  backend "azurerm" {
    resource_group_name  = "rg-tfstate"
    storage_account_name = "acmetfstate"
    container_name       = "tfstate"
    key                  = "shop/azure.tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "shop" {
  name     = "rg-shop-prod"
  location = "westeurope"
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-shop"
  address_space       = ["10.20.0.0/16"]
  location            = azurerm_resource_group.shop.location
  resource_group_name = azurerm_resource_group.shop.name
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.shop.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.20.10.0/24"]
}

resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.shop.location
  resource_group_name = azurerm_resource_group.shop.name

  security_rule {
    name                       = "allow-lb-8080"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "8080"
    source_address_prefix      = "AzureLoadBalancer"
    destination_address_prefix = "*"
  }
}
```

Azure resources live in a **resource group**, which acts as a lifecycle and access boundary. Network security groups use numbered priorities where the lowest number wins.

## Running it safely

```console
$ cd infra/aws
$ terraform init
$ terraform fmt -check && terraform validate
$ terraform plan -out=tfplan
$ terraform show tfplan | head -40
$ terraform apply tfplan
$ terraform output
$ terraform destroy -target=aws_instance.test
```

Read the plan every time. Look for `-/+` (replace) and `destroy` lines on stateful resources such as databases. Use `lifecycle { prevent_destroy = true }` on the database and enable deletion protection. Tag everything with owner and environment so cost reports make sense.

## Incident: the apply that replaced the database

> **Incident:** A change renames an RDS argument. The plan shows `aws_db_instance.main must be replaced`, but the engineer scrolls past it in a 400-line plan, approves it, and the database is destroyed and recreated empty.

Prevention starts in code and process:

```hcl
resource "aws_db_instance" "main" {
  identifier              = "shop-prod"
  engine                  = "postgres"
  instance_class          = "db.t3.medium"
  allocated_storage       = 50
  username                = "app"
  manage_master_user_password = true
  deletion_protection     = true
  backup_retention_period = 14
  skip_final_snapshot     = false
  final_snapshot_identifier = "shop-prod-final"

  lifecycle {
    prevent_destroy = true
  }
}
```

With `prevent_destroy` the plan itself errors instead of destroying. Recover from the automated backups or the final snapshot, add a CI step that fails when a plan contains a replacement of a protected resource, and require a second reviewer for any plan that destroys.

## Common mistakes

- One giant state for everything
- Wide-open security groups and storage accounts for convenience
- Not pinning provider versions
- Applying a plan different from the one reviewed
- Forgetting that destroy is permanent for databases without snapshots

```quiz
Q: What is an idiomatic way to allow only the load balancer to reach the app tier on AWS?
- Allow 0.0.0.0/0
+ Reference the load balancer's security group as the source
- Disable the firewall
- Use a public IP on each instance
> Security-group references follow the instances rather than fixed addresses.

Q: What is an Azure resource group?
- A virtual machine type
+ A container that holds related resources and acts as a lifecycle and access boundary
- A kind of subnet
- A billing account
> Resources are created inside a resource group.

Q: What does prevent_destroy do?
- Blocks terraform plan
+ Makes any plan that would destroy the resource fail with an error
- Deletes the resource faster
- Encrypts the resource
> It is a safety net for stateful resources like databases.

Q: Why keep AWS and Azure in separate root modules?
- Terraform forbids two providers
+ They have different providers, authentication and lifecycles, and separate state limits the blast radius
- It is cheaper
- Backends require it
> Smaller, separate states are safer and easier to manage.
```

```cards
Azure equivalent of an AWS security group? :: Network security group (NSG)
Where does each Terraform root module keep state? :: In its own remote backend key
What flags a replacement in a plan? :: The -/+ symbol and the phrase "must be replaced"
Why tag resources? :: Ownership, environment and cost allocation
```
