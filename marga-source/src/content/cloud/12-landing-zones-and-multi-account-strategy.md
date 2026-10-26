---
title: Landing zones and multi-account strategy
minutes: 14
summary: Organise cloud accounts or subscriptions into a hierarchy with guardrails, central logging, networking and identity, so teams move fast inside safe boundaries.
---

A single cloud account for everything works at first. Then a test script deletes a production resource, a bill cannot be split between teams, a compromised key reaches everything, and a service limit used by one team blocks another. The answer is not more rules, but more boundaries: separate accounts (AWS), subscriptions (Azure) or projects (Google Cloud), organised under one management structure with shared guardrails.

## What you will learn

- Why accounts are the strongest boundary
- A typical hierarchy and account roles
- Guardrails: organisation policies and service control policies
- Central logging, networking and identity
- Vending new accounts with automation

## Why many accounts

An account is a boundary for permissions, limits, billing and blast radius. Splitting by environment and workload gives you:

- **Security isolation:** a compromise in development cannot reach production data.
- **Cost clarity:** each account has its own bill and budget.
- **Independent limits:** one team's quota use does not block another.
- **Simpler permissions:** production access can be narrow, development access broad.

## A typical structure

```text
Organization root
  Security OU
    log-archive          (central, write-only logs)
    security-tooling     (detection, audit read access)
  Infrastructure OU
    network-hub          (shared networking, DNS, egress)
    shared-services      (CI runners, registries)
  Workloads OU
    Prod OU:     app-a-prod, app-b-prod
    Non-prod OU: app-a-dev,  app-a-staging
  Sandbox OU             (experiments, tight budgets, auto-clean)
  Management account     (billing and organisation only; no workloads)
```

Keep workloads out of the management account. Organise by what needs different rules, not by the company's org chart.

## Guardrails

Policies attached to organisational units limit what even administrators in an account can do:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyLeavingApprovedRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "support:*", "route53:*", "cloudfront:*"],
    "Resource": "*",
    "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] } }
  }]
}
```

Typical guardrails: allowed regions, no disabling of audit logging, no deleting central log buckets, no public storage, required encryption, no leaving the organisation. Test guardrails in a sandbox OU first, because a wrong deny can stop deployments.

## Shared capabilities

- **Logging:** audit logs from every account flow to a central, locked log archive account that workload admins cannot change.
- **Networking:** a hub with shared egress, DNS and connectivity to on-premises; spokes connect through it. Plan address ranges across all accounts so they do not overlap.
- **Identity:** people sign in through a central identity provider with single sign-on and get temporary roles per account, with no long-lived users in each account.
- **Security tooling:** detection services enabled in all accounts and sent to one place.

## Account vending

New accounts should come from a pipeline: a request creates the account in the right OU, applies baseline guardrails, enables logging, sets budgets and alerts, creates roles and registers it in the inventory. Teams get a safe account in minutes without a ticket queue. Manage the baseline as code, and also plan for closing accounts.

```predict
Q: A workload admin tries to disable audit logging in their account. The organisation guardrail denies it. Why can a guardrail do this even for an administrator?
???
Organisation-level policies apply above the account's own permissions, so they limit everything inside it, including administrators.
> Guardrails are boundaries, not trust in individuals.
```

## Incident: one account, one stolen key

> **Incident:** A developer's access key leaks and an attacker starts instances for mining in the single account used for everything, including production databases.

```console
$ aws ce get-cost-and-usage --time-period Start=2026-10-01,End=2026-10-08 --granularity DAILY --metrics UnblendedCost
2026-10-06   412 USD
2026-10-07  9120 USD
```

Because everything shared one account, the key reached production, and the bill could not be traced to a team. The company moved to an organisation with separate accounts for production and development, central logging in a locked account, region guardrails, short-lived single sign-on roles in place of keys, and per-account budget alerts.

## Common mistakes

- One account for all environments
- Running workloads in the management account
- Overlapping network ranges across accounts
- Guardrails changed without testing

```quiz
Q: Why is an account a strong security boundary?
+ Permissions, limits and billing are separated, so a compromise stays contained
- It is cheaper :: Not the point.
- It makes code faster :: Unrelated.
- It removes the need for IAM :: IAM is still needed.
> Boundaries limit blast radius.

Q: What does a service control policy or organisation policy do?
+ Sets limits that apply to every principal in the accounts below it
- Creates users :: Unrelated.
- Stores logs :: Unrelated.
- Encrypts disks :: Unrelated.
> It is a guardrail above account permissions.

Q: Where should audit logs from all accounts be stored?
+ In a central account that workload administrators cannot modify
- In each workload account only :: Attackers could delete them.
- On a laptop :: Unsafe.
- Nowhere :: You need evidence.
> A protected archive keeps evidence safe.

Q: What is account vending?
+ Creating new accounts automatically with a secure baseline
- Selling accounts :: Unrelated.
- Closing all accounts :: Unrelated.
- Billing :: Unrelated.
> It gives teams safe accounts quickly.
```

```cards
Why multiple accounts? :: Isolation of security, cost and limits
What goes in the management account? :: Only organisation and billing
What is a guardrail? :: A policy applied above accounts
Where do logs go? :: A locked central log archive
How to avoid address clashes? :: Plan ranges across all accounts
```
