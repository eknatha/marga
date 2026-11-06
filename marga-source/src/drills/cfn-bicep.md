## Stack stuck in ROLLBACK_COMPLETE
level: junior
A first deploy failed and the stack cannot be updated.

```text
$ aws cloudformation describe-stacks --stack-name logs
StackStatus: ROLLBACK_COMPLETE
```
? What do you do?
+ Read the first failed event for the cause, delete the stack and deploy again
- Run update-stack repeatedly
- Edit the stack by hand in the console
- Ignore it
why: A stack that failed to create cannot be updated. Fix the cause shown in the events, delete it and redeploy.

## Bucket name already taken
level: junior
A template works in one account and fails in another.

```text
Logs  CREATE_FAILED  acme-logs already exists
```
? What is the best fix?
+ Remove the fixed name so CloudFormation generates one, and output the generated name
- Add random letters by hand every time
- Use a different region
- Disable rollback
why: Bucket names are global. Generated or parameterised names make the template reusable.

## Replacement in a change set
level: mid
A change set shows a database change.

```text
Modify  Database  Replacement: True
```
? What should you do before executing?
+ Add snapshot policies and get approval, because replacement recreates the database
- Execute it, replacement is harmless
- Delete the change set and use update-stack directly
- Turn off rollback
why: Replacement creates a new resource and removes the old one, which loses data without protection.

## Console edit found by drift
level: mid
Drift detection reports a changed rule.

```text
SecurityGroup MODIFIED
CidrIp expected 10.0.0.0/16 actual 0.0.0.0/0
```
? What is the right response?
+ Decide whether the change is needed, then fix the template or re-apply it, and limit console writes
- Ignore it because the app works
- Delete the stack
- Open all ports for testing
why: Drift means code and reality disagree. Resolve it through code, and reduce the chance of manual edits.

## Complete mode surprise
level: senior
A Bicep deployment deleted extra resources.

```text
az deployment group create --mode Complete --template-file partial.bicep
Deleted: virtualMachines/vm-db
```
? What prevents this?
+ Run what-if before every deployment and use incremental mode unless a full definition is intended
- Run complete mode more often
- Remove resource locks
- Use older API versions
why: Complete mode removes resources not in the file. What-if shows the deletes before they happen.

## Secrets in pipeline settings
level: senior
A cloud key leaked from a CI variable.

```text
build.log: AZURE_CLIENT_SECRET=Q8x...
```
? What is the better design?
+ Use federated OIDC identity with a narrow role instead of a stored secret
- Make the secret longer
- Store it in the repository
- Share it in chat
why: Federation issues short-lived credentials per job, so there is nothing long-lived to leak.
