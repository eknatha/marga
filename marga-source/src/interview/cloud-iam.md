## What is the difference between authentication and authorization?
level: junior
Authentication proves who a principal is, using a password, key, token or certificate. Authorization decides what that principal may do on which resource. Most cloud incidents come from authorization mistakes such as too many permissions, not from failing to identify the user.

## What is least privilege and how do you apply it?
level: junior
Least privilege gives each identity only the access its job needs for only as long as needed. I start narrow, read the exact action and resource in each denial, use last-accessed data to remove unused permissions, and schedule regular access reviews with a record of decisions.

## Why prefer roles to long-lived access keys?
level: junior
A role gives temporary credentials that expire, are issued to a trusted principal, and need no secret stored in code or files. Long-lived keys leak into repositories and logs and are rarely rotated. Platform-attached roles for workloads remove the whole class of stored credentials.

## How does AWS evaluate whether a request is allowed?
level: mid
The request is denied by default. It is allowed only if an applicable policy allows it and nothing denies it. An explicit deny always wins, and boundaries, organisation policies and resource policies can limit or extend access. I use the policy simulator and read the error to find the deciding statement.

## How do Azure RBAC scopes work?
level: mid
A role assignment ties a principal, a role definition and a scope. Scopes form a hierarchy of management group, subscription, resource group and resource, and assignments are inherited downward. I assign at the lowest scope that works and use managed identities for workloads.

## How do you keep secrets out of code and images?
level: mid
Secrets live in a managed store such as Secrets Manager or Key Vault, and the workload fetches them at run time with its identity. Builds run secret scanning, images are scanned, and rotation uses overlapping versions. If a secret was committed I treat it as exposed and rotate it first.

## A production key leaked. What do you do?
level: senior
I contain first by deactivating the key or revoking sessions without deleting evidence. Then I review audit logs for what it did and from where, remove attacker-created identities, resources and policies, rotate related secrets, replace the key with a role, and add detection and guardrails so the same path cannot recur.

## How do you design guardrails for many accounts?
level: senior
I use organisation-level policies that cap what any account can do, such as denying unused regions, blocking public storage and protecting audit logging. Central logging goes to a separate account, roles are assigned through groups and reviewed, and exceptions are time-limited and recorded.
