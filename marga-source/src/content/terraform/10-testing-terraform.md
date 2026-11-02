---
title: Testing Terraform code
minutes: 14
summary: Catch mistakes early with formatting, validation, linting, policy checks, plan assertions and real test deployments using terraform test and Terratest, in a pipeline that stays affordable.
---

Infrastructure code changes can delete databases, open networks to the world or cost a lot of money. Yet many teams test it only by applying it and watching. A layered approach finds most mistakes in seconds, before anything is created, and keeps expensive tests for the cases that need them.

## What you will learn

- The testing layers from cheap to expensive
- `fmt`, `validate`, linters and security scanners
- Policy checks on the plan
- `terraform test` with mocks and real runs
- Keeping test environments cheap and clean

## Layers

| Layer | Tool | Finds | Cost |
|-------|------|-------|------|
| Format | `terraform fmt -check` | Style differences | Seconds |
| Validate | `terraform validate` | Syntax, wrong references, wrong types | Seconds |
| Lint | `tflint` | Invalid instance types, deprecated syntax, provider rules | Seconds |
| Security scan | Trivy, Checkov or similar | Public buckets, open ports, missing encryption | Seconds |
| Plan checks | Policy as code on plan JSON | Rules such as required tags, no destroys of tagged resources | Seconds to a minute |
| Unit tests | `terraform test` with mocks | Module logic and outputs | Seconds |
| Integration tests | `terraform test` or Terratest with real resources | Whether it really works | Minutes, small cost |

## The cheap layers in a pipeline

```bash
terraform fmt -check -recursive
terraform init -backend=false
terraform validate
tflint --recursive
trivy config .
terraform plan -out=tfplan && terraform show -json tfplan > plan.json
conftest test plan.json --policy policy/
```

Run these on every change. They need no cloud credentials for most steps (use `-backend=false` and, for the plan, a read-only role).

## terraform test

Terraform has a built-in test framework with files that end in `.tftest.hcl`:

```hcl
# tests/bucket.tftest.hcl
variables {
  name = "test-logs"
}

run "creates_private_encrypted_bucket" {
  command = plan

  assert {
    condition     = aws_s3_bucket_public_access_block.this.block_public_acls == true
    error_message = "public ACLs must be blocked"
  }

  assert {
    condition     = length(aws_s3_bucket.this.tags) >= 2
    error_message = "bucket must carry owner and environment tags"
  }
}
```

With `command = plan`, nothing is created. With `command = apply` (the default), Terraform creates real resources in the test and destroys them at the end. Mocked providers let you test module logic without any cloud calls.

## Integration tests

Use a separate account or project with budget alerts, unique names (random suffix) so tests can run in parallel, and a clean-up job that removes leftovers older than a few hours. Go-based Terratest can also check behaviour, such as making an HTTP request to the new load balancer. Test modules that are used widely; do not apply a full production stack on every commit.

## What to assert

- Security: encryption on, public access off, least-privilege policies.
- Contracts: a module's outputs exist and have the expected shape.
- Safety: a plan for a change to production does not destroy tagged data stores.
- Defaults: a module works with only the required inputs.

```predict
Q: Which test layer catches a reference to a variable that does not exist?
???
terraform validate, which checks syntax and references without creating anything.
> The cheapest layer finds many errors. Run it first and on every change.
```

## Incident: the module that opened the database

> **Incident:** A module update makes a database reachable from the internet in a staging account. It is found two weeks later by an external scan.

```console
$ conftest test plan.json --policy policy/
FAIL - plan.json - aws_security_group.db: ingress from 0.0.0.0/0 is not allowed
```

The new default for a variable had changed the allowed range, and no test examined the plan. The team added a plan policy that rejects public ingress to data stores, a `terraform test` for the module defaults, and made the checks required for merging.

## Common mistakes

- Only testing by applying to production
- Tests that leave resources behind
- Integration tests on every commit in an expensive account
- Policy checks that can be skipped by developers

```quiz
Q: Which command checks syntax and references without calling the cloud?
- terraform apply :: It creates resources.
+ terraform validate
- terraform destroy :: It removes resources.
- terraform import :: It adopts resources.
> Validate is fast and needs no credentials.

Q: What does command = plan in a terraform test run block do?
+ Checks assertions against a plan without creating resources
- Applies the change :: That is command = apply.
- Deletes state :: Unrelated.
- Skips assertions :: Unrelated.
> It is a cheap way to test logic and settings.

Q: Why use unique random names in integration tests?
+ So parallel runs do not collide and leftovers are easy to find
- To avoid tags :: Unrelated.
- To skip clean-up :: You still need clean-up.
- To reduce cost :: Not the reason.
> Unique names isolate runs.

Q: What is the benefit of policy checks on the plan JSON?
+ Rules such as no public ingress are enforced before anything is created
- They speed up apply :: Unrelated.
- They replace code review :: They complement it.
- They encrypt state :: Unrelated.
> The plan shows what will change, so rules can reject it.
```

```cards
Cheapest Terraform checks? :: fmt, validate, tflint
What does terraform test do? :: Runs .tftest.hcl assertions, with plan or real apply
What do you scan the plan with? :: Policy as code such as conftest or similar
How to avoid leftover test resources? :: Unique names and a clean-up job
Where to run integration tests? :: A separate account with budget alerts
```
