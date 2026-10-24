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
