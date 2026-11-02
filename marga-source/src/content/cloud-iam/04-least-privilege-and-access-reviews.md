---
title: Least privilege and access reviews
minutes: 12
summary: Shrink permissions to what is needed, with tools to find unused access, and keep it small with regular reviews.
---

Least privilege means every identity has only the access its job needs, for only as long as needed. Nobody gets it perfect on day one, and permissions grow over time. The practical method is to start narrow, measure what is really used, remove the rest, and review on a schedule so access does not quietly accumulate.

## What you will learn

- Describe least privilege in practice
- Use access analysis tools to find unused permissions
- Design roles around jobs, not people
- Run a simple access review

## Start narrow, then measure

Begin with the permissions you know are needed. When a request is denied, read the exact action and resource in the error and add only that. In the other direction, look at what existing identities actually use. AWS offers access analysis showing last-accessed services and can generate a policy from recorded activity; Azure and others show similar usage data. Remove what has not been used for a period such as 90 days, after checking with the owner.

## Roles for jobs

Create roles for functions (read-only auditor, deployer for one application, database operator) and assign people to them through groups. This avoids a unique set of permissions per person that nobody can review. Separate duties: the person who approves a change should not be the only one who can make and deploy it.

## Temporary and conditional access

Prefer time-limited access for rare tasks, with approval and automatic expiry. Add conditions: require MFA, restrict to expected networks or regions, require a ticket reference in the session name. Break-glass accounts for emergencies should exist, be stored safely, be monitored, and trigger an alert when used.

## Access reviews

Every quarter, list who has privileged access and ask the owner to confirm. Check service accounts, third-party integrations and old contractors. Record the date, the reviewer and the changes made. A review that finds nothing to remove for a year probably is not looking at real data.

```predict
Q: A role has 400 permitted actions, but the logs show it used 12 in 90 days. What do you do?
???
Replace the policy with one that grants those 12 actions after confirming with the owner, and watch for denials.
> Remove unused access.
```

## Incident: Nobody remembers why

> **Incident:** A security review found 31 service accounts with administrator rights and no owner.

```console
$ aws iam generate-service-last-accessed-details --arn arn:aws:iam::123456789012:role/legacy-batch
$ aws iam get-service-last-accessed-details --job-id 1234
ServiceNamespace: s3  LastAuthenticated: 2023-11-02
ServiceNamespace: ec2  LastAuthenticated: -
```

The report showed the role touched only one service, long ago. The team assigned owners, disabled unused accounts, replaced administrator rights with specific policies, and scheduled a quarterly review with a record of each decision.

## Common mistakes

- Granting broad rights because tuning takes time
- No owner for service accounts
- Reviews without usage data
- No emergency access plan

```quiz
Q: What is least privilege?
+ Only the access needed, for only as long as needed
- Access for everyone :: Opposite.
- Access for managers only :: Not the idea.
- No access at all :: Unusable.
> Minimum necessary. Re-read the matching lesson section for the full reasoning.

Q: What helps you find unused permissions?
+ Last-accessed and usage analysis
- Guessing :: Unreliable.
- Colour themes :: No.
- Longer passwords :: No.
> Measure. Re-read the matching lesson section for the full reasoning.

Q: Why design roles for jobs?
+ They are reviewable and reusable
- They are slower :: False.
- They hide access :: False.
- They remove logs :: False.
> Not per-person snowflakes. Re-read the matching lesson section for the full reasoning.

Q: What should break-glass accounts do when used?
+ Raise an alert
- Stay silent :: Dangerous.
- Delete logs :: Bad.
- Disable MFA :: Bad.
> Monitor emergencies. Re-read the matching lesson section for the full reasoning.
```

```cards
Least privilege :: minimum access, minimum time
Usage data :: last-accessed information
Role for a job :: reusable, reviewable
Separation of duties :: no single point of abuse
Break-glass :: emergency access that alerts
Review :: scheduled check with a record
```
