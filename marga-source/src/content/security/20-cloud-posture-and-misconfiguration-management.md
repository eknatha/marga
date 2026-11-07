---
title: Cloud posture and misconfiguration management
minutes: 12
summary: Find public buckets, open ports and missing encryption continuously with posture tools and policy as code, and fix drift at the source.
---

Cloud accounts change constantly, and every change is a chance to open something that should be closed. Continuous checks against known good settings find these mistakes while they are small.

## What you will learn

- Common misconfigurations and how attackers find them
- Benchmarks, posture tools and IaC scanning
- Prioritizing by exposure and sensitivity
- Fixing at the source and preventing recurrence

## Common problems

- Public storage buckets and snapshots
- Security groups open to the whole internet on admin ports such as 22 and 3389
- Unencrypted volumes and databases
- Overly broad roles and long-lived access keys
- Disabled audit logging
- Default credentials on managed services

## Detect

```bash
aws s3api get-public-access-block --bucket shop-exports
aws ec2 describe-security-groups --filters Name=ip-permission.cidr,Values=0.0.0.0/0 \
  --query 'SecurityGroups[].{id:GroupId,ports:IpPermissions[].FromPort}'
checkov -d infra/ --framework terraform --quiet
```

Run posture checks continuously on live accounts, and scan infrastructure code in pull requests so mistakes never get deployed. Use a recognized benchmark such as **CIS** as a starting baseline.

## Prioritize

Not all findings are equal. Rank by **internet exposure**, **data sensitivity**, **privilege** and **ease of exploitation**. A public bucket with customer data outranks a missing tag. Combine findings: a public instance with a powerful role and a known vulnerability is a critical chain.

## Fix at the source

```hcl
resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

Change the Terraform or template and redeploy, otherwise drift returns. Add organization-level guardrails that deny the risky action, and a policy check in CI. Measure time to remediate by severity and report trends to owners.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Cloud posture and misconfiguration management fits together
node: n1 | Common problems | 0 | 0 | Public storage buckets and snapshots. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n2 | Detect | 1 | 1 | Run posture checks continuously on live accounts, and scan infrastructure code in pull requests so mistakes never get deployed. | Scanning accounts but not infrastructure code. | process
node: n3 | Prioritize | 2 | 0 | Not all findings are equal. Rank by internet exposure, data sensitivity, privilege and ease of exploitation. | Ranking all findings equally. | process
node: n4 | Fix at the source | 3 | 1 | Change the Terraform or template and redeploy, otherwise drift returns. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The export bucket that was public

> **Incident:** A test bucket with customer exports was publicly readable.

```console
bucket: shop-exports-test
BlockPublicAcls: false, RestrictPublicBuckets: false
object customers_2026-10.csv read by 198.51.100.23
```

A developer created the bucket by hand and disabled the block settings for a quick test. A posture scan flagged it, the team closed it and rotated data exposure checks, then enforced an account-level public access block and a CI rule rejecting public buckets.

## Common mistakes

- Fixing resources by hand and not in code
- Ranking all findings equally
- Scanning accounts but not infrastructure code
- No guardrail to prevent the mistake again

```quiz
Q: Why fix findings in code?
+ Hand fixes return at the next deploy
- Code is slower :: No.
- Scanners require it :: No.
- It hides findings :: No.
> Remove the cause. The lesson section above explains why.

Q: What raises a finding's priority?
+ Internet exposure and sensitive data
- A long name :: No.
- A recent tag :: No.
- Few users :: No.
> Risk depends on exposure.

Q: What is CIS used for?
+ A baseline of secure settings
- Billing :: No.
- Scheduling :: No.
- Backups :: No.
> Benchmarks guide hardening.

Q: What prevents public buckets across accounts?
+ An organization-level guardrail
- A reminder email :: No.
- A comment :: No.
- Nothing :: No.
> Prevent, do not only detect.
```

```cards
CSPM :: Cloud security posture management
Drift :: Live state differing from code
Guardrail :: A policy that blocks risky actions
Attack path :: Chain of weaknesses leading to impact
```
