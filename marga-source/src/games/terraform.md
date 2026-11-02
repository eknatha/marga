## The plan that wants to delete the database
module: terraform
level: Advanced
minutes: 6
lesson: terraform/state
summary: A small refactor shows a destroy on the production database. Decide what to do before anything is applied.
intro: You renamed some resources to follow new naming rules. The pipeline posts the Terraform plan on your pull request and it ends with: Plan: 4 to add, 0 to change, 4 to destroy. One of the resources is the production database.

### s1
text: The plan is waiting for approval. A colleague says that it is only renames and you should merge. What do you do?
- Approve it, since the renames are harmless => end-fail | 0 | Terraform sees a new address as a new resource. Applying would destroy the database and create an empty one. Example: After approving, the plan applies 'Plan: 1 to add, 1 to destroy', and the production database with 40 GB of orders is deleted and replaced by an empty one.
- Read the plan to see why it destroys the database => s2 | 2 | The plan shows exactly which attributes or addresses force the replacement. Example: The plan line '# aws_db_instance.main must be destroyed' next to '# aws_db_instance.primary will be created' shows the address changed, not the settings.
- Cancel the pipeline and delete the branch => s3 | 1 | Safe, but you lose the chance to learn and the refactor is still needed. Example: Deleting the branch is safe, but the module still needs reorganising next sprint, and the team learns nothing about moved blocks.

### s2
text: The plan shows aws_db_instance.main will be destroyed and aws_db_instance.database will be created. The resource block was renamed in code. Why does Terraform plan a destroy?
- The state still holds the old address, so the new name looks like a new resource => s4 | 2 | Terraform matches code to state by address. Example: State holds aws_db_instance.main, and the code now calls it aws_db_instance.primary, so Terraform sees one to delete and one to create.
- The database is broken => s3 | 0 | The plan is about addresses, not health. Example: The database passes health checks and replicates normally. The plan only says it is about to be destroyed because of its name in code.
- The provider is out of date => s3 | 0 | Versions are not the cause here. Example: Changing the AWS provider from 5.30 to 5.40 does not rename resource addresses, so the destroy would be there with either version.

### s3
text: You stopped the apply, which is good. You still want the new names. How do you proceed?
- Study the plan and find how to tell Terraform that the old and new names are the same object => s2 | 2 | That is the correct goal. Example: The goal is 'same object, new name'. Terraform has moved blocks and 'terraform state mv' for exactly this, so you search for those.
- Run apply anyway after taking a snapshot => end-fail | 0 | A snapshot helps recovery, but you would still have a long outage and lost writes. Example: A snapshot takes 20 minutes to restore, and every order written between the snapshot and the apply is lost, with the site down meanwhile.

### s4
text: You can fix this in two ways. Which do you choose?
- Add a moved block from the old address to the new one and run the plan again => s5 | 2 | It is reviewable, in code, and works for everyone who applies. Example: moved { from = aws_db_instance.main  to = aws_db_instance.primary } makes the plan say 'has moved' with no destroy, and anyone who applies gets the same result.
- Run terraform state mv on your laptop and merge => s5 | 1 | It works but changes the state outside the pipeline, and other environments will still plan a destroy. Example: terraform state mv aws_db_instance.main aws_db_instance.primary on your laptop fixes your state, but staging and prod still plan a destroy until each does the same.
- Remove the database from state so Terraform forgets it => end-fail | 0 | Terraform would then try to create a second database, or lose track of the first. Example: terraform state rm aws_db_instance.main makes Terraform forget the database. The next plan creates a second one with the same name, which may fail or run in parallel.

### s5
text: With the moved block, the plan reads: 0 to add, 0 to change, 0 to destroy for the database. How do you protect against this in future?
- Add prevent_destroy to the database and a pipeline rule that fails when a plan destroys tagged production data stores => s6 | 2 | Two layers: one in the resource, one in the review process. Example: lifecycle { prevent_destroy = true } blocks the destroy at plan time, and a pipeline step that greps the plan JSON for delete on aws_db_instance fails the build.
- Tell people to read plans carefully => s6 | 0 | People are tired and busy, and automatic guards do not depend on that. Example: 'Please read the plan' was in the contributing guide, and a plan with 300 lines still got approved on a Friday evening.

### s6
text: You merge. Which final check do you do after the pipeline applies?
- Run a plan again to confirm there are no pending changes and check the database is the same instance => end-win | 2 | A clean plan after apply proves state and code agree. Example: After apply, terraform plan prints 'No changes. Your infrastructure matches the configuration' and the DB instance ID in the console is the same as before.
- Assume it worked => end-ok | 1 | Probably, but a clean plan costs seconds. Example: Skipping the follow-up plan means a half-applied change, such as a missing tag or security group, stays unnoticed until the next person plans.

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
