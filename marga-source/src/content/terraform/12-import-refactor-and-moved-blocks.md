---
title: Importing resources and refactoring safely
minutes: 13
summary: Bring existing infrastructure under Terraform, rename and reorganize resources without destroying them, and use plan to prove it.
---

Half of your infrastructure was created by hand in the console, and the other half sits in Terraform code that you now want to reorganize into modules. Both jobs have the same danger: Terraform decides what to destroy by comparing addresses in state with addresses in code. If those do not line up, the plan wants to delete real things.

## What you will learn

- Import existing resources with the import block
- Rename and move resources with moved blocks
- Remove a resource from management without destroying it
- Always read the plan: zero destroys is the goal

## Import existing resources

An `import` block tells Terraform that a resource in the cloud already exists and should be tracked at a given address. It is code, so it can be reviewed, unlike an ad hoc command.

```hcl
import {
  to = aws_s3_bucket.assets
  id = "acme-assets-prod"
}

resource "aws_s3_bucket" "assets" {
  bucket = "acme-assets-prod"
}
```

Run `terraform plan` and the plan shows the import. Then add attributes to the resource until the plan shows no changes for it, because Terraform compares your code to the real settings. `terraform plan -generate-config-out=generated.tf` can write a first draft of the resource for you to clean up. Imports update state only; they never change the real resource until you apply a change.

## Rename and move with moved blocks

If you rename `aws_instance.web` to `aws_instance.app`, Terraform sees one resource to destroy and a new one to create. A `moved` block says it is the same object.

```hcl
moved {
  from = aws_instance.web
  to   = aws_instance.app
}
```

The same works when you move a resource into a module: `from = aws_instance.app` and `to = module.compute.aws_instance.app`. The plan then reports "has moved" and no destroy. Keep moved blocks in the code until every environment has applied them, because each state needs to see the move once. Compared with `terraform state mv`, a moved block is reviewed, repeatable, and works the same for every environment.

## Stop managing without destroying

To hand a resource to another team or tool, remove it from state without touching the real object. The `removed` block does this in code:

```hcl
removed {
  from = aws_s3_bucket.legacy
  lifecycle {
    destroy = false
  }
}
```

Without `destroy = false`, deleting the resource block would plan a destroy. Protect critical resources with `prevent_destroy = true` in `lifecycle`, so that an accidental removal fails at plan time.

## Prove the refactor

The proof is the plan. Before and after a refactor, run `terraform plan` and read the summary line. A pure refactor should say `0 to add, 0 to change, 0 to destroy`, with only "moved" or "import" notes. Do it first on a non-production environment with the same code, then in production through the normal pipeline, with the plan attached to the review. If anything is to be destroyed that you did not intend, stop and fix the addressing before applying.

```predict
Q: You move a resource into a module and the plan shows 1 to destroy and 1 to add. What do you add?
???
A moved block from the old address to the new address inside the module.
> The plan sees different addresses; moved tells Terraform they are the same object.
```

## Incident: The plan that wanted to delete production

> **Incident:** A cleanup moved all network resources into a module, and the pipeline plan showed 38 resources to destroy, including the production VPC.

```console
$ terraform plan | tail -4
Plan: 38 to add, 0 to change, 38 to destroy.
  # aws_vpc.main will be destroyed
  # module.network.aws_vpc.main will be created
```

The engineer had tested only in a scratch account that had no state. Reviewers noticed the destroy lines, the change was stopped, and moved blocks were added for each resource. The plan then read "38 moved" with no destroys. The team added a pipeline rule that fails when a plan destroys resources tagged `tier=production`, unless a reviewer adds an explicit approval label.

## Common mistakes

- Renaming resources without a moved block
- Removing the moved block before every environment has applied it
- Importing a resource and applying before the plan shows no changes
- Forgetting prevent_destroy on databases and networks

```quiz
Q: What does an import block do?
+ Adds an existing real resource to state at a given address
- Creates a new resource :: It tracks an existing one.
- Deletes the resource :: It does not delete anything.
- Copies it to another account :: It does not copy.
> Import updates state, not the resource.

Q: What does a moved block tell Terraform?
+ The resource at the old address is the same object as at the new address
- To delete the old resource :: It prevents deletion.
- To create a copy :: No copy is made.
- To skip the plan :: It does not skip planning.
> It avoids destroy and create.

Q: How do you stop managing a resource without destroying it?
+ Use a removed block with destroy = false
- Delete the resource block and apply :: That plans a destroy.
- Run terraform destroy :: That destroys it.
- Edit the cloud console :: State would still list it.
> Hand over without deleting.

Q: What is the best proof that a refactor is safe?
+ A plan with no destroys, only moved or import notes
- The code compiles :: Syntax is not enough.
- The pipeline is green :: Green does not mean no destroys.
- Reviewers approve quickly :: Evidence beats speed.
> Read the plan summary every time.
```

```cards
Adopt an existing resource :: import { to = ADDRESS, id = ID }
Rename without destroy :: moved { from = OLD, to = NEW }
Stop managing :: removed block with destroy = false
Protect critical resources :: lifecycle prevent_destroy
Success of a refactor :: 0 to destroy
```
