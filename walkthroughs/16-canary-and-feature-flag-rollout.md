# A canary rollout and feature flag system
level: Intermediate
modules: cicd, sre, kubernetes
lessons: cicd/deployment-strategies, cicd/release-management-and-feature-flags, sre/change-management-and-releases
summary: How a team separates deploying code from releasing a feature, using canaries and flags, and uses signals to continue or stop automatically.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Ship code often without exposing every user to every change
- Turn a feature off in seconds without a deploy
- Compare a new version with the old one using real traffic
- Keep flags from piling up as hidden complexity

## The big picture

```diagram
title: Canary and feature flag reference design
node: dev | Developers | 0 | 1 | Merge small changes behind flags. | Large changes behind one flag are hard to test.
node: ci | Build and deploy | 1 | 1 | Builds the image and deploys it to a small group of pods. | Canary pods without enough traffic prove nothing.
node: router | Traffic router | 2 | 1 | Sends a small share of requests to the canary. | Sticky sessions can hide problems or double exposure.
node: canary | Canary version | 3 | 0 | New code running with real traffic. | Different config from stable makes the comparison unfair.
node: stable | Stable version | 3 | 2 | The current production code. | Scaling it down too early removes the rollback.
node: flags | Flag service | 2 | 0 | Decides per user or group whether a feature is on. | If the flag service is down, defaults decide what users see.
node: sig | Health signals | 4 | 1 | Error rate, latency and business metrics for each version. | Averages across versions hide a problem in the canary.
node: ctl | Rollout controller | 1 | 2 | Compares signals and moves the share up, holds or rolls back. | A controller without a manual stop is dangerous.
edge: dev | ci
edge: ci | canary
edge: router | canary
edge: router | stable
edge: flags | canary
edge: canary | sig
edge: stable | sig
edge: sig | ctl
edge: ctl | router
```

## A release, step by step

1. A developer merges a change behind a flag that is off. The code reaches production with no user-visible effect.
2. The new version starts as a canary with 5 percent of traffic. The controller compares its error rate and latency with the stable version over ten minutes.
3. If signals stay close, the controller moves to 25, 50 and 100 percent, pausing at each step.
4. Later, the team turns the flag on for internal users, then 1 percent of customers, then everyone.
5. If the feature misbehaves, someone switches the flag off. No deploy or rollback is needed.
6. After a stable period, the team removes the flag and the old code path.

## Why the design looks like this

- **Separating deploy from release** lets code ship early and be switched on when ready.
- **Comparing canary with stable** at the same time controls for traffic changes during the day.
- **Small steps** limit the number of users affected by any problem.
- **Flags with owners and expiry dates** keep the system from filling with dead switches.
- **Automatic rollback on signals** is faster than waiting for a person to notice.

## Scaling decisions

1. Begin with a rolling update and a quick rollback, then add one canary step.
2. Add dashboards that show canary and stable side by side.
3. Introduce a flag service for features that need a gradual or targeted release.
4. Automate the decision to continue or stop once the signals are trusted.
5. Review flags monthly and delete those that are fully on or off.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Canary too small | Not enough traffic to detect a problem | Choose a size and duration that give enough requests |
| Wrong signal | Errors rise only for a segment and the average looks fine | Break down by version and by key segments |
| Flag service outage | Features flip to the default unexpectedly | Safe defaults, local cache of last known values |
| Flag debt | Nobody knows what is on, tests multiply | Owners, expiry dates, regular cleanup |
| Schema change with the code | Rollback is impossible because the data changed | Expand and contract migrations, compatible with both versions |
| Sticky sessions | Users switch between versions and see odd behaviour | Keep a user on one version for the test period |

## Trade-offs

- Slow rollouts are safer and delay value. Choose the speed by the risk of the change.
- Flags make testing in production possible and make the code paths multiply. Remove them promptly.
- Automatic rollback needs trusted signals. Until then, a human stays in the loop.

```predict
Q: A new version's average error rate looks fine, but one customer segment fails every request. How could the rollout have caught it?
???
By comparing signals broken down by version and by important segments, not only the overall average, and by including the business metric for that segment.
> Averages hide small groups with big problems.
```
