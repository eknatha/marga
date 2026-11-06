---
title: Stacks, change sets and safe updates
minutes: 13
summary: Preview updates with change sets, understand replacement versus in-place changes, and protect critical resources during stack updates.
---

CloudFormation updates are safe when you preview them and dangerous when you do not. Each property has an update behaviour, and some force a replacement that destroys data.

## What you will learn

- Update behaviours
- Creating and reading a change set
- Retention policies and stack policies
- Rollback and stuck stacks

## Update behaviours

Every property has one of three behaviours: **no interruption** (changed in place), **some interruption** (restart or brief outage), or **replacement** (a new resource is created, then the old one deleted). Replacement of a database or volume loses data unless protected.

## Change sets

```console
$ aws cloudformation create-change-set --stack-name app --change-set-name c1 \
    --template-body file://app.yaml --parameters ParameterKey=Env,ParameterValue=prod
$ aws cloudformation describe-change-set --stack-name app --change-set-name c1 \
    --query 'Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]'
[["Modify","Database","True"]]
$ aws cloudformation execute-change-set --stack-name app --change-set-name c1
```

Read each row: **Action** (Add, Modify, Remove) and **Replacement** (True, False, Conditional). Treat True or Remove on stateful resources as a stop sign.

## Protection

- `DeletionPolicy: Retain` or `Snapshot` keeps or snapshots a resource when the stack removes it.
- `UpdateReplacePolicy: Snapshot` snapshots the old resource when replaced.
- **Termination protection** blocks deleting the stack.
- A **stack policy** denies updates to chosen resources unless explicitly overridden.

## When updates fail

By default a failed update **rolls back** to the previous state. A failed rollback leaves `UPDATE_ROLLBACK_FAILED`; fix the cause (often a resource changed by hand) and continue the rollback, skipping resources only as a last resort.

```diagram
title: A safe update
node: edit | Edit the template | 0 | 0 | Change a property in Git. | Some properties force replacement.
node: cs | Create change set | 1 | 0 | Shows what would change without doing it. | Skipping it hides replacement. | observe
node: rev | Review | 2 | 0 | A person reads Action and Replacement. | Approving without reading defeats the purpose. | security
node: exe | Execute | 3 | 0 | CloudFormation applies the changes. | A failure triggers rollback.
node: prot | Retention policies | 3 | 1 | Snapshot or retain stateful resources. | Without them replacement loses data. | store
edge: edit | cs
edge: cs | rev
edge: rev | exe
edge: prot | exe
```

## Incident: The database that was recreated

> **Incident:** A small property change replaced a database with an empty one.

```console
$ aws cloudformation describe-change-set --change-set-name c1
Modify  Database  Replacement: True
stack status: UPDATE_COMPLETE
select count(*) from orders;  0
```

The update was run directly with no change set and no snapshot policy. The team restored from backup, added DeletionPolicy and UpdateReplacePolicy Snapshot, and made change-set review part of the pipeline.

## Common mistakes

- Updating production without a change set
- No retention policy on databases and volumes
- Editing resources by hand, causing failed rollbacks
- Skipping resources in a rollback without understanding why

```quiz
Q: What does Replacement True mean?
+ A new resource is made and the old one removed
- An in-place edit :: No.
- No change :: No.
- A rename :: No.
> Replacement can destroy data.

Q: What does UpdateReplacePolicy Snapshot do?
+ Snapshots the old resource when it is replaced
- Speeds updates :: No.
- Encrypts the stack :: No.
- Blocks updates :: No.
> It protects data on replacement.

Q: What does termination protection block?
+ Deleting the stack
- Updating the stack :: No.
- Reading outputs :: No.
- Creating change sets :: No.
> It stops accidental stack deletion.

Q: What is the first step before executing an update?
+ Read the change set
- Delete the stack :: No.
- Rename resources :: No.
- Disable logging :: No.
> Review what will change.
```

```cards
Change set :: A preview of the changes an update would make
Replacement :: Creating a new resource and removing the old one
DeletionPolicy :: Rule for what happens to a resource when removed
Stack policy :: A rule that protects resources from updates
Rollback :: Returning a stack to its last good state
```
