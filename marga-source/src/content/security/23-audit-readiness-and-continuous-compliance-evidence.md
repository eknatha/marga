---
title: Audit readiness and continuous compliance evidence
minutes: 12
summary: Prepare for SOC 2 or ISO 27001 audits by automating evidence, mapping controls to technical checks and keeping a living record.
---

Frameworks such as SOC 2 and ISO 27001 do not tell you how to configure a firewall. They ask whether you set rules, follow them and can show that you do. Engineers can answer that with data instead of documents.

## What you will learn

- Controls, owners and technical checks
- Automating evidence collection
- Handling exceptions and drift
- Preparing for the auditor

## From control to check

A **control** is a stated rule, such as "access is reviewed quarterly" or "changes are approved before production". Map each one to a **check** that can be run by a machine, an **owner** and the **evidence** it produces.

```yaml
controls:
  - id: AC-2
    statement: Access to production is reviewed quarterly
    owner: platform-security
    check: scripts/access_review_report.py
    evidence: evidence/access-review/2026-Q4.json
  - id: CM-3
    statement: Production changes are reviewed and approved
    owner: engineering
    check: scripts/changes_without_review.py
    evidence: evidence/changes/2026-11.json
```

## Collect automatically

```bash
python scripts/changes_without_review.py --since 30d > evidence/changes/2026-11.json
aws iam generate-credential-report >/dev/null && aws iam get-credential-report --query Content --output text | base64 -d > evidence/iam/2026-11.csv
sha256sum evidence/*/*.json > evidence/SHA256SUMS
```

Run collection on a schedule from CI, store results in write-once storage with dates and hashes, and keep the scripts under version control. Evidence from real systems, such as pull request history, access logs and scan reports, is more convincing than screenshots.

## Exceptions and drift

Failures happen. Record each exception with a reason, an approver, a mitigation and an end date. Alert when a control check starts failing, and fix it before the audit, not during it.

## The audit

Give the auditor a map of controls to evidence, a named contact for each area and read-only access to the evidence store. Run an internal review a month before to find gaps. After the audit, turn findings into backlog items with owners.

## Incident: Screenshots in a panic

> **Incident:** Evidence gathering consumed weeks before an audit and still missed a control.

```console
AC-2 quarterly access review: no evidence for Q2
CM-3 changes: 14 production changes without a review record
audit fieldwork starts in 5 days
```

The team relied on memory and screenshots, so gaps appeared at the last minute. After mapping controls to automated checks with alerts and dated evidence, missed reviews were noticed within the quarter instead of at the audit.

## Common mistakes

- Collecting evidence only before the audit
- Controls with no owner
- Exceptions with no end date
- Screenshots instead of system data

```quiz
Q: What is a control?
+ A stated rule with a way to prove it
- A server :: No.
- A password :: No.
- A log level :: No.
> Controls need checks.

Q: Why automate evidence?
+ It is current, consistent and cheap
- It avoids audits :: No.
- It deletes logs :: No.
- It hides gaps :: No.
> Reduces scramble. The lesson section above explains why.

Q: What should an exception include?
+ Reason, approver, mitigation and end date
- Nothing :: No.
- A joke :: No.
- A secret :: No.
> Exceptions must be managed.

Q: What helps before the audit?
+ An internal review
- Waiting :: No.
- Deleting evidence :: No.
- Changing logs :: No.
> Find gaps early. The lesson section above explains why.
```

```cards
Control :: A rule or safeguard an organization follows
Evidence :: Data that shows a control operated
SOC 2 :: Audit report on service organization controls
Exception :: A recorded, approved deviation from a control
```
