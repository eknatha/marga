---
title: Debugging Terraform plans, state and providers
minutes: 15
summary: Diagnose failed plans and applies, state locks, drift, unexpected replacements and provider errors using TF_LOG, plan output, state commands and import.
---

Terraform failures fall into a few families: the configuration is invalid, the state does not match reality, the provider call was rejected by the cloud, or a plan wants to destroy something you did not expect. Knowing the family tells you where to look.

## What you will learn

- Reading validate, plan and apply errors
- Turning on detailed logs with `TF_LOG`
- State problems: locks, drift, missing or duplicated resources
- Why a plan shows replacement, and how to prevent it
- Recovering with `import`, `state mv` and `state rm`

## Four families of failure

| Family | Typical message | First step |
|--------|-----------------|------------|
| Configuration | Unsupported argument, invalid reference | `terraform validate`, `terraform fmt -check` |
| State | Error acquiring the state lock, resource already exists | `terraform state list`, check the backend |
| Provider or cloud | 403 AccessDenied, quota exceeded, name taken | Read the API error, check permissions and limits |
| Plan surprise | `must be replaced`, unexpected destroy | Read `# forces replacement` markers |

## See what the provider sent

```bash
TF_LOG=DEBUG TF_LOG_PATH=./tf.log terraform plan   # may contain sensitive data, delete after use
terraform plan -out=tfplan && terraform show tfplan
terraform plan -refresh-only                         # show drift without proposing changes
terraform state list
terraform state show aws_instance.web
```

`TF_LOG=DEBUG` shows each API request and response, which turns "Error: 403" into a named permission. Delete the log file afterwards because it can contain secrets.

## Plan surprises

```console
  # aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ identifier = "shop-db" -> "shop-database" # forces replacement
```

A changed name or other immutable attribute forces replacement. For stateful resources this means data loss. Revert the change, or add `lifecycle { prevent_destroy = true }` to stop an accidental destroy. When you rename a resource in code, use a `moved` block or `terraform state mv` so Terraform treats it as the same object.

## Repair the state, carefully

```bash
terraform import aws_s3_bucket.logs shop-logs-prod     # adopt an existing resource
terraform state mv aws_instance.web aws_instance.app   # rename in state
terraform state rm aws_instance.old                    # forget it without destroying it
terraform force-unlock LOCK_ID                         # only when sure nobody is applying
```

Take a copy of the state first (`terraform state pull > backup.tfstate`), and never edit the state file by hand.

```predict
Q: You rename a resource block from "web" to "app" and run plan. What does Terraform propose?
???
Destroy "web" and create "app", because the address changed and no moved block tells it they are the same object.
> Add a moved block (from = aws_instance.web, to = aws_instance.app) or run terraform state mv before planning.
```

```diagram
title: Narrowing down a failed Terraform run
node: val | Validate | 0 | 1 | terraform validate and fmt catch syntax and reference errors. | Skipping it means slow cloud errors for simple typos.
node: plan | Read the plan | 1 | 0 | Look for replacement markers and unexpected destroys. | Applying without reading the plan is how data is lost.
node: state | State and lock | 1 | 2 | state list, show and the backend lock status. | A stale lock or drifted resource blocks or misleads the plan.
node: api | Provider and cloud | 2 | 1 | TF_LOG shows the API call and the exact denial or quota error. | Missing permissions look like random failures without the log.
node: fix | Fix, plan again | 3 | 1 | Change code or state, then confirm with a clean plan. | An apply that is not followed by a clean plan hides leftovers.
edge: val | plan
edge: val | state
edge: plan | api
edge: state | api
edge: api | fix
```

## Incident: the plan that wanted to delete the database

> **Incident:** A harmless-looking refactor shows `1 to add, 1 to destroy` on the production database.

```console
$ terraform plan | grep -B2 -A2 "forces replacement"
  # module.db.aws_db_instance.main must be replaced
      ~ db_subnet_group_name = "shop-a" -> "shop-b" # forces replacement
```

The refactor changed the subnet group name, which RDS cannot change in place. The reviewer caught the destroy line, so the team reverted the name, added `prevent_destroy`, and added a pipeline rule that fails when a plan destroys a tagged production resource.

## Common mistakes

- Applying a plan nobody read
- Using `force-unlock` while another run is active
- Hand-editing state
- Leaving `TF_LOG` files that contain secrets

```quiz
Q: What does "# forces replacement" next to an attribute in a plan mean?
- The change is safe and instant :: Replacement destroys and recreates the resource.
+ The attribute cannot change in place, so the resource is destroyed and created again
- Terraform ignores the change :: It will act on it.
- The provider is outdated :: The marker says nothing about versions.
> For stateful resources, replacement can mean data loss.

Q: Which setting reveals the exact API errors a provider received?
- terraform fmt :: It only formats files.
+ TF_LOG=DEBUG with TF_LOG_PATH
- terraform output :: It prints output values.
- terraform graph :: It draws dependencies.
> Debug logs show requests and responses, but may contain secrets.

Q: You renamed a resource in code and want to keep the existing object. What do you add?
- A new provider :: Providers do not map addresses.
+ A moved block, or run terraform state mv
- A longer timeout :: Timeouts do not link addresses.
- A new workspace :: A workspace has its own state.
> The move tells Terraform both addresses are the same object.

Q: An apply is interrupted and later runs report a state lock. When is force-unlock acceptable?
- Immediately, always :: You might break a live run.
+ Only after confirming no other run is using the lock
- Never, delete the state :: Deleting state loses track of resources.
- Only on Mondays :: The weekday is irrelevant.
> A forced unlock during a real apply can corrupt the state.
```

```cards
How to see drift without changes? :: terraform plan -refresh-only
How to adopt an existing resource? :: terraform import
How to rename without destroy? :: moved block or terraform state mv
What protects a resource from destroy? :: lifecycle prevent_destroy
Why delete TF_LOG files? :: They can contain secrets
```
