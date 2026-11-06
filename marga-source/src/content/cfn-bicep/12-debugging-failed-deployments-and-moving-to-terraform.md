---
title: Debugging failed deployments and moving to Terraform
minutes: 13
summary: Read CloudFormation events and Azure deployment errors, fix common failures and plan a safe migration to or from Terraform.
---

Failed deployments feel mysterious because the final status is vague. The details sit one level down, in the events or operations of the individual resources. A fixed method gets you there fast.

## What you will learn

- Reading events and operations
- Common errors and fixes
- Cleaning up stuck or partial deployments
- Migrating between native tools and Terraform

## CloudFormation

```console
$ aws cloudformation describe-stack-events --stack-name app \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`].[LogicalResourceId,ResourceStatusReason]'
```

Find the **earliest** failed resource. Later `CREATE_FAILED` lines for dependants usually say "resource creation cancelled".

## Azure

```console
$ az deployment group show -g rg-app -n main --query properties.error
$ az deployment operation group list -g rg-app -n main \
    --query "[?properties.provisioningState=='Failed'].properties.statusMessage"
```

Open the operation for the failed resource; the top-level error often says only "deployment failed". Check the **Activity Log** for who attempted what.

## Common causes

| Message contains | Cause | Fix |
|---|---|---|
| AlreadyExists / AlreadyTaken | Name collision | Use generated or unique names |
| AccessDenied / AuthorizationFailed | Missing permission | Add the specific action to the role |
| LimitExceeded / QuotaExceeded | Account quota | Request an increase or change region |
| InvalidTemplate / ValidationError | Bad value or type | Run lint and what-if |
| DependsOn / ResourceNotFound | Order or wrong scope | Reference the resource to create a dependency |

## Migrating

To move to Terraform, write matching Terraform, then **import** each resource into Terraform state (`terraform import`, or `aztfexport` for Azure), confirm `terraform plan` shows no change, set `DeletionPolicy: Retain` in CloudFormation, then remove the stack. Moving the other way follows the same steps with `aws cloudformation` resource import. Migrate one layer at a time.

```diagram
title: Finding the real error
node: fail | Deployment failed | 0 | 0 | The final status gives no detail. | Reading only this line wastes time.
node: ev | Events or operations | 1 | 0 | Per-resource log of what happened. | Later failures are often consequences. | observe
node: first | First failed resource | 2 | 0 | The earliest failure holds the true reason. | A fix to later items does not help.
node: cause | Cause category | 3 | 0 | Name, permission, quota, value or order. | Misreading the category sends you the wrong way. | process
node: audit | CloudTrail or Activity Log | 2 | 1 | Shows who attempted the action and the denied permission. | Disabled logs leave no evidence. | observe
edge: fail | ev
edge: ev | first
edge: first | cause
edge: ev | audit
```

## Incident: The permission nobody looked at

> **Incident:** A pipeline deployment failed with a generic message for two days.

```console
$ az deployment group show -g rg-app -n main --query properties.error.message
At least one resource deployment operation failed.
$ az deployment operation group list -g rg-app -n main
vnet  Failed  AuthorizationFailed: no permission for Microsoft.Network/virtualNetworks/write
```

The summary hid a simple permission gap. Adding the one missing action to the pipeline role fixed it, and the team added a runbook step: open the failed operation first.

## Common mistakes

- Reading only the last error line
- Fixing later failures before the first
- Giving owner rights to fix a permission error
- Deleting a stack before importing its resources elsewhere

```quiz
Q: Which failed event do you read first?
+ The earliest
- The last :: No.
- A random one :: No.
- The summary only :: No.
> Later failures are often consequences.

Q: AuthorizationFailed usually means what?
+ The identity lacks a permission
- The region is full :: No.
- The name is taken :: No.
- The template is empty :: No.
> Check the role. The lesson section above explains why.

Q: What is the first step to move a stack to Terraform?
+ Write matching Terraform and import resources
- Delete the stack :: No.
- Rename resources :: No.
- Turn off logging :: No.
> Import keeps resources in place.

Q: Where do you see who made a change?
+ CloudTrail or the Activity Log
- Billing page :: No.
- DNS :: No.
- Template comments :: No.
> Audit logs record callers.
```

```cards
Stack event :: A record of a resource's status change
Deployment operation :: A per-resource record of an Azure deployment step
Quota :: A limit on how much of a service an account may use
Import :: Bringing an existing resource under a tool's control
aztfexport :: Tool that exports Azure resources to Terraform
```
