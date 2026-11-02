---
title: Policy as code, compliance and audit evidence
minutes: 15
summary: Turn security rules into checks that run automatically, use admission and pipeline policies to prevent drift, and collect continuous evidence for audits instead of screenshots.
---

Security teams write policies: encrypt data, restrict public access, patch within a set time. Auditors ask for proof. When policies live in documents and proof lives in screenshots, both go out of date by the time they are read. Policy as code puts the rule in a machine-readable form that is checked on every change, and compliance as code produces the evidence automatically.

## What you will learn

- What policy as code is and where it can run
- Writing simple policies with Open Policy Agent and Kyverno
- Guardrails in the cloud and in pipelines
- Frameworks such as CIS, SOC 2 and ISO 27001, in plain terms
- Collecting evidence continuously

## Where policy runs

| Point | What it checks | Example |
|-------|----------------|---------|
| Editor and pull request | Terraform and manifests before merge | No public bucket |
| Pipeline | Images and artifacts before release | Only signed images from our registry |
| Admission | Objects as they enter the cluster | Pods must run as non-root |
| Cloud account | Settings of live resources | Block public storage, deny unapproved regions |
| Runtime and audit | Drift and exceptions after the fact | A security group opened to the world |

The earlier in the line, the cheaper the fix. The later controls catch what slipped through and what changed by hand.

## A policy in Rego

Open Policy Agent uses a language called Rego. This rule denies Terraform plans that open SSH to the internet:

```rego
package terraform.security

deny[msg] {
  rc := input.resource_changes[_]
  rc.type == "aws_security_group_rule"
  rc.change.after.from_port <= 22
  rc.change.after.to_port >= 22
  rc.change.after.cidr_blocks[_] == "0.0.0.0/0"
  msg := sprintf("%s opens SSH to the world", [rc.address])
}
```

The pipeline runs the check on the plan and fails the build with a clear message.

## A policy for Kubernetes

Kyverno writes policies as Kubernetes objects. This one requires every pod to run as non-root:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: Audit
  rules:
    - name: run-as-non-root
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "Containers must set runAsNonRoot to true."
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
```

Start in `Audit` mode to see what would be blocked. Fix the findings, then switch to `Enforce`.

```predict
Q: You switch a new policy straight to enforce mode in production on a Friday afternoon. What is the most likely result?
???
Existing workloads that break the rule fail to redeploy or restart, and teams are surprised.
> Always audit first, review the violations with owners, grant time-limited exceptions where needed, and enforce in stages by namespace or environment.
```

## Guardrails versus gates

A **gate** blocks a change until a person approves. A **guardrail** makes the unsafe action impossible or automatically corrected, with no waiting. Guardrails scale better: a service control policy that denies public storage in every account needs no reviewer.

## Frameworks in plain words

- **CIS Benchmarks**: detailed lists of secure settings for operating systems, clusters and cloud accounts.
- **SOC 2**: an audit report about how a service provider handles security, availability and confidentiality.
- **ISO 27001**: a standard for running an information security management system.
- **PCI DSS** and **HIPAA**: rules for card data and health data.

They differ in detail, yet they ask for similar things: access control, encryption, logging, change management, patching and incident response. Map each rule you automate to the controls it supports once, and reuse it across frameworks.

## Continuous evidence

Auditors want to see that a control worked over time. Instead of taking screenshots, store the output of your automated checks with dates: pipeline results, policy reports, access reviews and change records. Keep it in a place that cannot be edited afterward.

```console
$ aws configservice describe-compliance-by-config-rule --query 'ComplianceByConfigRules[].[ConfigRuleName,Compliance.ComplianceType]' --output text
s3-bucket-public-read-prohibited    COMPLIANT
encrypted-volumes                   NON_COMPLIANT
```

## Incident: the exception that never expired

> **Incident:** A temporary exception to the "no public storage" rule was granted for a launch. Two years later an audit finds the bucket still public, with customer exports inside.

An exception needs an owner, a reason and an end date, and the policy engine should remove it automatically. Look for existing exceptions regularly:

```console
$ grep -rn "exception" policy/exceptions.yaml | head -3
policy/exceptions.yaml:12:  - bucket: launch-assets  owner: ""  expires: ""
```

Add the missing fields as required, fail the check when they are empty, and review exceptions every quarter.

## Common mistakes

- Writing policies in documents that nobody checks
- Enforcing a new policy without an audit period
- Granting exceptions with no owner or expiry
- Collecting screenshots for audits instead of automatic evidence

```quiz
Q: What is policy as code?
- A printed security manual
+ Security rules written in a machine-readable form and checked automatically on every change
- A password policy only
- A type of firewall
> Code can be tested, versioned and enforced in pipelines and clusters, which documents cannot.

Q: Why start a new Kubernetes policy in audit mode?
- Audit mode is faster
+ To see what would be blocked and fix it before enforcing, so teams are not surprised
- Enforcement is not possible
- It disables logging
> Audit mode reports violations without stopping work, which makes a safe rollout possible.

Q: What is a guardrail?
- A manual approval step
+ A control that makes unsafe actions impossible or corrects them automatically
- A type of log
- A password rule
> Guardrails need no waiting for a reviewer, so they scale across many teams.

Q: What makes a good exception to a policy?
- No expiry, to avoid work
+ An owner, a reason and an end date, reviewed regularly
- A verbal agreement
- A shared spreadsheet that nobody reads
> Without an end date, a temporary exception becomes a permanent hole.
```

```cards
What does OPA use to express policies? :: A language called Rego
What does Kyverno use? :: Kubernetes objects, such as ClusterPolicy, written in YAML
Gate vs guardrail? :: A gate waits for approval; a guardrail prevents or fixes the issue automatically
Why use audit mode first? :: To find violations before enforcing and breaking workloads
What is continuous evidence? :: Automatically collected, dated results of checks that prove a control works over time
```
