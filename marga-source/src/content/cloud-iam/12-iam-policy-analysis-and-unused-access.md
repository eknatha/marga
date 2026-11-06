---
title: IAM policy analysis and unused access
minutes: 12
summary: Find overly broad and unused permissions with access analyzers, last-used data and policy simulation, and remove them safely.
---

Writing least-privilege policy by guessing leads to either broken apps or broad wildcards. Cloud providers record what is used, so you can shrink access with evidence instead of fear.

## What you will learn

- Finding unused and externally shared access
- Last-accessed information and generated policies
- Simulating and staging changes
- A regular review process

## What the tools show

- **External access findings:** resources such as buckets or roles reachable from outside your organization.
- **Unused access findings:** roles, users and permissions with no use in a chosen period, such as 90 days.
- **Last accessed data:** when a service or action was last used by a principal.

```bash
aws accessanalyzer list-findings-v2 --analyzer-arn "$ANALYZER" \
  --filter '{"findingType": {"eq": ["UnusedPermission"]}}' | jq '.findings[].resource'
aws iam generate-service-last-accessed-details --arn "$ROLE_ARN"
```

## Generate a tighter policy

Providers can analyze CloudTrail or audit logs for a role over a period and propose a policy limited to the actions seen. Review it for rare but needed actions, such as monthly jobs or failover, before applying.

## Roll out in stages

1. Create the new, smaller policy beside the old one.
2. Use the **simulator** to check key actions.
3. Attach the new policy, remove the old one for a test role first and watch for denied calls.
4. Remove unneeded permissions in small steps with a rollback ready.

```bash
aws iam simulate-principal-policy --policy-source-arn "$ROLE_ARN" \
  --action-names s3:GetObject s3:PutObject --resource-arns "arn:aws:s3:::shop-data/*"
```

## Review regularly

Run unused access reports monthly, assign each finding to an owner and track closure. Review external access findings immediately and document any intentional public resource.

## Incident: Eleven permissions in use

> **Incident:** A role had hundreds of permissions and used almost none.

```console
role: ci-deploy
services allowed: 38
services used in 90 days: 4 (11 actions)
```

The role came from a template that granted broad access to get started. Nobody went back. Generating a policy from the audit logs and testing it in staging cut the role to what the pipeline needed, and the team scheduled a quarterly review.

## Common mistakes

- Never reviewing roles after launch
- Removing permissions without checking rare jobs
- Ignoring external access findings
- Applying generated policies without review

```quiz
Q: What does last-accessed data show?
+ When permissions were last used
- Network speed :: No.
- Disk size :: No.
- DNS records :: No.
> It supports trimming.

Q: What is an external access finding?
+ A resource reachable from outside the organization
- A new user :: No.
- A slow query :: No.
- A bad image :: No.
> It shows exposure. The lesson section above explains why.

Q: Why stage permission removal?
+ To catch denials before wide impact
- To waste time :: No.
- To add permissions :: No.
- To hide logs :: No.
> Reduce risk. The lesson section above explains why.

Q: What should you check in generated policies?
+ Rare but needed actions
- Colours :: No.
- Branch names :: No.
- Log size :: No.
> Logs may miss infrequent tasks.
```

```cards
Access analyzer :: Tool that finds external and unused access
Last accessed :: Data on when a permission was used
Policy simulator :: Tests whether an action would be allowed
Least privilege :: Only the access needed
```
