---
title: Drift, rollbacks and resource protection
minutes: 12
summary: Detect drift between a stack and reality, import existing resources, handle stuck rollbacks and protect data from accidental deletion.
---

Infrastructure as code is only true while nobody edits the resources by hand. Drift detection, import and protection rules keep the code and the cloud in agreement.

## What you will learn

- Detecting and reading drift
- Importing resources into a stack
- Stuck stack states and how to recover
- Guardrails against manual changes

## Detect drift

```console
$ aws cloudformation detect-stack-drift --stack-name net
$ aws cloudformation describe-stack-resource-drifts --stack-name net \
    --stack-resource-drift-status-filters MODIFIED DELETED
```

The report lists each resource as `IN_SYNC`, `MODIFIED` or `DELETED`, with the expected and actual property values. Not every resource type supports drift detection; check the list. Decide each case: change the template to accept the new value, or update the stack to restore the old one.

## Import

To bring an existing resource under management, add it to the template with a `DeletionPolicy` and run a **resource import** change set with the resource's identifier. Afterwards the stack manages it.

## Stuck states

| Status | Meaning | Action |
|---|---|---|
| `ROLLBACK_COMPLETE` | A create failed and rolled back | Delete the stack and deploy again |
| `UPDATE_ROLLBACK_FAILED` | Rollback itself failed | Fix the cause, then continue update rollback |
| `DELETE_FAILED` | A resource could not be deleted (non-empty bucket) | Empty or retain it, then delete |

## Guardrails

Restrict console write access with IAM, use stack policies for critical resources, enable CloudTrail to find who changed a resource and AWS Config rules to alert on forbidden changes. Create a pipeline as the only path to production.

```diagram
title: Keeping code and cloud in agreement
node: code | Template in Git | 0 | 0 | The intended state. | Out-of-date code misleads the next engineer.
node: dep | Pipeline deploys | 1 | 0 | Only path that changes production. | Console access bypasses it. | process
node: res | Resources | 2 | 0 | What actually exists. | Manual edits cause drift. | store
node: drift | Drift detection | 2 | 1 | Compares resources to the template on a schedule. | Unscheduled checks find drift too late. | observe
node: trail | CloudTrail | 3 | 1 | Records who changed what. | Without it, drift has no owner. | observe
edge: code | dep
edge: dep | res
edge: res | drift
edge: drift | trail
```

## Incident: The open security group

> **Incident:** A debugging change in the console left a rule open to the internet for months.

```console
$ aws cloudformation describe-stack-resource-drifts --stack-name net
SecurityGroup  MODIFIED
IpPermissions[0].CidrIp  expected 10.0.0.0/16  actual 0.0.0.0/0
```

Drift detection found it. The team re-applied the stack, scheduled weekly drift checks and removed console write access outside an emergency role.

## Common mistakes

- Fixing problems in the console and not in the template
- Never running drift detection
- Deleting a stack that still holds data without a retention policy
- Skipping resources in a failed rollback

```quiz
Q: What does MODIFIED mean in a drift report?
+ A property no longer matches the template
- The stack was deleted :: No.
- The template is new :: No.
- The account changed :: No.
> Real values differ. The lesson section above explains why.

Q: How do you bring an existing resource under CloudFormation?
+ Resource import
- Rename it :: No.
- Copy it :: No.
- Detach it :: No.
> Import adds it to a stack.

Q: What do you do with ROLLBACK_COMPLETE?
+ Delete the stack and deploy again
- Execute a change set :: No.
- Ignore it :: No.
- Add a condition :: No.
> A failed create cannot be updated.

Q: Which service records who made a console change?
+ CloudTrail
- CloudFront :: No.
- Route 53 :: No.
- Snowball :: No.
> Audit trail of API calls.
```

```cards
Drift :: A difference between the template and the real resource
Resource import :: Bringing an existing resource under stack control
Retain :: A policy that keeps a resource when its stack is deleted
CloudTrail :: AWS service that records API activity
Guardrail :: A control that stops risky changes
```
