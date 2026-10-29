---
title: AWS IAM: policies, roles and assume-role
minutes: 13
summary: Read and write AWS IAM policies, use roles instead of users for workloads, and understand how sessions and boundaries combine.
---

AWS Identity and Access Management is the permission system for the whole account. You will meet users, groups, roles and policies. The most important idea is the role: an identity with no permanent password or key that a trusted principal can assume for a short session. If you remember one rule, make it this one: people and workloads should assume roles, not hold long-lived keys.

## What you will learn

- Read a JSON policy
- Know the difference between identity-based and resource-based policies
- Use roles and assume-role for workloads and cross-account access
- Understand how boundaries and service control policies limit permissions

## Reading a policy

A policy lists statements. Each has an effect (Allow or Deny), actions, resources and optional conditions.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::reports-prod/summaries/*"
  }]
}
```

This allows reading objects under one prefix of one bucket and nothing else. A wildcard such as `"Action": "*"` with `"Resource": "*"` is administrator access.

## Two kinds of policy

An **identity-based policy** is attached to a user, group or role and says what that identity may do. A **resource-based policy** is attached to a resource, such as a bucket or a queue, and says who may use it, including principals from other accounts. A request is allowed when the right policies allow it and nothing denies it.

## Roles and assume-role

A role has two parts: a **trust policy** saying who may assume it, and **permission policies** saying what it can do. A caller asks the Security Token Service to assume the role and receives temporary credentials, usually valid for an hour or less. Compute services attach roles directly: an instance profile for a virtual machine, an execution role for a function, a task role for a container. Cross-account access works the same way: the target account trusts a role in the source account.

## Limits above policies

A **permissions boundary** caps what an identity can ever be granted. A **service control policy** in AWS Organizations caps what whole accounts can do, even for their administrators. They never grant by themselves; they only restrict. Use them for guardrails such as "no one may disable audit logging" or "only approved regions".

```predict
Q: A role has an allow for s3:* but an organization policy denies deleting objects. Can the role delete?
???
No, because the organization policy limits the account and an explicit restriction wins.
> Guardrails restrict what policies can allow.
```

## Incident: The wildcard that opened the bucket

> **Incident:** A developer fixed an access error by granting s3:* on all buckets to a build role.

```console
$ aws iam get-role-policy --role-name build --policy-name tmp
"Action": "s3:*", "Resource": "*"
$ aws iam simulate-principal-policy --policy-source-arn arn:aws:iam::123456789012:role/build --action-names s3:DeleteObject --resource-arns arn:aws:s3:::customer-exports/a.csv
EvalDecision: allowed
```

The simulator showed the build role could delete customer exports. The team replaced the wildcard with the one bucket and prefix the build needs, added a boundary that denies deletes on data buckets, and put policy checks into code review.

## Common mistakes

- Granting "*" to make an error disappear
- Using IAM users with keys for workloads
- Trust policies that allow any principal
- Forgetting resource-based policies when debugging

```quiz
Q: What is a role?
+ An identity assumed for a short session without a permanent key
- A password manager :: No.
- A file :: No.
- A server size :: No.
> Temporary credentials. Re-read the matching lesson section for the full reasoning.

Q: What does a trust policy define?
+ Who may assume the role
- What the role may do :: That is the permission policy.
- The role colour :: No.
- The region only :: No.
> Trust versus permissions. Re-read the matching lesson section for the full reasoning.

Q: What do service control policies do?
+ Cap what accounts can be granted
- Grant access :: They only restrict.
- Encrypt data :: No.
- Rotate keys :: No.
> Guardrails. Re-read the matching lesson section for the full reasoning.

Q: Which action is administrator access in a policy?
+ Action * on Resource *
- s3:GetObject on one key :: Narrow.
- ec2:DescribeInstances :: Read only.
- logs:PutLogEvents :: Narrow.
> Avoid wildcards. Re-read the matching lesson section for the full reasoning.
```

```cards
Policy :: statements with effect, action, resource, condition
Role :: assumable identity with temporary credentials
Trust policy :: who may assume
Boundary :: cap on an identity
SCP :: cap on an account
Simulator :: test a decision before you ship
```
