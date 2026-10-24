---
title: Identity and access management
minutes: 17
summary: Control who can do what in AWS and Azure with roles and policies, avoid long-lived keys, and debug access denied errors systematically.
---

Identity and access management is the foundation of cloud security. Networks can be misconfigured and software can have bugs, but if every identity has exactly the access it needs and no more, the damage from either is limited.

## What you will learn

- Users, groups, roles and policies in AWS
- Entra ID, RBAC and managed identities in Azure
- Why roles and short-lived credentials beat access keys
- How to troubleshoot an access denied error

## AWS IAM

| Concept | Meaning |
|---------|---------|
| **User** | A long-lived identity for a person or program. Avoid for programs |
| **Group** | A set of users sharing permissions |
| **Role** | An identity that is **assumed** temporarily. Used by services, applications and federated people |
| **Policy** | A JSON document that allows or denies actions on resources |

A policy states which **actions** are allowed on which **resources**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::acme-uploads/shop/*"
    }
  ]
}
```

Evaluation follows a clear rule: everything is **denied by default**; an explicit `Allow` is needed; an explicit `Deny` always wins. Permission boundaries, service control policies and session policies can further restrict what an identity can do, even when its own policy allows it.

An EC2 instance, a Lambda function or a Kubernetes service account gets permissions by being given a **role**. The credentials it receives are temporary and rotate automatically, so there is no key to leak.

## Azure access control

Azure splits identity from authorization:

| Concept | Meaning |
|---------|---------|
| **Microsoft Entra ID** | The identity directory for users, groups and applications |
| **Azure RBAC** | Role assignments at a scope: management group, subscription, resource group or resource |
| **Managed identity** | An identity for an Azure resource, with no secret to manage |
| **Role assignment** | Who (principal) + which role + at what scope |

Built-in roles include Reader, Contributor and Owner, and many specific ones. Assign the narrowest role at the narrowest useful scope.

```console
$ az role assignment create \
    --assignee-object-id "$PRINCIPAL_ID" \
    --assignee-principal-type ServicePrincipal \
    --role "Storage Blob Data Contributor" \
    --scope /subscriptions/$SUB/resourceGroups/shop-prod/providers/Microsoft.Storage/storageAccounts/acmeuploads
```

## Principles that apply everywhere

- **Least privilege.** Start with nothing and add what is needed; do not start with admin and remove.
- **Prefer roles and managed identities** over access keys and passwords.
- **Require multi-factor authentication** for every human, and protect the root or global administrator account with hardware keys and no daily use.
- **Use groups** for people, so access follows job role rather than individuals.
- **Review regularly.** Remove unused identities and permissions. Both clouds report last-used information.
- **Log everything**: CloudTrail in AWS, Activity Log and Entra sign-in logs in Azure.

> **Warning:** An access key that appears in a shared location, a build log or an image must be treated as compromised. Deactivate it immediately, then investigate what it did, then replace it with a role.

## Verifying identity and permissions

```console
$ aws sts get-caller-identity
{
    "UserId": "AROAEXAMPLE:session-1",
    "Account": "123456789012",
    "Arn": "arn:aws:sts::123456789012:assumed-role/shop-api-role/session-1"
}
$ az account show --query "{subscription:name, user:user.name}"
```

Always check **who you are** before debugging **what you are allowed to do**.

## Incident: AccessDenied when the application reads a bucket

> **Incident:** The API returns errors. The log says `AccessDenied: User: arn:aws:sts::123456789012:assumed-role/shop-api-role/i-0abc is not authorized to perform: s3:GetObject on resource: arn:aws:s3:::acme-uploads/shop/logo.png`.

The error message names the identity, the action and the resource, which is everything you need. Work through the layers:

1. Is the identity what you expect? Here the role is `shop-api-role`. Confirm the application is really using it.
2. Does an identity policy allow the action? The earlier policy allows `GetObject` on `shop/*`, which matches this object.
3. Does the bucket have a resource policy with a `Deny`, or an encryption setting requiring access to a KMS key?
4. Do organization-level controls (service control policies or permission boundaries) block it?

```console
$ aws iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::123456789012:role/shop-api-role \
    --action-names s3:GetObject \
    --resource-arns arn:aws:s3:::acme-uploads/shop/logo.png
```

The simulation reports an implicit deny: the policy on the role lists the key prefix `shop/` but the real object is stored at `Shop/logo.png`, and S3 key names are case-sensitive. Correct the resource path in the policy or the application, and the request succeeds. If the cause had been KMS, the error would have mentioned the key. Reading the denied action and resource carefully saves hours.

## Common mistakes

- Using the root account or a global administrator for daily work
- Wildcard actions and resources (`"Action": "*"`) in policies
- Long-lived access keys stored in applications
- Granting access to individuals instead of groups

```quiz
Q: In AWS policy evaluation, what takes precedence?
- An explicit Allow
+ An explicit Deny
- The most recently created policy
- The shortest policy
> Everything is denied by default, and an explicit Deny overrides any Allow.

Q: Why use a role for an application instead of an access key?
- Roles are cheaper
+ Role credentials are temporary and rotate automatically, so there is no long-lived secret to leak
- Access keys are no longer supported
- Roles skip logging
> Temporary credentials limit the damage from exposure.

Q: What three parts make up an Azure role assignment?
+ Principal, role and scope
- User, password and group
- Tenant, region and tag
- Subscription, policy and budget
> Who gets which role, and where it applies.

Q: First step when debugging AccessDenied?
- Add AdministratorAccess to the role
+ Confirm which identity is making the call and read the denied action and resource
- Delete the bucket
- Restart the server
> The error names the identity, action and resource; start there and avoid broad grants.
```

```cards
AWS role vs user? :: A role is assumed temporarily and gives short-lived credentials; a user has long-lived credentials
Azure managed identity? :: An identity for an Azure resource with no secret to store or rotate
Command to see who you are in AWS? :: aws sts get-caller-identity
Least privilege means? :: Grant only the access needed, at the narrowest scope
```
