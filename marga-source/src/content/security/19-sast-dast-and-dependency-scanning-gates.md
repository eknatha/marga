---
title: SAST, DAST and dependency scanning gates
minutes: 13
summary: Add static analysis, dependency scanning and dynamic testing to pipelines, tune them to reduce noise and decide what should block a release.
---

Automated security testing is easy to add and hard to run well. The difference lies in what runs when, what blocks and who owns the findings.

## What you will learn

- SAST, SCA, DAST, secrets and IaC scanners
- Where each scan fits in the pipeline
- Tuning thresholds and suppressions
- Triage, ownership and measuring the program

## The tools

- **SAST:** analyzes source code for flaws such as injection and unsafe functions.
- **SCA:** finds known vulnerabilities in third-party dependencies and licence issues.
- **Secrets scanning:** finds keys and tokens in code and history.
- **IaC and container scanning:** checks Terraform, Kubernetes manifests and images.
- **DAST:** probes a running application in a test environment for issues visible from outside.

## In the pipeline

```yaml
# example stages in a CI pipeline
stages:
  pr_checks:        # fast, under 5 minutes, runs on every pull request
    - secret_scan
    - sca_scan --fail-on critical,high --only-fixable
    - sast_scan --changed-files-only
    - iac_scan
  nightly:          # slower, deeper
    - sast_full
    - container_scan
    - dast_scan --target https://staging.example.com
```

Run quick scans where developers see results in the pull request. Run slow scans nightly and report to a backlog.

## Thresholds

Block on findings that are **severe, fixable and reachable**. Report the rest with a deadline by severity, for example critical in 7 days and high in 30. Use time-limited suppressions with a reason and an owner, never permanent ignores.

```bash
trivy fs --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 .
```

## Own and measure

Route each finding to the owning team, not a central queue. Track mean time to remediate, open findings by age and false positive rate per tool. Retire tools whose findings are mostly ignored, and review the rules every quarter.

## Incident: Everything blocked, everything suppressed

> **Incident:** A strict gate led to blanket suppressions that hid a real flaw.

```console
scan: 214 findings (3 critical, 41 high, 170 medium)
gate: fail on medium and above
suppressions added in one week: 198 (including 1 critical)
```

Developers needed to ship, so they suppressed most findings in bulk, including a real critical issue. The team changed the gate to block on fixable critical and high issues, required reasons and expiry dates for suppressions and reviewed them weekly.

## Common mistakes

- Blocking on every severity
- Permanent suppressions with no owner
- Slow scans on every pull request
- No measurement of false positives

```quiz
Q: What does SCA scan?
+ Third-party dependencies
- Only your code :: No.
- Only networks :: No.
- Only logs :: No.
> Known vulnerable libraries.

Q: What should block a release?
+ Severe, fixable, reachable findings
- Every finding :: No.
- Nothing :: No.
- Only style :: No.
> Focus on what matters.

Q: Where run slow scans?
+ Nightly
- On every keystroke :: No.
- Never :: No.
- Only manually :: No.
> Do not slow developers.

Q: What should a suppression have?
+ A reason, owner and expiry
- Nothing :: No.
- A joke :: No.
- A password :: No.
> Prevents silent risk.
```

```cards
SAST :: Static analysis of source code
SCA :: Software composition analysis of dependencies
DAST :: Dynamic testing of a running application
Suppression :: Marking a finding as accepted or false
```
