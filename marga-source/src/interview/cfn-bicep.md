## Why use CloudFormation or Bicep instead of clicking in the console?
level: junior
Code is repeatable, reviewable and versioned, so environments match and changes have an audit trail. The deployment service tracks what exists and can preview and roll back changes.

## What is a CloudFormation change set?
level: junior
A preview of what an update would do to a stack, listing resources added, modified or removed and whether each requires replacement. You review it and then execute it, which prevents surprises like a database being recreated.

## What does Bicep compile to and why does that matter?
level: mid
Bicep compiles to an ARM template that Azure Resource Manager deploys. It is a cleaner language, but the deployment behaviour, scopes, modes and errors are those of ARM, so you debug using ARM deployment operations.

## What is drift and how do you handle it?
level: mid
Drift is when real resources differ from the template, usually after manual edits. Detect it on a schedule, decide whether to accept the change in code or restore the template state, and reduce it by limiting console write access.

## What is the difference between incremental and complete deployment mode in Azure?
level: senior
Incremental adds and updates the resources in the template and leaves others alone. Complete also deletes resources in the target that are not in the template. Use what-if before any deployment and be careful with complete mode, locks and partial templates.

## How would you migrate from CloudFormation to Terraform?
level: senior
Write matching Terraform, import each existing resource into state, and confirm that terraform plan shows no changes. Set DeletionPolicy Retain in CloudFormation, then remove the stack so resources stay. Migrate one layer at a time and keep a rollback plan.
