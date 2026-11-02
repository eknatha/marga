## Pin Terraform and the AWS provider
id: pin
task: Write a terraform block that requires Terraform version ">= 1.6.0" and declares the aws provider from "hashicorp/aws" with the version constraint "~> 5.0". Then add a provider "aws" block with region set to "eu-west-1".
hint: required_providers is an argument inside the terraform block. It holds an object: aws = { source = "...", version = "..." }.
@@ start
# Write the terraform block and the provider block here
@@ sol
terraform {
  required_version = ">= 1.6.0"
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
@@ checks
eq terraform.required_version >= 1.6.0
match terraform.required_providers.aws hashicorp/aws
match terraform.required_providers.aws ~> 5\.0
eq provider.aws.region eu-west-1

## Declare an input variable
id: variable
task: Declare a variable named environment of type string with the default "staging" and a description.
hint: A variable block has type, default and description arguments.
@@ start
# Write your configuration here
@@ sol
variable "environment" {
  type        = string
  default     = "staging"
  description = "Deployment environment name"
}
@@ checks
eq variable.environment.type string
eq variable.environment.default staging
has variable.environment.description

## Validate an input
id: validation
task: Declare variable "instance_count" of type number. Add a validation block that accepts only values from 1 to 10 and gives an error message.
hint: validation { condition = ... error_message = "..." }. Use && to combine two comparisons.
@@ start
variable "instance_count" {
  type = number
}
@@ sol
variable "instance_count" {
  type = number

  validation {
    condition     = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "instance_count must be between 1 and 10."
  }
}
@@ checks
eq variable.instance_count.type number
has variable.instance_count.validation.condition
has variable.instance_count.validation.error_message
match variable.instance_count.validation.condition >=\s*1
match variable.instance_count.validation.condition <=\s*10

## Mark a secret variable
id: sensitive
task: Declare variable "db_password" of type string, marked sensitive. It must not have a default value, so that the secret is never stored in code.
hint: sensitive = true hides the value in plan output. A missing default forces the caller to pass it.
@@ start
variable "db_password" {
  type    = string
  default = "changeme"
}
@@ sol
variable "db_password" {
  type        = string
  sensitive   = true
  description = "Database admin password"
}
@@ checks
eq variable.db_password.sensitive true
no variable.db_password.default

## A tagged S3 bucket
id: bucket
task: Create an aws_s3_bucket resource named "logs" with bucket "acme-logs-prod" and tags Name = "logs" and Environment = "prod".
hint: tags is an argument that takes a map: tags = { Name = "..." }.
@@ start
resource "aws_s3_bucket" "logs" {
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"

  tags = {
    Name        = "logs"
    Environment = "prod"
  }
}
@@ checks
eq resource.aws_s3_bucket.logs.bucket acme-logs-prod
match resource.aws_s3_bucket.logs.tags Name\s*=\s*"logs"
match resource.aws_s3_bucket.logs.tags Environment\s*=\s*"prod"

## Reference another resource
id: reference
task: Add an aws_s3_bucket_versioning resource named "logs" that points at the bucket with aws_s3_bucket.logs.id and enables versioning (status "Enabled") in a versioning_configuration block.
hint: Refer to another resource as TYPE.NAME.ATTRIBUTE without quotes. Terraform then knows the order.
@@ start
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
@@ checks
eq resource.aws_s3_bucket_versioning.logs.bucket aws_s3_bucket.logs.id
eq resource.aws_s3_bucket_versioning.logs.versioning_configuration.status Enabled

## Output a value
id: output
task: Add an output named "bucket_arn" that returns aws_s3_bucket.logs.arn, with a description.
hint: output "name" { value = ... description = "..." }
@@ start
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

output "bucket_arn" {
  value       = aws_s3_bucket.logs.arn
  description = "ARN of the log bucket"
}
@@ checks
eq output.bucket_arn.value aws_s3_bucket.logs.arn
has output.bucket_arn.description

## Use locals
id: locals
task: Define locals with a name_prefix built from var.project and var.environment ("PROJECT-ENV"), and a common_tags map with Project and Environment. Use local.common_tags as the tags of a bucket named by local.name_prefix.
hint: "${var.project}-${var.environment}" builds the prefix. Refer to a local value as local.NAME.
@@ start
variable "project" {}
variable "environment" {}

resource "aws_s3_bucket" "data" {
}
@@ sol
variable "project" {}
variable "environment" {}

locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = {
    Project     = var.project
    Environment = var.environment
  }
}

resource "aws_s3_bucket" "data" {
  bucket = local.name_prefix
  tags   = local.common_tags
}
@@ checks
match locals.name_prefix var\.project
match locals.name_prefix var\.environment
has locals.common_tags
eq resource.aws_s3_bucket.data.bucket local.name_prefix
eq resource.aws_s3_bucket.data.tags local.common_tags

## Look up an image with a data source
id: data
task: Use a data source aws_ami named "al2023" with most_recent = true and owners = ["amazon"]. Create an aws_instance "web" that uses data.aws_ami.al2023.id as its ami and instance type "t3.micro".
hint: A data source is read, not created. Reference it with data.TYPE.NAME.ATTRIBUTE.
@@ start
resource "aws_instance" "web" {
}
@@ sol
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
}
@@ checks
eq data.aws_ami.al2023.most_recent true
match data.aws_ami.al2023.owners amazon
eq resource.aws_instance.web.ami data.aws_ami.al2023.id
eq resource.aws_instance.web.instance_type t3.micro

## Create three servers with count
id: count
task: Create aws_instance "app" with count = 3, ami "ami-0123456789abcdef0", instance type "t3.small" and a Name tag that includes count.index.
hint: count.index starts at 0. Use "app-${count.index}" in the tag value.
@@ start
resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.small"
}
@@ sol
resource "aws_instance" "app" {
  count         = 3
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.small"

  tags = {
    Name = "app-${count.index}"
  }
}
@@ checks
eq resource.aws_instance.app.count 3
match resource.aws_instance.app.tags count\.index

## Create resources with for_each
id: foreach
task: Create one aws_iam_user "team" for each name in the set toset(["ann", "bob", "cho"]), using each.key as the user name.
hint: for_each takes a set or a map. each.key and each.value are available inside the block.
@@ start
resource "aws_iam_user" "team" {
}
@@ sol
resource "aws_iam_user" "team" {
  for_each = toset(["ann", "bob", "cho"])
  name     = each.key
}
@@ checks
match resource.aws_iam_user.team.for_each toset
match resource.aws_iam_user.team.for_each "cho"
eq resource.aws_iam_user.team.name each.key

## Allow only HTTPS
id: sg
task: Create aws_security_group "web" in var.vpc_id with one ingress rule: TCP port 443 from "0.0.0.0/0". Do not open port 22.
hint: An ingress block has from_port, to_port, protocol and cidr_blocks.
@@ start
variable "vpc_id" {}

resource "aws_security_group" "web" {
  name   = "web"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
@@ sol
variable "vpc_id" {}

resource "aws_security_group" "web" {
  name   = "web"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
@@ checks
eq resource.aws_security_group.web.ingress.from_port 443
eq resource.aws_security_group.web.ingress.to_port 443
eq resource.aws_security_group.web.ingress.protocol tcp
ne resource.aws_security_group.web.ingress.from_port 22
count resource.aws_security_group.web.ingress == 1

## Repeat blocks with dynamic
id: dynamic
task: Replace the repeated ingress blocks with one dynamic "ingress" block that loops over var.ports (a list of numbers) and uses ingress.value for from_port and to_port.
hint: dynamic "ingress" { for_each = var.ports  content { ... } }. Inside content use ingress.value.
@@ start
variable "ports" {
  type    = list(number)
  default = [80, 443]
}

resource "aws_security_group" "web" {
  name = "web"
}
@@ sol
variable "ports" {
  type    = list(number)
  default = [80, 443]
}

resource "aws_security_group" "web" {
  name = "web"

  dynamic "ingress" {
    for_each = var.ports
    content {
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
@@ checks
eq resource.aws_security_group.web.dynamic.ingress.for_each var.ports
eq resource.aws_security_group.web.dynamic.ingress.content.from_port ingress.value
eq resource.aws_security_group.web.dynamic.ingress.content.to_port ingress.value

## Say what depends on what
id: dependson
task: aws_instance "app" needs the IAM policy attachment to exist first, but does not read any of its attributes. Add depends_on with aws_iam_role_policy_attachment.app.
hint: depends_on takes a list of references without quotes.
@@ start
resource "aws_iam_role_policy_attachment" "app" {
  role       = "app-role"
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
@@ sol
resource "aws_iam_role_policy_attachment" "app" {
  role       = "app-role"
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  depends_on = [aws_iam_role_policy_attachment.app]
}
@@ checks
match resource.aws_instance.app.depends_on aws_iam_role_policy_attachment\.app

## Protect a database from destroy
id: prevent
task: Add a lifecycle block to aws_db_instance "main" with prevent_destroy = true, so that a plan that would delete it fails.
hint: lifecycle is a nested block inside the resource.
@@ start
resource "aws_db_instance" "main" {
  identifier        = "main"
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  allocated_storage = 50
}
@@ sol
resource "aws_db_instance" "main" {
  identifier        = "main"
  engine            = "postgres"
  instance_class    = "db.t3.medium"
  allocated_storage = 50

  lifecycle {
    prevent_destroy = true
  }
}
@@ checks
eq resource.aws_db_instance.main.lifecycle.prevent_destroy true

## Replace without downtime
id: cbd
task: For aws_launch_template "app" set lifecycle create_before_destroy = true, and ignore_changes for the image_id argument so that a newer AMI does not force a change.
hint: ignore_changes takes a list of argument names without quotes, for example [image_id].
@@ start
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0123456789abcdef0"
  instance_type = "t3.small"
}
@@ sol
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = "ami-0123456789abcdef0"
  instance_type = "t3.small"

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [image_id]
  }
}
@@ checks
eq resource.aws_launch_template.app.lifecycle.create_before_destroy true
match resource.aws_launch_template.app.lifecycle.ignore_changes image_id

## Call a module
id: module
task: Call a module named "network" from the local folder "./modules/network". Pass cidr_block "10.20.0.0/16" and the environment from var.environment.
hint: module "name" { source = "..." input = value }
@@ start
variable "environment" {}
@@ sol
variable "environment" {}

module "network" {
  source      = "./modules/network"
  cidr_block  = "10.20.0.0/16"
  environment = var.environment
}
@@ checks
eq module.network.source ./modules/network
eq module.network.cidr_block 10.20.0.0/16
eq module.network.environment var.environment

## Store state remotely
id: backend
task: Configure an s3 backend with bucket "acme-tf-state", key "prod/network.tfstate", region "eu-west-1", encrypt true and dynamodb_table "tf-locks" for locking.
hint: The backend block lives inside the terraform block: backend "s3" { ... }.
@@ start
terraform {
}
@@ sol
terraform {
  backend "s3" {
    bucket         = "acme-tf-state"
    key            = "prod/network.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "tf-locks"
  }
}
@@ checks
eq terraform.backend.s3.bucket acme-tf-state
eq terraform.backend.s3.key prod/network.tfstate
eq terraform.backend.s3.region eu-west-1
eq terraform.backend.s3.encrypt true
eq terraform.backend.s3.dynamodb_table tf-locks

## Choose a size with a condition
id: conditional
task: Set the instance_type of aws_instance "app" with a conditional: "m5.large" when var.environment is "prod", otherwise "t3.micro".
hint: condition ? value_if_true : value_if_false
@@ start
variable "environment" {}

resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
@@ sol
variable "environment" {}

resource "aws_instance" "app" {
  ami           = "ami-0123456789abcdef0"
  instance_type = var.environment == "prod" ? "m5.large" : "t3.micro"
}
@@ checks
match resource.aws_instance.app.instance_type var\.environment\s*==\s*"prod"
match resource.aws_instance.app.instance_type \?\s*"m5\.large"
match resource.aws_instance.app.instance_type :\s*"t3\.micro"

## Build a map with a for expression
id: forexpr
task: Add an output "instance_ips" that returns a map from instance name to private IP, using a for expression over aws_instance.app (created with for_each).
hint: { for k, v in aws_instance.app : k => v.private_ip }
@@ start
resource "aws_instance" "app" {
  for_each      = toset(["a", "b"])
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
@@ sol
resource "aws_instance" "app" {
  for_each      = toset(["a", "b"])
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}

output "instance_ips" {
  value = { for k, v in aws_instance.app : k => v.private_ip }
}
@@ checks
match output.instance_ips.value for\s+k,\s*v\s+in\s+aws_instance\.app
match output.instance_ips.value k\s*=>\s*v\.private_ip

## Hide a sensitive output
id: sensout
task: Add an output "db_endpoint" with the value aws_db_instance.main.endpoint. Also add output "db_password" with random_password.db.result and mark it sensitive.
hint: sensitive = true in an output block stops Terraform from printing the value.
@@ start
resource "aws_db_instance" "main" {
  identifier = "main"
}

resource "random_password" "db" {
  length = 24
}
@@ sol
resource "aws_db_instance" "main" {
  identifier = "main"
}

resource "random_password" "db" {
  length = 24
}

output "db_endpoint" {
  value = aws_db_instance.main.endpoint
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}
@@ checks
eq output.db_endpoint.value aws_db_instance.main.endpoint
eq output.db_password.value random_password.db.result
eq output.db_password.sensitive true
no output.db_endpoint.sensitive

## A safe database
id: rds
task: Make aws_db_instance "main" safe: storage_encrypted true, publicly_accessible false, multi_az true, backup_retention_period 7 and deletion_protection true.
hint: Each of these is a plain argument on the resource.
@@ start
resource "aws_db_instance" "main" {
  identifier          = "main"
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  publicly_accessible = true
}
@@ sol
resource "aws_db_instance" "main" {
  identifier              = "main"
  engine                  = "postgres"
  instance_class          = "db.t3.medium"
  allocated_storage       = 50
  storage_encrypted       = true
  publicly_accessible     = false
  multi_az                = true
  backup_retention_period = 7
  deletion_protection     = true
}
@@ checks
eq resource.aws_db_instance.main.storage_encrypted true
eq resource.aws_db_instance.main.publicly_accessible false
eq resource.aws_db_instance.main.multi_az true
eq resource.aws_db_instance.main.backup_retention_period 7
eq resource.aws_db_instance.main.deletion_protection true

## Least-privilege IAM policy
id: iampolicy
task: Create an aws_iam_policy_document data source "read_logs" with one statement: effect Allow, actions s3:GetObject and s3:ListBucket on the log bucket ARN and its objects (arn plus /*). Do not use "*" as an action.
hint: The statement block has effect, actions and resources. Use aws_s3_bucket.logs.arn and "${aws_s3_bucket.logs.arn}/*".
@@ start
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

data "aws_iam_policy_document" "read_logs" {
  statement {
    effect  = "Allow"
    actions = ["s3:GetObject", "s3:ListBucket"]
    resources = [
      aws_s3_bucket.logs.arn,
      "${aws_s3_bucket.logs.arn}/*",
    ]
  }
}
@@ checks
eq data.aws_iam_policy_document.read_logs.statement.effect Allow
match data.aws_iam_policy_document.read_logs.statement.actions s3:GetObject
match data.aws_iam_policy_document.read_logs.statement.actions s3:ListBucket
match data.aws_iam_policy_document.read_logs.statement.resources aws_s3_bucket\.logs\.arn\}/\*
no data.aws_iam_policy_document.read_logs.statement.not_actions

## Tag everything by default
id: defaulttags
task: In provider "aws" with region "eu-west-1", add default_tags with ManagedBy = "terraform" and Team = "platform".
hint: default_tags is a nested block with a tags map.
@@ start
provider "aws" {
  region = "eu-west-1"
}
@@ sol
provider "aws" {
  region = "eu-west-1"

  default_tags {
    tags = {
      ManagedBy = "terraform"
      Team      = "platform"
    }
  }
}
@@ checks
eq provider.aws.region eu-west-1
match provider.aws.default_tags.tags ManagedBy\s*=\s*"terraform"
match provider.aws.default_tags.tags Team\s*=\s*"platform"

## Carve subnets from a VPC range
id: cidrsubnet
task: Create aws_vpc "main" with cidr_block "10.0.0.0/16". Create aws_subnet "private" with count = 2 whose cidr_block uses cidrsubnet(aws_vpc.main.cidr_block, 8, count.index) and vpc_id from the VPC.
hint: cidrsubnet(prefix, newbits, netnum). With 8 new bits a /16 becomes /24 subnets.
@@ start
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
@@ sol
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  count      = 2
  vpc_id     = aws_vpc.main.id
  cidr_block = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
}
@@ checks
eq resource.aws_subnet.private.count 2
eq resource.aws_subnet.private.vpc_id aws_vpc.main.id
match resource.aws_subnet.private.cidr_block cidrsubnet\(aws_vpc\.main\.cidr_block,\s*8,\s*count\.index\)

## Create a Kubernetes namespace
id: k8sns
task: Configure the kubernetes provider with config_path "~/.kube/config" and create a kubernetes_namespace named "shop" with a label app = "shop" in its metadata.
hint: The resource takes a metadata block with name and labels.
@@ start
# Write your configuration here
@@ sol
provider "kubernetes" {
  config_path = "~/.kube/config"
}

resource "kubernetes_namespace" "shop" {
  metadata {
    name = "shop"
    labels = {
      app = "shop"
    }
  }
}
@@ checks
eq provider.kubernetes.config_path ~/.kube/config
eq resource.kubernetes_namespace.shop.metadata.name shop
match resource.kubernetes_namespace.shop.metadata.labels app\s*=\s*"shop"

## Rename without recreating
id: moved
task: The bucket resource was renamed from aws_s3_bucket.old to aws_s3_bucket.logs. Add a moved block so that Terraform renames it in state instead of destroying it.
hint: moved { from = aws_s3_bucket.old to = aws_s3_bucket.logs }
@@ start
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

moved {
  from = aws_s3_bucket.old
  to   = aws_s3_bucket.logs
}
@@ checks
eq moved.from aws_s3_bucket.old
eq moved.to aws_s3_bucket.logs

## Import an existing bucket in code
id: import
task: A bucket named "acme-legacy" was created by hand. Add an import block that brings it into aws_s3_bucket.legacy, and the matching resource block.
hint: import { to = ... id = "..." } is available from Terraform 1.5.
@@ start
# Write your configuration here
@@ sol
import {
  to = aws_s3_bucket.legacy
  id = "acme-legacy"
}

resource "aws_s3_bucket" "legacy" {
  bucket = "acme-legacy"
}
@@ checks
eq import.to aws_s3_bucket.legacy
eq import.id acme-legacy
eq resource.aws_s3_bucket.legacy.bucket acme-legacy

## Check an assumption with a precondition
id: precondition
task: In aws_instance "app", add a lifecycle precondition that fails with a message when data.aws_ami.al2023.architecture is not "x86_64".
hint: precondition { condition = ... error_message = "..." } inside lifecycle.
@@ start
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"
}
@@ sol
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.micro"

  lifecycle {
    precondition {
      condition     = data.aws_ami.al2023.architecture == "x86_64"
      error_message = "The image must be x86_64."
    }
  }
}
@@ checks
match resource.aws_instance.app.lifecycle.precondition.condition data\.aws_ami\.al2023\.architecture\s*==\s*"x86_64"
has resource.aws_instance.app.lifecycle.precondition.error_message

## Pass a start-up script
id: userdata
task: Give aws_instance "web" a user_data heredoc (<<-EOT ... EOT) that runs a script starting with #!/bin/bash and installs nginx with dnf. Also set user_data_replace_on_change = true.
hint: <<-EOT allows indented text. The closing EOT must be alone on its line.
@@ start
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"
}
@@ sol
resource "aws_instance" "web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  user_data = <<-EOT
    #!/bin/bash
    dnf install -y nginx
    systemctl enable --now nginx
  EOT

  user_data_replace_on_change = true
}
@@ checks
match resource.aws_instance.web.user_data #!/bin/bash
match resource.aws_instance.web.user_data dnf install -y nginx
eq resource.aws_instance.web.user_data_replace_on_change true

## An S3 bucket with versioning
id: s3version
task: Create an aws_s3_bucket named logs with bucket "acme-logs-prod". Add an aws_s3_bucket_versioning named logs that references the bucket id and sets versioning_configuration status to "Enabled".
hint: Reference the bucket as aws_s3_bucket.logs.id. The versioning_configuration block has a status argument.
@@ start
# Write your configuration here
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}
@@ checks
eq resource.aws_s3_bucket.logs.bucket acme-logs-prod
match resource.aws_s3_bucket_versioning.logs.bucket aws_s3_bucket\.logs\.id
eq resource.aws_s3_bucket_versioning.logs.versioning_configuration.status Enabled

## Block public access on a bucket
id: s3public
task: Add an aws_s3_bucket_public_access_block named logs for the bucket aws_s3_bucket.logs.id. Turn on all four settings: block_public_acls, block_public_policy, ignore_public_acls and restrict_public_buckets.
hint: All four are boolean arguments. Set each to true.
@@ start
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}
@@ sol
resource "aws_s3_bucket" "logs" {
  bucket = "acme-logs-prod"
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket                  = aws_s3_bucket.logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
@@ checks
match resource.aws_s3_bucket_public_access_block.logs.bucket aws_s3_bucket\.logs\.id
eq resource.aws_s3_bucket_public_access_block.logs.block_public_acls true
eq resource.aws_s3_bucket_public_access_block.logs.block_public_policy true
eq resource.aws_s3_bucket_public_access_block.logs.ignore_public_acls true
eq resource.aws_s3_bucket_public_access_block.logs.restrict_public_buckets true

## An IAM role for EC2
id: iamrole
task: Create an aws_iam_role named app with name "app-role" and an assume_role_policy written with jsonencode that lets the service ec2.amazonaws.com assume it (action sts:AssumeRole, effect Allow).
hint: jsonencode takes an object. The principal is { Service = "ec2.amazonaws.com" }.
@@ start
# Write your configuration here
@@ sol
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}
@@ checks
eq resource.aws_iam_role.app.name app-role
match resource.aws_iam_role.app.assume_role_policy jsonencode
match resource.aws_iam_role.app.assume_role_policy sts:AssumeRole
match resource.aws_iam_role.app.assume_role_policy ec2\.amazonaws\.com

## A launch template
id: launchtpl
task: Create an aws_launch_template named web with name_prefix "web-", image_id "ami-0abc1234", instance_type "t3.small" and update_default_version true.
hint: Everything here is a plain argument on the resource.
@@ start
# Write your configuration here
@@ sol
resource "aws_launch_template" "web" {
  name_prefix           = "web-"
  image_id              = "ami-0abc1234"
  instance_type         = "t3.small"
  update_default_version = true
}
@@ checks
eq resource.aws_launch_template.web.name_prefix web-
eq resource.aws_launch_template.web.image_id ami-0abc1234
eq resource.aws_launch_template.web.instance_type t3.small
eq resource.aws_launch_template.web.update_default_version true

## Use a variable with a list type
id: listvar
task: Declare a variable allowed_cidrs of type list(string) with the default ["10.0.0.0/8", "192.168.0.0/16"] and a description.
hint: The type is written list(string). The default is a list in square brackets.
@@ start
# Write your configuration here
@@ sol
variable "allowed_cidrs" {
  type        = list(string)
  description = "CIDR ranges allowed to connect"
  default     = ["10.0.0.0/8", "192.168.0.0/16"]
}
@@ checks
eq variable.allowed_cidrs.type list(string)
has variable.allowed_cidrs.default
has variable.allowed_cidrs.description
match variable.allowed_cidrs.default 10\.0\.0\.0/8

## A map variable for instance sizes
id: mapvar
task: Declare a variable sizes of type map(string) with the default { dev = "t3.micro", prod = "m5.large" }. Add a local value size that picks the entry for var.environment with lookup(var.sizes, var.environment, "t3.micro").
hint: locals holds name = expression pairs. lookup takes the map, the key and a default.
@@ start
variable "environment" {
  type = string
}
@@ sol
variable "environment" {
  type = string
}

variable "sizes" {
  type = map(string)
  default = {
    dev  = "t3.micro"
    prod = "m5.large"
  }
}

locals {
  size = lookup(var.sizes, var.environment, "t3.micro")
}
@@ checks
eq variable.sizes.type map(string)
has variable.sizes.default
match locals.size lookup\(var\.sizes

## Output a list with a splat
id: splat
task: Given aws_instance.web with count = 3, write an output named ids whose value is aws_instance.web[*].id.
hint: The splat expression collects an attribute from every instance.
@@ start
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0abc1234"
  instance_type = "t3.micro"
}
@@ sol
resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0abc1234"
  instance_type = "t3.micro"
}

output "ids" {
  value = aws_instance.web[*].id
}
@@ checks
eq resource.aws_instance.web.count 3
match output.ids.value aws_instance\.web\[\*\]\.id

## Conditional resource creation
id: createif
task: Create aws_s3_bucket.audit with bucket "acme-audit" only when var.enable_audit is true. Declare the variable enable_audit as a bool with the default false.
hint: count = var.enable_audit ? 1 : 0.
@@ start
# Write your configuration here
@@ sol
variable "enable_audit" {
  type    = bool
  default = false
}

resource "aws_s3_bucket" "audit" {
  count  = var.enable_audit ? 1 : 0
  bucket = "acme-audit"
}
@@ checks
eq variable.enable_audit.type bool
eq variable.enable_audit.default false
match resource.aws_s3_bucket.audit.count var\.enable_audit \? 1 : 0
eq resource.aws_s3_bucket.audit.bucket acme-audit

## Tag every resource with merge
id: mergetags
task: Add a local value tags that merges var.extra_tags into the map { team = "platform", managed_by = "terraform" } with merge(). Use local.tags as the tags of aws_s3_bucket.data (bucket "acme-data").
hint: merge({ ... }, var.extra_tags) returns one map.
@@ start
variable "extra_tags" {
  type    = map(string)
  default = {}
}
@@ sol
variable "extra_tags" {
  type    = map(string)
  default = {}
}

locals {
  tags = merge({ team = "platform", managed_by = "terraform" }, var.extra_tags)
}

resource "aws_s3_bucket" "data" {
  bucket = "acme-data"
  tags   = local.tags
}
@@ checks
match locals.tags merge\(
match locals.tags var\.extra_tags
eq resource.aws_s3_bucket.data.bucket acme-data
match resource.aws_s3_bucket.data.tags local\.tags

## A CloudWatch alarm
id: alarm
task: Create an aws_cloudwatch_metric_alarm named cpu_high with alarm_name "cpu-high", namespace "AWS/EC2", metric_name "CPUUtilization", comparison_operator "GreaterThanThreshold", threshold 80, period 300, evaluation_periods 2 and statistic "Average".
hint: All of these are plain arguments.
@@ start
# Write your configuration here
@@ sol
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "cpu-high"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  comparison_operator = "GreaterThanThreshold"
  threshold           = 80
  period              = 300
  evaluation_periods  = 2
  statistic           = "Average"
}
@@ checks
eq resource.aws_cloudwatch_metric_alarm.cpu_high.alarm_name cpu-high
eq resource.aws_cloudwatch_metric_alarm.cpu_high.metric_name CPUUtilization
eq resource.aws_cloudwatch_metric_alarm.cpu_high.comparison_operator GreaterThanThreshold
eq resource.aws_cloudwatch_metric_alarm.cpu_high.threshold 80
eq resource.aws_cloudwatch_metric_alarm.cpu_high.evaluation_periods 2

## A DNS record
id: route53
task: Create an aws_route53_record named www in the zone var.zone_id with name "www.example.com", type "CNAME", ttl 300 and records ["lb.example.com"].
hint: records is a list of strings.
@@ start
variable "zone_id" {
  type = string
}
@@ sol
variable "zone_id" {
  type = string
}

resource "aws_route53_record" "www" {
  zone_id = var.zone_id
  name    = "www.example.com"
  type    = "CNAME"
  ttl     = 300
  records = ["lb.example.com"]
}
@@ checks
match resource.aws_route53_record.www.zone_id var\.zone_id
eq resource.aws_route53_record.www.name www.example.com
eq resource.aws_route53_record.www.type CNAME
eq resource.aws_route53_record.www.ttl 300
match resource.aws_route53_record.www.records lb\.example\.com

## An Azure resource group
id: azrg
task: Configure the azurerm provider with an empty features block, then create an azurerm_resource_group named main with name "rg-app-prod" and location "westeurope".
hint: The azurerm provider requires a features {} block.
@@ start
# Write your configuration here
@@ sol
provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-app-prod"
  location = "westeurope"
}
@@ checks
has provider.azurerm
eq resource.azurerm_resource_group.main.name rg-app-prod
eq resource.azurerm_resource_group.main.location westeurope

## An Azure storage account
id: azstorage
task: Create an azurerm_storage_account named logs in azurerm_resource_group.main. Set name "acmelogs001", account_tier "Standard", account_replication_type "GRS" and min_tls_version "TLS1_2". Use the resource group name and location by reference.
hint: Reference azurerm_resource_group.main.name and azurerm_resource_group.main.location.
@@ start
resource "azurerm_resource_group" "main" {
  name     = "rg-app-prod"
  location = "westeurope"
}
@@ sol
resource "azurerm_resource_group" "main" {
  name     = "rg-app-prod"
  location = "westeurope"
}

resource "azurerm_storage_account" "logs" {
  name                     = "acmelogs001"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"
  min_tls_version          = "TLS1_2"
}
@@ checks
eq resource.azurerm_storage_account.logs.name acmelogs001
match resource.azurerm_storage_account.logs.resource_group_name azurerm_resource_group\.main\.name
eq resource.azurerm_storage_account.logs.account_replication_type GRS
eq resource.azurerm_storage_account.logs.min_tls_version TLS1_2

## A for_each over a set of users
id: foreachiam
task: Create one aws_iam_user named team for each name in the set ["ann", "bob", "cho"] with for_each = toset(var.users). Declare variable users as list(string) with that default. Use each.key as the user name.
hint: toset converts the list. Inside the block, each.key is the current value.
@@ start
# Write your configuration here
@@ sol
variable "users" {
  type    = list(string)
  default = ["ann", "bob", "cho"]
}

resource "aws_iam_user" "team" {
  for_each = toset(var.users)
  name     = each.key
}
@@ checks
eq variable.users.type list(string)
match resource.aws_iam_user.team.for_each toset\(var\.users\)
match resource.aws_iam_user.team.name each\.key

## Ignore changes made outside Terraform
id: ignorechg
task: In aws_autoscaling_group.web (min_size 1, max_size 6, desired_capacity 2) add a lifecycle block that ignores changes to desired_capacity, because the autoscaler changes it.
hint: lifecycle { ignore_changes = [desired_capacity] }.
@@ start
resource "aws_autoscaling_group" "web" {
  min_size         = 1
  max_size         = 6
  desired_capacity = 2
}
@@ sol
resource "aws_autoscaling_group" "web" {
  min_size         = 1
  max_size         = 6
  desired_capacity = 2

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}
@@ checks
eq resource.aws_autoscaling_group.web.max_size 6
match resource.aws_autoscaling_group.web.lifecycle.ignore_changes desired_capacity

## A terraform_remote_state data source
id: remotestate
task: Read outputs from another stack with a terraform_remote_state data source named network. Use the s3 backend with bucket "acme-tfstate", key "network/terraform.tfstate" and region "eu-west-1".
hint: data "terraform_remote_state" "network" { backend = "s3" config = { ... } }.
@@ start
# Write your configuration here
@@ sol
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "acme-tfstate"
    key    = "network/terraform.tfstate"
    region = "eu-west-1"
  }
}
@@ checks
eq data.terraform_remote_state.network.backend s3
src bucket\s*=\s*"acme-tfstate"
src key\s*=\s*"network/terraform.tfstate"
src region\s*=\s*"eu-west-1"

## A null_resource-free trigger with terraform_data
id: terraformdata
task: Create a terraform_data resource named bootstrap with triggers_replace set to var.version, so that it is replaced when the version changes. Declare variable version as string.
hint: terraform_data has an argument triggers_replace.
@@ start
# Write your configuration here
@@ sol
variable "version" {
  type = string
}

resource "terraform_data" "bootstrap" {
  triggers_replace = var.version
}
@@ checks
eq variable.version.type string
match resource.terraform_data.bootstrap.triggers_replace var\.version

## Sensitive output marked correctly
id: sensout2
task: Declare a variable api_token of type string marked sensitive = true, and an output named token_hint with the value substr(var.api_token, 0, 4) that is also sensitive.
hint: Both blocks take sensitive = true.
@@ start
# Write your configuration here
@@ sol
variable "api_token" {
  type      = string
  sensitive = true
}

output "token_hint" {
  value     = substr(var.api_token, 0, 4)
  sensitive = true
}
@@ checks
eq variable.api_token.sensitive true
eq output.token_hint.sensitive true
match output.token_hint.value substr\(var\.api_token

## Check a required provider with an alias
id: aliasprov
task: Add a second aws provider with alias "dr" in region "us-east-1" next to the default one in "eu-west-1". Create aws_s3_bucket.replica with bucket "acme-replica" that uses provider = aws.dr.
hint: The provider argument on a resource is written provider = aws.dr, without quotes.
@@ start
provider "aws" {
  region = "eu-west-1"
}
@@ sol
provider "aws" {
  region = "eu-west-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-east-1"
}

resource "aws_s3_bucket" "replica" {
  provider = aws.dr
  bucket   = "acme-replica"
}
@@ checks
eq resource.aws_s3_bucket.replica.bucket acme-replica
match resource.aws_s3_bucket.replica.provider aws\.dr
src alias\s*=\s*"dr"
src us-east-1

## Name resources with a local prefix
id: tflocalexec
task: Use a local value named name_prefix built with format("%s-%s", var.project, var.environment). Declare both variables as string, and create aws_s3_bucket.assets with bucket "${local.name_prefix}-assets".
hint: Interpolate a local inside a string with ${local.name_prefix}.
@@ start
# Write your configuration here
@@ sol
variable "project" {
  type = string
}

variable "environment" {
  type = string
}

locals {
  name_prefix = format("%s-%s", var.project, var.environment)
}

resource "aws_s3_bucket" "assets" {
  bucket = "${local.name_prefix}-assets"
}
@@ checks
eq variable.project.type string
eq variable.environment.type string
match locals.name_prefix format\(
match resource.aws_s3_bucket.assets.bucket local\.name_prefix
