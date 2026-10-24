---
title: Securing the pipeline and the software supply chain
minutes: 16
summary: Protect secrets, runners and dependencies in CI/CD, apply least privilege to deploy credentials, scan code and images, and defend against poisoned dependencies.
---

A pipeline has the keys to production: it can read your source, build what you run and deploy it. That makes it one of the most attractive targets in your company. Attackers who compromise a pipeline do not need to break production, because the pipeline will deploy their code for them.

## What you will learn

- Handling secrets without exposing them in logs or code
- Isolating and hardening build runners
- Granting deploy credentials with least privilege and short lifetimes
- Scanning code, dependencies and images, and pinning what you consume

## Secrets in pipelines

Secrets must come from a secret store or the CI system's protected variables, be masked in logs and be scoped to the jobs that need them.

```yaml
deploy-prod:
  stage: deploy
  environment: production
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
  variables:
    AWS_ROLE_ARN: "arn:aws:iam::123456789012:role/shop-deploy"
  id_tokens:
    CI_JOB_JWT:
      aud: sts.amazonaws.com
  script:
    - aws sts assume-role-with-web-identity --role-arn "$AWS_ROLE_ARN" --role-session-name ci-$BUILD_ID --web-identity-token "$CI_JOB_JWT" --duration-seconds 900
    - ./deploy.sh
```

The best secret is the one that does not exist. **Workload identity federation** (OIDC) lets the pipeline prove who it is to the cloud provider and receive credentials that live for minutes, so there is no stored access key to leak. Where static secrets are unavoidable, restrict them to protected branches, rotate them regularly and never echo them.

```console
$ grep -rnE "AKIA[0-9A-Z]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY" . --include=* -I | head
$ detect-secrets scan --all-files | head -20
```

Run a secret scanner in the pipeline and as a pre-commit hook. A leaked key must be treated as compromised: revoke it first, then clean the history.

## Runners and isolation

Build agents run untrusted code, since any pull request may contain a malicious test or build script. Treat them accordingly.

- Use ephemeral runners that are destroyed after each job
- Give runners no standing access to production networks
- Separate runners for untrusted contributions from those with deploy credentials
- Do not run pull request pipelines from forks with secrets available
- Keep the runner software and base image patched

## Least privilege for deployment

The deploy job needs permission to update specific workloads, not to administer the account.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: shop
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch", "update"]
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list"]
```

Require approval for production, restrict who can approve, and make the pipeline definition itself reviewable. If anyone can edit the pipeline file in a feature branch and have it run with production credentials, protection of the main branch is meaningless.

## Securing what you consume

Dependencies are code you did not write. Attackers publish look-alike package names, take over abandoned packages and add malicious install scripts.

```console
$ npm ci --ignore-scripts
$ python -m pip install --require-hashes -r requirements.txt
$ pip-audit -r requirements.txt
$ npm audit --audit-level=high
$ trivy fs --scanners vuln,secret,misconfig .
$ trivy config --severity HIGH,CRITICAL Dockerfile k8s/
```

Use lock files and install exactly what they list. Pull through an internal proxy or mirror. Pin third-party CI plugins and actions to an exact version or digest, because a tag can be moved. Generate an SBOM for every release and sign artifacts so deployment can verify them.

## A layered pipeline

| Stage | Control |
|-------|---------|
| Commit | Secret scanning, signed commits, branch protection and review |
| Build | Ephemeral runner, pinned base images, locked dependencies |
| Test | Static analysis (SAST), dependency audit, IaC misconfiguration scan |
| Package | Image scan, SBOM, signature |
| Deploy | Admission policy verifies signature, OIDC short-lived credentials, approvals |
| Run | Runtime monitoring, audit logs, network policy |

No single control is enough. Each layer assumes another one may fail.

## Incident: the leaked deploy key

> **Incident:** A contractor's pull request adds a debug line `env | sort` to a test script. The pipeline runs it and prints every environment variable into a publicly viewable log, including a long-lived cloud access key with admin rights. Within an hour, unfamiliar instances start in an unused region.

Respond in order: revoke, contain, investigate, then harden.

```console
$ aws iam update-access-key --access-key-id AKIAEXAMPLEKEY123456 --status Inactive --user-name ci-deployer
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAEXAMPLEKEY123456 --max-results 20
$ aws ec2 describe-instances --region ap-southeast-2 --query 'Reservations[].Instances[].InstanceId'
```

Deactivate the key, review everything it did, terminate rogue resources, and delete the log. Then fix the design: replace the static key with OIDC federation, scope the role to deploy only, stop exposing secrets to pull request pipelines, and add a secret scanner that blocks the merge.

## Common mistakes

- Long-lived admin keys stored as CI variables
- Running untrusted pull requests with production secrets
- Persistent runners that keep state and credentials between jobs
- Using floating tags for third-party pipeline plugins
- Treating the pipeline configuration as less important than application code

```quiz
Q: What is the main advantage of OIDC workload identity in a pipeline?
- It makes builds faster
+ Jobs receive short-lived credentials, so no long-lived secret needs to be stored
- It replaces code review
- It encrypts the source
> Short-lived federated credentials limit what a leak can do.

Q: Why use ephemeral build runners?
- They cost less
+ Nothing persists between jobs, so one compromised job cannot affect later ones
- They run tests faster
- They avoid caching
> Fresh runners remove leftover credentials and malware.

Q: A secret was printed in a public pipeline log. What is the first action?
- Delete the log
+ Revoke or rotate the secret immediately
- Wait for an alert
- Restart the runner
> Assume it is compromised; revoke first, then investigate.

Q: Why pin third-party pipeline plugins to a version or digest?
+ A floating tag can be moved to malicious code
- Pinned plugins run faster
- Plugins cannot be updated otherwise
- It is required by YAML
> Pins make changes deliberate and reviewable.
```

```cards
What is supply-chain risk? :: Compromise through the code, dependencies, tools or pipeline you consume
Why lock files and hashes? :: So installs are exactly what you reviewed and tampering is detected
What should the deploy role be able to do? :: Only update the specific workloads it deploys
First step after a leaked secret? :: Revoke or rotate it, then check audit logs for misuse
```
