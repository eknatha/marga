## What is Terraform state and why does it matter?
level: junior
State maps your configuration to the real resources Terraform created, and stores their attributes. Terraform uses it to plan changes and detect drift. Without it Terraform cannot know what exists. It can contain secrets, so store it in a remote, encrypted, access-controlled backend with locking, never in version control.

## Explain the Terraform workflow.
level: junior
Write the configuration, run `terraform init` to download providers and configure the backend, `terraform plan` to preview the changes, and `terraform apply` to make them. Review the plan carefully, especially replacements and destroys, and apply the exact saved plan from a pipeline. `terraform destroy` removes everything managed by the configuration.

## What is the difference between count and for_each?
level: mid
`count` creates indexed copies, so removing an item from the middle of a list shifts the later indexes and can cause resources to be destroyed and recreated. `for_each` creates instances keyed by a map key or set value, so each resource has a stable identity. Prefer `for_each` for named items and use `count` mainly as an on/off switch.

## What happens if two people run terraform apply at the same time?
level: mid
Without locking they could corrupt the state. Remote backends such as S3 with DynamoDB, Azure Storage, or Terraform Cloud lock the state during operations, so the second run waits or fails. Also run applies from a pipeline so only one process changes infrastructure, and never use `force-unlock` unless you are sure the lock is stale.

## How do you handle secrets in Terraform?
level: mid
Mark variables `sensitive`, but remember that only hides CLI output and the value is still in state. Keep state encrypted and tightly controlled, avoid putting secrets in code, generate them or use managed passwords, and let applications fetch secrets from a secret manager at runtime with their own identity. Scan for committed credentials in the pipeline.

## What is drift and how do you deal with it?
level: mid
Drift is a difference between real infrastructure and what the code and state describe, usually caused by manual changes. Detect it with `terraform plan` on a schedule or `-refresh-only`. Decide for each difference whether to revert the resource to the code, or update the code to match, then restrict console access so changes go through the pipeline.

## How do you structure Terraform for multiple environments?
level: senior
Put reusable logic in versioned modules and create a small root configuration per environment (or per component) with its own state and backend key. This limits blast radius, allows different permissions, and keeps plans fast. Avoid copying code between environments, pin provider and module versions, and promote changes through dev, staging and production using the same modules.

## A plan shows a database will be replaced. What do you do?
level: senior
Stop and understand why: a changed argument that forces replacement, a renamed resource or a moved address. If the resource was only renamed, use a `moved` block or `terraform state mv`. Protect stateful resources with `prevent_destroy`, deletion protection and final snapshots, take a backup before applying, and require a second reviewer for any plan that destroys data.

## How do you import existing infrastructure into Terraform?
level: senior
Write the resource configuration, then use `terraform import` or an `import` block (with `terraform plan -generate-config-out` to draft the code) to attach the existing resource to the state. Run a plan until it shows no changes, then commit the code. Import in small steps and do it in a pipeline or a controlled session.
