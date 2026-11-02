## What is the difference between continuous integration, continuous delivery and continuous deployment?
level: junior
Continuous integration merges and tests changes frequently with an automated build. Continuous delivery keeps every change in a releasable state, with a manual approval to production. Continuous deployment removes that approval and releases every passing change automatically. The difference is how much human decision remains before production.

## What stages would a good pipeline have?
level: junior
Lint and static checks, unit tests, build the artifact once, integration tests, security scans (dependencies, image, configuration), publish the artifact, deploy to staging, run smoke tests, then promote the same artifact to production with approval or automatic checks, and verify after release. Order stages from cheapest to most expensive so failures arrive fast.

## Explain blue-green, rolling and canary deployments.
level: mid
Rolling replaces instances gradually, with no extra environment but a mix of versions during the rollout. Blue-green runs a full second environment and switches traffic at once, giving instant rollback at higher cost. Canary sends a small percentage of traffic to the new version and increases it as metrics stay healthy, limiting the blast radius. Choose by risk, cost and how well you can measure health.

## How do you handle secrets in a pipeline?
level: mid
Use the CI system's protected, masked variables or a secret manager, scoped to the jobs and branches that need them. Prefer short-lived credentials through OIDC federation over stored keys, never print secrets, run secret scanning on commits, and keep untrusted pull request builds away from production credentials. If a secret leaks, revoke it first and then investigate.

## What does build once, promote everywhere mean?
level: mid
The pipeline builds an immutable artifact one time and the same artifact moves through test, staging and production, with only configuration changing. This ensures what you tested is what you ship. Rebuilding per environment can introduce different dependencies or timestamps, which makes test results meaningless.

## A pipeline has become slow and flaky. What do you do?
level: mid
Measure where the time goes, then parallelise independent jobs, cache dependencies keyed on lock files, run fast tests first and move slow suites to scheduled runs with a representative subset on each change. For flaky tests, quarantine them with an owner and a deadline instead of auto-retrying, and fix causes such as shared state, timing and real network calls.

## How does a pull-based delivery tool like Argo CD differ from a pipeline that runs kubectl apply?
level: senior
With the pull model an agent in the cluster continuously compares the cluster to a desired state stored in a repository and reconciles differences, so drift is corrected and no pipeline needs cluster credentials. A push pipeline applies once and does not notice later changes. The pull approach gives better auditability and security, and rollbacks become reverting the declared state.

## How do you roll back safely, including database changes?
level: senior
Redeploying the previous artifact is the simplest rollback, so keep artifacts and configuration available. Database changes must be backward compatible using expand and contract: add new structures first, deploy code that handles both, migrate data, and remove old structures later. Destructive migrations should be separate, deliberate steps, and risky changes need feature flags so behaviour can be switched off without a deploy.
