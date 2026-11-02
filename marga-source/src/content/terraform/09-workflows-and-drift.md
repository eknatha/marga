---
title: Team workflows, drift and testing
minutes: 15
summary: Run Terraform safely in a pipeline with reviewed plans, detect and resolve drift, and add automated checks before apply.
---

Running `terraform apply` from a laptop works until the second engineer joins. Then you need a shared workflow: changes reviewed before they run, one place where applies happen, and a way to notice when reality has wandered away from the code.

## What you will learn

- A pipeline pattern for plan and apply
- Detecting and handling drift
- Static checks and tests before apply
- Safe handling of destructive changes

## The pipeline pattern

1. A change is proposed and a pipeline runs `fmt -check`, `validate` and security checks.
2. The pipeline runs `plan` and posts the result for review.
3. A human approves the plan and the code together.
4. After approval, the pipeline runs `apply` with the **saved** plan, from a single controlled environment.

```bash
terraform fmt -check -recursive
terraform init -input=false
terraform validate
terraform plan -input=false -out=tfplan
# review step happens here
terraform apply -input=false tfplan
```

The pipeline should authenticate with short-lived credentials (a role assumed through the CI system's identity federation) and not long-lived keys stored as variables. Give plan jobs read-only permission and apply jobs the write permission, so a plan on an untrusted change cannot modify anything.

## Drift

**Drift** means the real infrastructure no longer matches the code. It happens when someone changes something in the console, when another tool modifies a resource, or when a cloud service changes a default.

```console
$ terraform plan -detailed-exitcode
$ echo $?
2
```

With `-detailed-exitcode`, the exit status is `0` for no changes, `1` for an error, and `2` when changes are present. Run this on a schedule for each environment and alert on `2` where nothing was supposed to change. When you find drift, decide which side is right:

| Situation | Action |
|-----------|--------|
| The manual change was a mistake | `apply` to put the real resource back to the code |
| The manual change was needed | Update the code to match, then confirm `plan` is clean |
| The attribute is managed elsewhere (an autoscaler changes the count) | Add `lifecycle { ignore_changes = [...] }` for that field only |

`terraform apply -refresh-only` updates state to match reality without changing infrastructure, useful when you want to record a change that is already correct.

## Checks before apply

| Check | Catches |
|-------|---------|
| `terraform fmt -check` | Style inconsistencies |
| `terraform validate` | Syntax and reference errors |
| `tflint` | Provider-specific mistakes such as invalid instance types |
| `trivy config .` or `checkov` | Insecure settings such as open security groups and unencrypted storage |
| `terraform test` | Behaviour of modules against assertions you write |
| Policy checks (for example OPA) | Organization rules, such as required tags |

A minimal native test file:

```hcl
# tests/bucket.tftest.hcl
run "bucket_is_private" {
  command = plan

  variables {
    name = "test-site"
  }

  assert {
    condition     = aws_s3_bucket_public_access_block.site.block_public_acls == true
    error_message = "Public ACLs must be blocked."
  }
}
```

## Destructive changes

Treat these as separate, deliberate changes: replacing databases, deleting storage, and changing network ranges. Use `prevent_destroy`, take backups or snapshots first, apply in a quiet period, and confirm the plan lists exactly the resources you expect. For zero-downtime replacement of stateless resources, `create_before_destroy` builds the new one first.

## Incident: scheduled plan shows unexpected changes

> **Incident:** Your nightly drift check exits with `2` and the plan wants to remove a security group rule that nobody in the team touched.

```console
  # aws_security_group.web will be updated in-place
  ~ resource "aws_security_group" "web" {
      ~ ingress = [
          - {
              - cidr_blocks = ["203.0.113.10/32"]
              - description = "temp debug access"
              - from_port   = 22
```

Someone added an SSH rule in the console during an investigation. The drift check found it. Do not just apply and move on. Ask who added it and why, since an incident may still be in progress. If the access is no longer needed, apply to remove it, which restores the intended state and closes an unreviewed hole. If it is needed, add it to the code through a reviewed change. Then reduce future console edits: restrict write permission in the console to a break-glass role, and make that role's use alert the team.

```diagram
title: A safe infrastructure change
node: pr | Pull request | 0 | 1 | Code change and a plan comment. | Without a plan, reviewers guess.
node: plan | Plan | 1 | 1 | Shows adds, changes and destroys. | A destroy of a database must stop everything.
node: rev | Review | 2 | 0 | A person checks the plan, not only the code. | Rubber-stamping misses surprises.
node: app | Apply | 3 | 1 | Applies the saved plan from the pipeline. | Applying from a laptop skips audit and locking.
node: drift | Drift check | 2 | 2 | A scheduled plan finds manual changes. | Unnoticed drift makes the next apply risky.
edge: pr | plan
edge: plan | rev
edge: rev | app
edge: app | drift
edge: drift | pr
```

## Common mistakes

- Applying a fresh plan that differs from the one reviewed
- Long-lived cloud keys stored in CI
- Never checking for drift
- Disabling a failing security check instead of fixing the finding

```quiz
Q: What does terraform plan -detailed-exitcode return when changes are pending?
- 0
- 1
+ 2
- 3
> 0 means no changes, 1 an error, 2 changes present.

Q: Why apply a saved plan file in a pipeline?
- It runs faster
+ What was reviewed is exactly what is applied
- It skips authentication
- It disables locking
> A fresh plan could differ if the infrastructure changed after review.

Q: What is drift?
- A provider version change
+ Real infrastructure differing from what the code and state describe
- A slow apply
- A syntax error
> Usually caused by manual console changes or other tools.

Q: An autoscaler legitimately changes a resource's desired count. How do you stop Terraform fighting it?
+ lifecycle { ignore_changes = [desired_count] } on that attribute
- Delete the resource from state
- Disable plans
- Use count
> ignore_changes excludes only that attribute from comparison.
```

```cards
Standard pipeline order? :: fmt, validate, checks, plan, human approval, apply the saved plan
What is drift? :: Reality differs from code and state, often from manual console changes
Command to record reality without changing it? :: terraform apply -refresh-only
Why use short-lived CI credentials? :: A leaked token expires quickly and is easier to scope and audit
```
