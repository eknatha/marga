## Access denied on upload
level: junior
A build job fails to upload a report.

```text
An error occurred (AccessDenied): User: arn:aws:sts::123456789012:assumed-role/build/ci is not authorized to perform: s3:PutObject on resource: arn:aws:s3:::reports-prod/a.csv
```
? What is the narrowest fix?
+ Allow s3:PutObject on that bucket prefix for the build role
- Attach AdministratorAccess
- Make the bucket public
- Disable the policy checks
why: The error names the principal, action and resource. Grant exactly that and nothing more.

## Key in a public repository
level: junior
A scanner reports a cloud key in a public repository.

```text
AKIAEXAMPLE0000000000 found in deploy/.env commit 3f9a1c2
```
? What do you do first?
+ Deactivate the key, then review audit logs for its use
- Delete the commit and relax
- Wait to see if it is used
- Rename the file
why: A published key is compromised even after removal because copies persist. Contain, assess, then replace it with a role.

## Contributor on the subscription
level: mid
A contractor can change every resource.

```text
az role assignment list --assignee contractor@example.com --all
Contributor  /subscriptions/0000-1111
```
? What is wrong?
+ The role is assigned at too broad a scope
- Contributor is a read role
- Subscriptions have no roles
- The email is wrong
why: Assign at the lowest scope that works, and use a narrower or time-limited role.

## Public bucket
level: mid
Customer exports can be downloaded by anyone with a link.

```text
IsPublic: true
NoSuchPublicAccessBlockConfiguration
```
? What control was missing?
+ Block public access at the account level, with signed links for sharing
- A longer bucket name
- More logging only
- A bigger bucket
why: A guardrail prevents the mistake for every bucket, not only the one you remembered.

## Password in the image
level: mid
An image history reveals a secret.

```text
ENV DB_PASSWORD=Sup3rS3cret!
HIGH: secret in layer 4
```
? What is the fix?
+ Rotate it, rebuild without it and fetch it from a secrets manager at run time
- Delete the layer comment
- Hide it in a label
- Base64-encode it
why: Anything in an image layer can be read by anyone who can pull the image.

## Logging stopped
level: mid
The audit trail has a gap.

```text
IsLogging: false
LatestDeliveryTime: 2024-05-05T01:02:13Z
```
? What should be added?
+ An organisation policy blocking it and an alert on the stop event
- Nothing, it was a one-off
- Delete the trail
- Turn off alerts
why: Stopping logs is a classic way to hide activity, so protect and alert on it.

## Crypto servers
level: senior
The bill spiked with servers in unused regions.

```text
RunInstances ap-south-1 203.0.113.77
CreateAccessKey 203.0.113.77
```
? What guardrail would have limited this?
+ A policy denying unused regions plus roles instead of keys
- A cheaper instance type
- More budget
- Faster alarms only
why: Deny what you do not use, and remove long-lived keys that can be stolen.

## Conditional denial
level: senior
A role with s3:* is still denied.

```text
explicit deny in a service control policy: s3:DeleteObject
```
? Why?
+ An organisation-level policy limits what the account can do, and explicit denies win
- The role is too old
- S3 ignores roles
- The bucket is large
why: Guardrails restrict regardless of identity policies.
