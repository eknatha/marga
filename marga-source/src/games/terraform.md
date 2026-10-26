## The plan that wants to delete the database
module: terraform
level: Advanced
minutes: 6
lesson: terraform/state
summary: A small refactor shows a destroy on the production database. Decide what to do before anything is applied.
intro: You renamed some resources to follow new naming rules. The pipeline posts the Terraform plan on your pull request and it ends with: Plan: 4 to add, 0 to change, 4 to destroy. One of the resources is the production database.

### s1
text: The plan is waiting for approval. A colleague says that it is only renames and you should merge. What do you do?
- Approve it, since the renames are harmless => end-fail | 0 | Terraform sees a new address as a new resource. Applying would destroy the database and create an empty one.
- Read the plan to see why it destroys the database => s2 | 2 | The plan shows exactly which attributes or addresses force the replacement.
- Cancel the pipeline and delete the branch => s3 | 1 | Safe, but you lose the chance to learn and the refactor is still needed.

### s2
text: The plan shows aws_db_instance.main will be destroyed and aws_db_instance.database will be created. The resource block was renamed in code. Why does Terraform plan a destroy?
- The state still holds the old address, so the new name looks like a new resource => s4 | 2 | Terraform matches code to state by address.
- The database is broken => s3 | 0 | The plan is about addresses, not health.
- The provider is out of date => s3 | 0 | Versions are not the cause here.

### s3
text: You stopped the apply, which is good. You still want the new names. How do you proceed?
- Study the plan and find how to tell Terraform that the old and new names are the same object => s2 | 2 | That is the correct goal.
- Run apply anyway after taking a snapshot => end-fail | 0 | A snapshot helps recovery, but you would still have a long outage and lost writes.

### s4
text: You can fix this in two ways. Which do you choose?
- Add a moved block from the old address to the new one and run the plan again => s5 | 2 | It is reviewable, in code, and works for everyone who applies.
- Run terraform state mv on your laptop and merge => s5 | 1 | It works but changes the state outside the pipeline, and other environments will still plan a destroy.
- Remove the database from state so Terraform forgets it => end-fail | 0 | Terraform would then try to create a second database, or lose track of the first.

### s5
text: With the moved block, the plan reads: 0 to add, 0 to change, 0 to destroy for the database. How do you protect against this in future?
- Add prevent_destroy to the database and a pipeline rule that fails when a plan destroys tagged production data stores => s6 | 2 | Two layers: one in the resource, one in the review process.
- Tell people to read plans carefully => s6 | 0 | People are tired and busy, and automatic guards do not depend on that.

### s6
text: You merge. Which final check do you do after the pipeline applies?
- Run a plan again to confirm there are no pending changes and check the database is the same instance => end-win | 2 | A clean plan after apply proves state and code agree.
- Assume it worked => end-ok | 1 | Probably, but a clean plan costs seconds.

### end-win
end: win
text: The database was never touched. The refactor is merged with a moved block, destroy protection is in place, and the pipeline blocks dangerous plans.
takeaway: Read the plan. Renaming a resource changes its address, and a moved block keeps the object. Protect stateful resources with prevent_destroy and plan checks.

### end-ok
end: ok
text: The change worked and the database is safe, but no check proved the final state.
takeaway: Always run a clean plan after apply.

### end-fail
end: fail
text: The apply destroyed or lost track of the production database. The team restored from backup and lost recent data.
takeaway: Never apply a plan you have not understood, especially one with a destroy of stateful data.
