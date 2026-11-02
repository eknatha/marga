## Rename that wants to destroy a database
level: mid
A refactor renames a resource in the code. The plan shows something dangerous.

```text
$ terraform plan
  # aws_db_instance.main will be destroyed
  # aws_db_instance.primary will be created

Plan: 1 to add, 0 to change, 1 to destroy.
```
? What should you do before applying?
+ Add a moved block (or run terraform state mv) so the existing database is renamed in state, not replaced
- Apply the plan and restore from backup
- Delete the state file
- Use terraform apply -auto-approve to save time
why: Terraform identifies resources by their address. A new name looks like a new resource, and the old one looks like it was removed. A `moved { from = aws_db_instance.main to = aws_db_instance.primary }` block records the rename, so the plan shows no changes. Also protect databases with `prevent_destroy` and deletion protection.

## Error acquiring the state lock
level: mid
A pipeline run fails at the start.

```text
Error: Error acquiring the state lock
Lock Info:
  ID:        5b7e9c20-1a3d-9f0c-77aa-2c1e1d4f8a10
  Operation: OperationTypeApply
  Who:       ci-runner@build-17
  Created:   2026-10-24 06:02:11 UTC
```
? What is the safe first action?
+ Check whether the run that holds the lock is still running, and only use force-unlock if it is certainly dead
- Run terraform force-unlock immediately
- Delete the lock table and the state
- Run apply from a laptop to get past it
why: The lock protects the state from two writers at once. Look at the pipeline or at `build-17` to see whether an apply is in progress. If the job crashed and nothing is running, `terraform force-unlock <ID>` is acceptable, and then run a plan to verify the state. Forcing a lock during a live apply can corrupt the state.

## The resource already exists
level: mid
An apply fails after someone created a bucket by hand in the console.

```text
Error: creating S3 Bucket (company-reports): BucketAlreadyOwnedByYou
  with aws_s3_bucket.reports,
  on storage.tf line 4
```
? What is the right way forward?
+ Import the existing bucket into the state, then run a plan and reconcile any differences
- Delete the bucket in the console and lose its data
- Rename the resource in code and ignore the error
- Disable the state backend
why: Terraform has no record of the manual bucket, so it tries to create one. `terraform import aws_s3_bucket.reports company-reports` (or an `import` block) attaches the real bucket to the resource. Run a plan and adjust the code until it shows no unwanted changes. Then restrict console changes to avoid more drift.

## Plan wants to destroy and recreate a database
level: mid
After a small edit, the plan shows that a production database will be replaced.

```text
# aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main" {
      ~ identifier = "shop-db" -> "shop-database" # forces replacement
```
? What should you do?
+ Revert the rename so the plan shows no replacement, and use a moved block when only the resource address changes. Do not apply until the plan is clean
- Apply and restore from backup later
- Delete the state file
- Run apply with -auto-approve in the pipeline
why: Changing the identifier of a database forces a new instance, and the old one is destroyed with its data. Read the plan before every apply. Also set lifecycle prevent_destroy and deletion protection on production data stores, so that a mistaken plan fails.

## Two engineers cannot apply at once
level: mid
Applies fail with a message about the state, when two people work on the same stack.

```text
Error: Error acquiring the state lock
Lock Info:
  ID:        6f1c...
  Operation: OperationTypeApply
  Who:       maria@build-host
```
? What is the right response?
+ Wait for the other apply to finish. If it crashed, confirm that nothing is running and only then use force-unlock with the lock ID
- Delete the state file and start again
- Disable locking in the backend
- Copy the state to your laptop and apply from there
why: The lock stops two writers from corrupting the state. It is a safety feature. Check with the person or the pipeline first. Force-unlock is for a stale lock after a crash. Never bypass locking, because a race can lose resources from state.

## Plan shows changes nobody made
level: mid
A plan on an unchanged repository wants to modify a security group.

```text
~ aws_security_group.web
    ~ ingress = [
        - { cidr_blocks = ["0.0.0.0/0"], from_port = 22, to_port = 22 },
      ]
```
? What most likely happened?
+ Someone changed the security group in the console, so the real state drifted from the code. Find out why before applying, because the plan would remove that rule
- Terraform has a bug
- The provider is too old
- The state file is empty
why: Drift is a difference between code and reality. Apply would put things back to what the code says. First check the change history: someone may have added a rule for a real reason, and the right fix might be a code change. Also restrict console changes.

## Module change affects many environments
level: senior
A small change to a shared module will be used by 14 stacks.

```text
module "network" { source = "internal/network" version = "~> 2.0" }
Change: renames variable cidr to vpc_cidr (no default)
Consumers: 14 stacks track "~> 2.0"
```
? How should the change be released?
+ Treat it as a breaking change: publish a new major version, keep the old variable working or document migration, and let each stack upgrade through its own plan
- Merge it and let the stacks fail
- Edit every stack by hand in one go
- Delete the old version
why: Renaming a required input breaks every consumer on the next init. Semantic versioning tells people what is safe to take. A major version and a migration note let teams upgrade at their own pace and read the plan first.
