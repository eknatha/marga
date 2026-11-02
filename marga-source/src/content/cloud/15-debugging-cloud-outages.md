---
title: Debugging cloud problems: permissions, networking and quotas
minutes: 15
summary: Trace cloud failures through identity, network path, quotas and service health using audit logs, policy simulation and flow logs instead of guessing.
---

Cloud problems often look like application bugs. A request times out, an upload fails, or a deploy is denied. The causes are usually one of four things: an identity policy, a network rule, a quota or limit, or a service problem on the provider side. Each leaves a record if you know where to look.

## What you will learn

- Reading "access denied" correctly
- Network path checks: security groups, route tables, network ACLs, flow logs
- Quotas and limits
- Provider status and who changed what

## Identity: who was denied, and why

An AccessDenied error names the principal (the role or user), the action and the resource. Check them in order:

1. Is the caller the identity you think it is?
2. Does an identity policy allow the action on that resource?
3. Does a resource policy, permissions boundary, organisation policy or explicit deny override it?

```bash
aws sts get-caller-identity                                     # which identity am I?
aws iam simulate-principal-policy --policy-source-arn ROLE_ARN \
  --action-names s3:GetObject --resource-arns arn:aws:s3:::shop-data/*
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=GetObject --max-results 5
```

Audit logs show the exact denied call with the error code and the calling role.

## Network: follow the packet

| Check | What to look for |
|-------|------------------|
| Security group | Inbound and outbound rules on both ends; the source and port |
| Route table | A route to the destination (gateway, NAT, peering, endpoint) |
| Network ACL | Stateless rules: both directions must allow |
| DNS | Private zone attached to the right network |
| Flow logs | `REJECT` records show who was blocked |

A private instance with no route to a NAT gateway cannot reach package repositories, and the error is a plain timeout.

## Quotas and capacity

"Limit exceeded", "InsufficientInstanceCapacity" and throttling errors are not bugs in your code. Check service quotas, request an increase early, and add retries with backoff and jitter. Capacity errors for one instance type in one zone can be avoided by allowing several types and zones.

## Who changed what

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=sg-0abc --max-results 3
EventName: RevokeSecurityGroupIngress   Username: deploy-role   EventTime: 09:12
```

A change record near the start of an outage is the strongest lead. Also check the provider's status page and your account's health notices, but confirm with your own metrics.

```predict
Q: An instance in a private subnet cannot download updates; connections time out. Name two things to check.
???
The route table for a route to a NAT gateway, and the security group and network ACL outbound rules.
> A timeout means packets are dropped or have no path. Refusals and name errors point elsewhere.
```

```diagram
title: Where a cloud request can be stopped
node: id | Identity | 0 | 1 | Credentials, role and policies decide whether the call is allowed. | Wrong role, explicit deny or boundary gives AccessDenied.
node: net | Network path | 1 | 0 | Security groups, routes, ACLs and endpoints decide whether packets arrive. | A missing route or rule shows as a timeout.
node: quota | Quota and capacity | 1 | 2 | Service limits and regional capacity cap what you can create. | Limit errors look like random API failures.
node: svc | Service health | 2 | 1 | The provider service itself may be degraded. | Blaming your code while the provider has an incident.
node: audit | Audit and flow logs | 3 | 1 | CloudTrail-style logs and flow logs show what happened and who did it. | Logging that was never enabled leaves no evidence.
edge: id | audit
edge: net | audit
edge: quota | audit
edge: svc | audit
```

## Incident: the deployment that lost S3 access

> **Incident:** At 14:05 the nightly job begins failing with AccessDenied on a storage bucket it has used for a year.

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=PutBucketPolicy --max-results 1
Username: platform-admin   EventTime: 14:02
$ aws s3api get-bucket-policy --bucket shop-data | jq -r .Policy | grep -i -B2 -A4 Deny
"Effect":"Deny","Principal":"*","Condition":{"StringNotEquals":{"aws:SourceVpce":"vpce-0abc"}}
```

Three minutes earlier a new bucket policy denied access except through one VPC endpoint. The job ran from another network, so it was blocked. The team added the second endpoint to the policy, and made bucket policy changes go through review with a simulation step.

## Common mistakes

- Granting broad permissions "to test"
- Ignoring explicit denies
- No audit logging or flow logs when the incident happens
- Retrying without backoff, which worsens throttling

```quiz
Q: What is the first thing to confirm for an AccessDenied error?
- The size of the file :: It is not the cause of a permission denial.
+ Which identity made the call, with get-caller-identity or the audit log
- The time zone :: It does not decide authorisation.
- The disk type :: Unrelated.
> Many denials come from running as a different role than expected.

Q: A connection from a private subnet times out. What is likely?
+ A missing route (for example NAT) or a blocking rule
- The password is wrong :: That gives an authentication error, not a timeout.
- The bucket is empty :: Content does not cause timeouts.
- A syntax error :: It would fail before the network.
> Silent drops and missing paths show as timeouts.

Q: Where do you find who changed a security group and when?
- The instance console :: It shows the OS, not API changes.
+ The audit log (CloudTrail or equivalent)
- The billing page :: It shows costs, not who changed rules.
- The DNS zone :: It stores records.
> Audit logs record API calls with the caller and time.

Q: How should clients handle throttling errors?
- Retry immediately in a tight loop :: This increases load and prolongs throttling.
+ Retry with exponential backoff and jitter
- Ignore them :: Requests would be lost.
- Disable limits :: Limits are set by the provider.
> Backoff with jitter spreads retries so the service can recover.
```

```cards
What three things does AccessDenied name? :: Principal, action and resource
Where is the record of who changed a rule? :: Audit log such as CloudTrail
Timeout versus AccessDenied? :: Timeout: network path. AccessDenied: identity or policy
What helps with throttling? :: Backoff with jitter
Which logs show blocked packets? :: VPC flow logs (REJECT records)
```
