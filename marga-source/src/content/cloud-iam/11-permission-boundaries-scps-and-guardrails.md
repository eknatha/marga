---
title: Permission boundaries, SCPs and guardrails
minutes: 13
summary: Set outer limits on what accounts and roles can ever do with SCPs, permission boundaries and organization policies, and understand how they combine with grants.
---

Giving teams freedom to create roles is fast, but it means an administrator in one account could grant anything. Guardrails set limits above that level so freedom stays inside safe borders.

## What you will learn

- SCPs, permission boundaries and organization policies compared
- Effective permissions as an intersection
- Writing safe deny guardrails
- Testing before rollout

## Three kinds of limit

- **Service control policy (SCP):** applies to all principals in the accounts it is attached to and never grants access, only limits it.
- **Permission boundary:** attached to a role or user to cap the permissions that identity can ever have, even if its policies say more.
- **Organization policy (Google Cloud) or Azure Policy:** enforce settings such as allowed regions or disabled keys.

The effective permission is what is **allowed by the identity policy and not blocked by** any boundary or SCP. An explicit deny always wins.

## An example guardrail

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "ProtectAuditTrail",
    "Effect": "Deny",
    "Action": [
      "cloudtrail:StopLogging",
      "cloudtrail:DeleteTrail",
      "config:StopConfigurationRecorder"
    ],
    "Resource": "*"
  }, {
    "Sid": "OnlyApprovedRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "support:*"],
    "Resource": "*",
    "Condition": {"StringNotEquals": {"aws:RequestedRegion": ["eu-west-1", "eu-central-1"]}}
  }]
}
```

## Test before enforcing

Apply to a test organizational unit first and check what would be blocked using access logs. Document break-glass exceptions with a time limit and approvals. Version guardrails in code and review them like application changes.

```bash
aws organizations list-policies --filter SERVICE_CONTROL_POLICY
aws iam simulate-principal-policy --policy-source-arn "$ROLE_ARN" --action-names cloudtrail:StopLogging
```

## Incident: The deny that blocked everything

> **Incident:** A broad SCP denied actions that automation needed.

```console
AccessDenied: explicit deny in a service control policy
action: sts:AssumeRole
112 pipelines failed in 8 minutes
```

A region restriction was applied to the whole organization at once and forgot that global services use special regions. The team rolled it back, rewrote it with exceptions, tested on a pilot unit and added a change process for guardrails.

## Common mistakes

- Rolling out an SCP to all accounts at once
- Forgetting global services in region rules
- Many overlapping guardrails nobody understands
- Permanent exceptions

```quiz
Q: Does an SCP grant permissions?
+ No, it only limits them
- Yes :: No.
- Only in Azure :: No.
- Only for admins :: No.
> It sets a maximum. The lesson section above explains why.

Q: What wins between allow and deny?
+ Explicit deny
- Allow :: No.
- Neither :: No.
- The newest :: No.
> Deny always wins. The lesson section above explains why.

Q: What does a permission boundary cap?
+ The maximum permissions of a role
- Network speed :: No.
- Disk size :: No.
- DNS names :: No.
> It restricts identities.

Q: How roll out a guardrail safely?
+ Pilot on a test unit first
- To all accounts immediately :: No.
- Without notice :: No.
- During an outage :: No.
> Check impact first. The lesson section above explains why.
```

```cards
SCP :: Service control policy limiting accounts in an organization
Permission boundary :: Cap on an identity's permissions
Explicit deny :: A deny statement that overrides allows
Break glass :: Emergency access with strong controls
```
