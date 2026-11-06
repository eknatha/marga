---
title: CloudFormation and Bicep
summary: Commands to validate, preview, deploy and debug CloudFormation stacks and Bicep deployments, and the checks to run first.
module: cfn-bicep
---

## CloudFormation

```bash
aws cloudformation validate-template --template-body file://app.yaml
cfn-lint app.yaml
aws cloudformation deploy --template-file app.yaml --stack-name app-dev --parameter-overrides Env=dev
aws cloudformation describe-stack-events --stack-name app-dev --max-items 20
aws cloudformation describe-stacks --stack-name app-dev --query 'Stacks[0].StackStatus'
```

## Preview an update

```bash
aws cloudformation create-change-set --stack-name app --change-set-name c1 --template-body file://app.yaml
aws cloudformation describe-change-set --stack-name app --change-set-name c1 \
  --query 'Changes[].ResourceChange.[Action,LogicalResourceId,Replacement]'
aws cloudformation execute-change-set --stack-name app --change-set-name c1
```

## Drift

```bash
aws cloudformation detect-stack-drift --stack-name app
aws cloudformation describe-stack-resource-drifts --stack-name app --stack-resource-drift-status-filters MODIFIED DELETED
```

## Bicep

```bash
az bicep build --file main.bicep
az deployment group what-if --resource-group rg-app --template-file main.bicep --parameters env=dev
az deployment group create --resource-group rg-app --template-file main.bicep --parameters env=dev
az deployment operation group list --resource-group rg-app --name main
```

## Stack states

| Status | What to do |
|--------|------------|
| ROLLBACK_COMPLETE | Read the first failed event, delete the stack, deploy again |
| UPDATE_ROLLBACK_FAILED | Fix the cause, then continue the rollback |
| DELETE_FAILED | Empty or retain the blocking resource, then delete |

## Safe habits

1. Run lint, policy checks and a preview on every pull request.
2. Read Replacement and Delete lines before approving.
3. Protect stateful resources with snapshot or retain policies.
4. Deploy from a pipeline with a federated identity, not a stored key.
5. Check drift on a schedule and fix it through code.

## Safe deploys

```bash
aws cloudformation create-change-set --stack-name app --change-set-name c1 --template-body file://t.yaml
```

```bash
aws cloudformation describe-stack-events --stack-name app --max-items 10
```

```bash
az deployment group what-if -g rg-app -f main.bicep
```

```bash
cfn-lint t.yaml
```

> **Danger:** A property change can replace a resource, and replacing a database deletes its data. Read the change set `Replacement` column before you execute it.

> **Warning:** Set `DeletionPolicy: Retain` or `Snapshot` on stateful resources before you delete or rename them.

> **Warning:** Bicep complete mode deletes resources in the group that are not in the file. Run `what-if` first.

> **Warning:** Editing resources by hand causes drift. The next update can undo your change or fail.
