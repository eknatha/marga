---
title: Testing, linting and policy checks for templates
minutes: 12
summary: Catch template mistakes before deployment with cfn-lint, cfn-guard, the Bicep linter, what-if, policy as code and ephemeral test environments.
---

A template change can open a firewall or delete a database. Automated checks catch most of the common mistakes at no cost, in seconds, before anyone deploys.

## What you will learn

- Linting for syntax and best practice
- Policy as code for standards
- Previews and security scanning
- Test environments and smoke tests

## The layers

| Layer | CloudFormation | Bicep |
|---|---|---|
| Syntax and best practice | `cfn-lint` | `az bicep build`, Bicep linter |
| Policy rules | `cfn-guard` | PSRule for Azure, Azure Policy |
| Security scan | Checkov, Trivy | Checkov, Trivy |
| Preview | Change set | What-if |
| Real test | Deploy to a test account | Deploy to a test subscription |

## Examples

```console
$ cfn-lint template.yaml
E3012 Property Resources/Logs/Properties/Versioning should be of type Object
$ cfn-guard validate --data template.yaml --rules s3-encryption.guard
Logs/BucketEncryption: FAIL (rule: s3_bucket_encryption_enabled)
$ az bicep build --file main.bicep
Warning no-hardcoded-env-urls: Environment URLs should not be hardcoded
```

A guard rule is a short statement of the standard, for example "every S3 bucket has encryption".

```text
rule s3_bucket_encryption_enabled {
  Resources.*[ Type == 'AWS::S3::Bucket' ].Properties.BucketEncryption exists
}
```

## Test deployments

Linters cannot prove that a stack really deploys, that an app responds or that permissions are enough. Create a short-lived environment in a sandbox account, run smoke tests, then delete it. Use **taskcat** for CloudFormation across regions. Always clean up to avoid cost.

## Wiring

Run checks locally with pre-commit and again in CI as the required status, so a pull request cannot merge on failure.

```diagram
title: Template checks in order
node: pr | Pull request | 0 | 0 | Starts the checks. | Checks that run only on request are skipped.
node: lint | Lint | 1 | 0 | Syntax and best practice. | Warnings left alone become habits. | observe
node: pol | Policy rules | 2 | 0 | Encryption, tags, public access rules. | Rules nobody owns go stale. | security
node: prev | Preview | 3 | 0 | Change set or what-if. | Previewing against the wrong environment misleads.
node: test | Test deployment | 3 | 1 | Short-lived environment with smoke tests. | Forgotten test stacks cost money. | store
edge: pr | lint
edge: lint | pol
edge: pol | prev
edge: prev | test
```

## Incident: Open to the world

> **Incident:** A pull request opened a security group to the internet; policy checks caught it.

```console
$ cfn-guard validate --data app.yaml --rules network.guard
sg-web: FAIL (rule: no_open_ssh)
ingress 0.0.0.0/0 on port 22
```

The check failed before merge. The author restricted the source range, the review took two minutes, and no auditor had to find it later.

## Common mistakes

- Linting only on a developer laptop
- Treating warnings as noise
- Test stacks never cleaned up
- Policy rules with no owner

```quiz
Q: Which tool lints CloudFormation templates?
+ cfn-lint
- kubectl :: No.
- helm :: No.
- ansible :: No.
> It checks syntax and best practice.

Q: What does cfn-guard check?
+ Policy rules over templates
- Network speed :: No.
- Code coverage :: No.
- Logs :: No.
> Guard rules express standards.

Q: Why still run a test deployment?
+ Tools cannot prove a stack really works
- To spend money :: No.
- To skip review :: No.
- To rename resources :: No.
> Real environments reveal real problems.

Q: Where should checks be required?
+ As CI status on every pull request
- Only before audits :: No.
- Only on laptops :: No.
- Never :: No.
> Required checks stop bad merges.
```

```cards
Linter :: A tool that finds mistakes without running the code
Policy as code :: Rules written as code and checked automatically
cfn-guard :: AWS tool for rule checks on templates
taskcat :: Tool that tests CloudFormation across regions
Smoke test :: A quick check that a deployment basically works
```
