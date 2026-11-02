---
title: Secrets and sensitive data in Terraform
minutes: 14
summary: Keep passwords and keys out of code and logs, understand that state holds secrets, read secrets from a manager at runtime, and secure the state backend.
---

Terraform needs to handle database passwords, API keys and certificates, yet its design stores a great deal in plain text. Knowing exactly where secrets can leak is the first step to preventing it.

## What you will learn

- Why secrets appear in state and plan output
- Marking values `sensitive` and what that does and does not do
- Generating and fetching secrets from a secret manager
- Protecting state, and ephemeral approaches

## Where secrets leak

1. **Source code**: a password written in a `.tf` file or in `terraform.tfvars` committed to version control
2. **Plan and apply output**: values shown in the console or CI log
3. **State**: resource attributes, including passwords you passed in, are stored in the state file in plain text
4. **Environment and shell history**: variables exported or typed on the command line

The `sensitive = true` setting hides a value from CLI output, but it does **not encrypt it in state**.

```hcl
variable "db_password" {
  type      = string
  sensitive = true
}

output "connection_string" {
  value     = "postgres://app:${var.db_password}@${aws_db_instance.main.address}/shop"
  sensitive = true
}
```

Anyone who can read the state file can read the secret. That is why state must be treated as a secret in itself.

## Do not choose passwords in code

Let the platform generate a password and keep it in a secret manager.

```hcl
resource "random_password" "db" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "db" {
  name = "shop/prod/db"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id     = aws_secretsmanager_secret.db.id
  secret_string = random_password.db.result
}

resource "aws_db_instance" "main" {
  identifier          = "shop-prod"
  engine              = "postgres"
  instance_class      = "db.t3.medium"
  allocated_storage   = 50
  username            = "app"
  password            = random_password.db.result
  skip_final_snapshot = false
}
```

The password still passes through state, but it never appears in code, tickets or chat. Some resources support **managed passwords** where the service creates and rotates the secret itself (for example `manage_master_user_password = true` on RDS), which keeps the value out of Terraform entirely. Prefer that when available.

## Reading existing secrets

```hcl
data "aws_secretsmanager_secret_version" "api_key" {
  secret_id = "shop/prod/payments-api-key"
}

resource "aws_lambda_function" "worker" {
  function_name = "shop-worker"
  role          = aws_iam_role.worker.arn
  runtime       = "python3.12"
  handler       = "main.handler"
  filename      = "worker.zip"

  environment {
    variables = {
      PAYMENTS_SECRET_ARN = "shop/prod/payments-api-key"
    }
  }
}
```

Notice the better pattern in the example: pass the **name or ARN** of the secret to the application and let the application fetch it at runtime with its IAM role. That keeps the value out of the Terraform state and out of the Lambda configuration. Reading a secret with a `data` source writes the value into state.

## Securing the state backend

- Store state in a remote backend with encryption at rest (for example an S3 bucket with SSE-KMS, or Azure Storage with encryption)
- Enable versioning so you can recover from corruption
- Restrict access by IAM: only the pipeline role and a few administrators can read state
- Enable locking, block public access and turn on access logging
- Never commit `*.tfstate`, `*.tfvars` with secrets or `.terraform/` to version control

```console
$ terraform state pull | jq '.resources[] | select(.type=="aws_db_instance") | .instances[0].attributes.password'
$ aws s3api get-bucket-encryption --bucket acme-tfstate
$ aws s3api get-public-access-block --bucket acme-tfstate
```

The second command demonstrates the risk: reading the state exposes the database password.

## Supplying inputs in a pipeline

```console
$ export TF_VAR_db_password="$(aws secretsmanager get-secret-value --secret-id shop/prod/db --query SecretString --output text)"
$ terraform plan -out=tfplan
$ terraform apply tfplan
```

Plan files can also contain secrets, so treat them as sensitive and delete them after use. CI systems should inject variables from a protected store and mask them in logs.

## Incident: the password in the pull request

> **Incident:** A developer adds `password = "S3cret!2024"` to a Terraform file and opens a pull request. The branch is pushed, the CI log prints the plan, and the password appears in the review tool, the build log and the plan artifact.

Treat the password as compromised. Rotate it first, then clean up:

```console
$ aws rds modify-db-instance --db-instance-identifier shop-prod --manage-master-user-password --apply-immediately
$ aws secretsmanager get-secret-value --secret-id 'rds!db-abc123' --query SecretString --output text | head -c 0
```

After rotation, remove the literal from code, mark the variable `sensitive`, delete or redact the log and artifact, and add a pre-commit secret scanner plus a pipeline check that fails when credentials patterns appear. Prefer managed passwords so there is nothing to commit.

## Common mistakes

- Believing `sensitive = true` encrypts the state
- Committing `terraform.tfvars` or state files
- Reading secrets with data sources and passing them into resource arguments unnecessarily
- Leaving the state bucket readable by many people
- Keeping old plan files that contain secrets

```quiz
Q: Does marking a variable sensitive encrypt it in the state file?
- Yes
+ No, it only hides the value from CLI output
- Only for strings
- Only in remote backends
> State must be protected as a secret because it still holds the value.

Q: What is the best way for an application to get a database password?
- Hard-code it in the Terraform file
+ Fetch it from a secret manager at runtime using its own identity
- Email it to the team
- Store it in a tag
> Runtime retrieval keeps the secret out of code and state where possible.

Q: Which backend practice protects state?
- Public bucket for easy access
+ Encryption at rest, versioning, locking and restricted access
- Keeping it on a laptop
- Disabling logs
> State contains infrastructure details and often secrets.

Q: What should you do first when a secret is committed?
- Delete the commit message
+ Rotate or revoke the secret
- Squash the branch
- Rename the variable
> Assume it is exposed and invalidate it before cleaning up.
```

```cards
Does terraform state store secrets? :: Yes, resource attributes including passwords are stored in plain text
What does sensitive = true do? :: Hides the value in plan and output displays only
Better than a stored password? :: A managed password or a secret fetched at runtime by the application
What else can contain secrets? :: Saved plan files and CI logs
```
