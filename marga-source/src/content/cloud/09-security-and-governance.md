---
title: Cloud security, governance and compliance guardrails
minutes: 16
summary: Organise accounts and subscriptions, enforce guardrails with SCPs and Azure Policy, protect data with encryption and key management, and detect misconfiguration continuously.
---

The cloud makes it easy to create resources and just as easy to create insecure ones. At scale you cannot review every change by hand. **Governance** means building guardrails so that safe is the default and unsafe is blocked or flagged automatically.

## What you will learn

- Account and subscription structure for isolation
- Preventive controls: SCPs, Azure Policy and permission boundaries
- Encryption, key management and secrets
- Detective controls: posture management and findings

## Structure for isolation

Do not run everything in one account. Separate accounts (AWS) or subscriptions (Azure) give hard boundaries for blast radius, billing and access.

| Level | AWS | Azure |
|-------|-----|-------|
| Top | Organization | Tenant and management groups |
| Unit of isolation | Account | Subscription |
| Grouping | Organizational Units | Management groups |
| Guardrail | Service control policies | Azure Policy, RBAC deny assignments |

A common layout has separate accounts for production, non-production, shared networking, security tooling and the log archive. A compromise in a development account then cannot touch production data or erase audit logs.

## Preventive guardrails

A **service control policy** sets the maximum permissions available in an account, whatever IAM says. Even an administrator inside the account cannot exceed it.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyDisablingAudit",
      "Effect": "Deny",
      "Action": [
        "cloudtrail:StopLogging",
        "cloudtrail:DeleteTrail",
        "config:StopConfigurationRecorder"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyUnapprovedRegions",
      "Effect": "Deny",
      "NotAction": ["iam:*", "organizations:*", "route53:*", "cloudfront:*", "support:*"],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": ["eu-west-1", "eu-central-1"]
        }
      }
    }
  ]
}
```

On Azure, **Azure Policy** can deny, audit or auto-remediate resources that break rules, such as storage accounts that allow public blob access or resources in the wrong region.

```console
$ aws organizations list-policies --filter SERVICE_CONTROL_POLICY
$ aws organizations list-accounts --query 'Accounts[].[Name,Id]' --output text
$ az policy assignment list --query '[].{name:displayName,scope:scope}' -o table
$ az policy state summarize --top 5
```

Roll out guardrails in **audit mode** first, learn what would break, then enforce. A denied deployment with an unclear message creates support tickets, so write error text that explains the rule.

## Data protection

- Encrypt data at rest with managed keys, and use customer-managed keys (KMS, Key Vault) where policy requires control and rotation
- Require TLS for data in transit and block plain HTTP on storage endpoints
- Block public access at the account level for object storage
- Keep secrets in Secrets Manager or Key Vault, with access by identity and audit logging
- Separate key administrators from data users

```console
$ aws s3control get-public-access-block --account-id 123456789012
$ aws kms list-aliases --query 'Aliases[?starts_with(AliasName, `alias/shop`)].AliasName'
$ aws kms get-key-rotation-status --key-id alias/shop-data
$ az storage account show -n acmedata --query '{https:enableHttpsTrafficOnly, publicAccess:allowBlobPublicAccess, tls:minimumTlsVersion}'
$ az keyvault show -n kv-shop --query '{purge:properties.enablePurgeProtection, soft:properties.enableSoftDelete}'
```

## Detective controls

Prevention will not catch everything. Continuous assessment finds drift and misconfiguration: AWS Security Hub, Config and GuardDuty; Microsoft Defender for Cloud and Azure Policy compliance. Feed findings into a ticketing system with owners and deadlines, and prioritise by exposure: a public database matters more than a missing tag.

## Compliance as code

Express controls as code that runs in the pipeline before deployment, for example scanning Terraform with a policy engine, and run the same checks against live accounts. That keeps documentation, enforcement and evidence consistent for audits such as ISO 27001, SOC 2 or PCI DSS.

```console
$ terraform show -json tfplan > plan.json
$ trivy config --severity HIGH,CRITICAL .
$ checkov -d . --quiet --compact
$ aws securityhub get-findings --filters '{"SeverityLabel":[{"Value":"CRITICAL","Comparison":"EQUALS"}],"RecordState":[{"Value":"ACTIVE","Comparison":"EQUALS"}]}' --max-items 5
```

## Incident: the public bucket in the dev account

> **Incident:** A researcher reports that a storage bucket named after your company lists customer invoices to anyone. A developer had created it in a sandbox account for a demo, copied real exports into it, and set a public-read policy to share a link.

Contain before you investigate:

```console
$ aws s3api put-public-access-block --bucket acme-demo-invoices --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
$ aws s3api delete-bucket-policy --bucket acme-demo-invoices
$ aws s3api get-bucket-logging --bucket acme-demo-invoices
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=acme-demo-invoices --max-results 20
```

Block access, preserve logs, determine what was downloaded and by whom, and follow your breach-notification process. Prevent a repeat with an account-level public access block enforced by an SCP, a rule that production data may not leave production accounts, and automated detection that alerts within minutes when a bucket becomes public.

## Common mistakes

- One account for everything
- Guardrails enforced without an audit period or helpful error messages
- Relying on documentation instead of automated controls
- Key administrators who can also read all the data
- Findings dashboards that nobody owns

```quiz
Q: What does a service control policy do?
- Grants permissions to users
+ Sets the maximum permissions available in an account, regardless of IAM policies
- Creates accounts
- Encrypts storage
> SCPs are guardrails that even account administrators cannot override.

Q: Why use separate accounts or subscriptions?
- To increase the bill
+ To limit the blast radius and separate access, billing and audit data
- Because clouds require it
- To improve network speed
> A compromise in one account cannot automatically spread to another.

Q: What is a safe way to introduce a new guardrail?
- Enforce it immediately everywhere
+ Run it in audit mode first, review the impact, then enforce
- Announce it by email only
- Apply it only in production
> Audit mode shows what would break before it actually breaks.

Q: What is the first priority when a data exposure is found?
+ Block the public access and preserve evidence
- Write the report
- Delete all logs
- Rename the bucket
> Contain first, then investigate and notify as required.
```

```cards
AWS organisation unit versus Azure equivalent? :: OU groups accounts; management group groups subscriptions
What does Azure Policy do? :: Audits, denies or remediates resources that break defined rules
Preventive versus detective control? :: Preventive blocks bad actions; detective finds and reports them after the fact
Why separate key admins from data users? :: So no one person can both control keys and read the protected data
```
