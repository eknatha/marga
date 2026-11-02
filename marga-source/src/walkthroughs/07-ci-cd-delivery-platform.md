# A CI/CD platform that ships many services
level: Intermediate
modules: cicd, security, docker
lessons: cicd/pipeline-fundamentals, cicd/deployment-strategies, cicd/pipeline-security
summary: How code moves from a commit to production through build, test, scan, an artifact store and a gradual rollout, with the places where it can fail.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Build and test every change within minutes
- Produce one trusted artifact per commit and promote the same artifact through environments
- Deploy gradually and roll back quickly
- Keep secrets and signing keys away from untrusted code

## The big picture

```diagram
title: CI/CD platform reference design
node: dev | Developer | 0 | 1 | Pushes a change and opens a review. | A change that skips review can reach production.
node: vcs | Source repository | 1 | 1 | Stores code and triggers the pipeline on a push or a merge. | If webhooks are lost, builds silently do not start.
node: runner | Build runners | 2 | 0 | Short-lived workers that run build and test steps in clean environments. | A shared runner with leftover state makes builds depend on earlier jobs.
node: scan | Test and scan stage | 2 | 1 | Unit tests, linting, dependency and image scanning. | Flaky tests teach people to ignore red builds.
node: reg | Artifact registry | 3 | 0 | Holds versioned images and packages, with signatures. | If tags can be overwritten, the artifact you tested is not the one you ship.
node: deploy | Deploy controller | 3 | 1 | Rolls the chosen version out to environments in stages. | A controller with broad rights is a high-value target.
node: prod | Production | 4 | 1 | Runs the service and reports health. | Without health signals a bad release spreads before anyone notices.
node: obs | Health signals | 4 | 2 | Error rate and latency used to continue or stop a rollout. | Missing signals turn a canary into a blind guess.
edge: dev | vcs
edge: vcs | runner
edge: runner | scan
edge: scan | reg
edge: reg | deploy
edge: deploy | prod
edge: prod | obs
edge: obs | deploy
```

## A change, step by step

1. A developer opens a pull request. The pipeline builds the code in a clean runner and runs fast tests.
2. A second reviewer approves. The merge triggers a full build, which runs slower tests and scans the code and its dependencies.
3. The build produces one image tagged with the commit identifier and pushes it to the registry. The image is signed.
4. The deploy controller releases that exact image to a test environment, then to a small share of production traffic (a canary).
5. It compares error rate and latency of the canary with the old version. If they stay healthy, it widens the rollout in steps.
6. If a signal crosses its limit, the controller stops and returns traffic to the previous version, which is still running.

## Why the design looks like this

- **One artifact, promoted** means that what passed the tests is exactly what runs in production. Rebuilding for each environment breaks that promise.
- **Ephemeral runners** start clean for every job, so a build cannot depend on leftovers and a compromised job cannot keep a foothold.
- **Immutable, signed tags** let you answer the question "what is running and who built it" with certainty.
- A **gradual rollout driven by signals** limits the number of users who meet a bad release.
- Keeping the **previous version running** during a rollout makes rollback a traffic change, not a rebuild.

## Scaling decisions

1. Start with one pipeline that builds, tests and deploys to one environment. Measure how long it takes.
2. Cache dependencies and split tests across workers when builds pass ten minutes.
3. Add scanning and signing as soon as more than one team uses the registry.
4. Add canary or blue-green rollout once a bad release would hurt many users.
5. Give teams a shared pipeline template so fixes and security changes reach everyone at once.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Flaky tests | Builds fail at random and people re-run until green | Quarantine flaky tests, track their rate, fix or delete them |
| Poisoned dependency | Malicious code enters through a package | Pin versions, verify checksums, scan, use a private mirror |
| Leaked secret in a log | A token is visible to everyone with read access | Mask secrets, short-lived credentials, rotate on any leak |
| Registry outage | No new deploys and no scale-up that pulls images | Mirror critical images, keep the last good images cached on nodes |
| Bad release passes tests | Users see errors that tests did not cover | Canary with automatic rollback on real signals |
| Runner queue backlog | Developers wait an hour for a build | Autoscale runners, set per-team limits, watch queue time |

## Trade-offs

- More checks make releases safer but slower. Decide which checks must block and which can run after the merge.
- A single shared pipeline is easy to secure and update, but teams lose freedom. Templates with a few allowed overrides are a middle path.
- Progressive delivery needs good signals. Without them, a plain rolling update and a fast rollback are more honest.

```predict
Q: The tests passed, but after rollout to 5 percent of users the error rate doubled. What should the platform do, and why can it?
???
It should stop the rollout and send traffic back to the previous version automatically. It can because the old version is still running and the rollout is judged by real signals, not only by test results.
> Tests cover what you thought of. Production signals cover what you did not.
```
