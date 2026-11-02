---
title: Change management, release engineering and progressive delivery
minutes: 15
summary: Make changes safe and boring with small batches, feature flags, canary analysis, automated rollback and error-budget-aware release policies.
---

Most incidents begin with a change: a deployment, a configuration edit, a new dependency version, a migration. The goal of release engineering is not to stop change, because change is how a business improves, but to make each change small, observable and reversible.

## What you will learn

- Why small, frequent changes are safer than rare large ones
- Feature flags and dark launches
- Canary releases with automated analysis and rollback
- Change windows, freezes and tying releases to the error budget

## Small batches

A release of one change has one suspect when something breaks. A release of two hundred changes has two hundred. Frequent small releases make failures easy to locate and easy to revert. This is why teams with strong delivery practices both deploy more often **and** have lower failure rates.

Track four delivery measures (the DORA metrics): **deployment frequency**, **lead time for changes**, **change failure rate** and **time to restore service**. Improving the first two should not worsen the last two, and if it does, the safety net needs work.

## Feature flags

A **feature flag** separates deploying code from releasing a feature. Code ships turned off, then is enabled gradually for a team, a percentage of users or a region, and can be switched off instantly without a deployment.

```python
def checkout(cart, user):
    if flags.enabled("new-payment-flow", user=user.id, default=False):
        return new_payment_flow(cart)
    return legacy_payment_flow(cart)
```

```yaml
flags:
  new-payment-flow:
    enabled: true
    rollout:
      percentage: 5
      allow: ["internal-staff"]
    owner: payments-team
    expires: 2025-09-30
```

Flags have costs: each one doubles the code paths to test. Give every flag an owner and an expiry date, and delete flags promptly after full rollout. Make sure the **default** is the safe behaviour when the flag service is unreachable.

## Canary and progressive delivery

A **canary** sends a small share of traffic to the new version and compares it with the stable version before continuing.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 10
  selector:
    matchLabels:
      app: shop-api
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: error-rate-and-latency
        - setWeight: 25
        - pause: { duration: 10m }
        - setWeight: 50
        - pause: { duration: 10m }
  template:
    metadata:
      labels:
        app: shop-api
    spec:
      containers:
        - name: api
          image: registry.example.com/shop/api:1.8.3
```

An analysis step queries your metrics, for example "5xx rate of the canary is not more than 1.2 times the baseline and p95 latency is under 400 ms". If the check fails, the rollout **aborts and reverts automatically**. This depends entirely on trustworthy metrics, so build the SLO dashboards first.

```console
$ kubectl argo rollouts get rollout shop-api -n shop --watch
$ kubectl argo rollouts abort shop-api -n shop
$ kubectl argo rollouts undo shop-api -n shop
```

## Database and configuration changes

Schema changes are the hardest to roll back. Use **expand and contract**: add new columns or tables first (compatible with old code), deploy the code that uses them, migrate the data, and only later remove the old structure. Never ship a migration and the code requiring it as one irreversible step. Treat configuration as code: reviewed, versioned, validated, and rolled out through the same pipeline and canary process.

## Change policy and the error budget

Tie release behaviour to your reliability data:

- While the SLO is met, ship freely
- When the error budget is nearly spent, slow down, reduce risk and prioritise reliability work
- When it is exhausted, freeze non-essential changes until it recovers

A freeze at peak business times (a sales event, month-end) is reasonable, but a freeze is a blunt tool. Prefer to make releases safer over making them rarer.

## Peer review and risk

Review proportionate to risk. A copy change needs less ceremony than a database migration. Ask of every risky change: What is the blast radius? How will we know it is wrong? How do we undo it, and how long does that take? Record the answers in the change description.

## Incident: the friday afternoon config change

> **Incident:** At 16:40 on Friday an engineer edits a timeout value in a shared configuration service for "a quick fix". It applies to every service at once. Within minutes, requests to the payment provider time out across the platform, and nobody can immediately say what changed.

No change record, no gradual rollout, no quick way to see recent changes:

```console
$ kubectl get events -A --sort-by=.lastTimestamp | tail -10
$ kubectl rollout history deployment/shop-api -n shop
$ curl -s https://config.example.com/api/audit?since=30m | jq -r '.[] | [.time,.user,.key,.old,.new] | @tsv'
```

The audit trail reveals the edit. Revert the value, which restores service, and then add safeguards: configuration changes go through the same review, canary and rollback tooling as code; recent changes are shown on every dashboard as annotations; and risky changes avoid Friday afternoons unless they are fixing an incident.

## Common mistakes

- Large, infrequent releases bundling many changes
- Feature flags with no owner or expiry
- Canaries judged by gut feeling instead of metrics
- Configuration changes that bypass all release controls
- Irreversible database migrations coupled to code deploys

```quiz
Q: Why are small frequent releases safer?
- They require less testing
+ Each change has fewer suspects and is easier to revert
- They avoid monitoring
- They reduce the team size
> Failures are quicker to locate and fix when changes are small.

Q: What does a feature flag separate?
+ Deploying code from releasing a feature to users
- Code from tests
- Staging from production
- Frontend from backend
> You can enable, limit or disable a feature without deploying.

Q: What should happen when canary analysis fails?
- Continue anyway
+ The rollout aborts and reverts automatically
- Wait a week
- The team votes
> Automated rollback limits user impact.

Q: What does the expand and contract pattern do?
- Compresses data
+ Makes schema changes compatible with old and new code so they can be rolled back
- Expands storage
- Adds replicas
> Add first, switch code, migrate data, remove the old structure later.
```

```cards
Name the DORA metrics :: Deployment frequency, lead time for changes, change failure rate, time to restore service
What belongs on every feature flag? :: An owner and an expiry date
What is a canary release? :: Sending a small share of traffic to a new version and comparing it with the stable one
How do you link releases to reliability? :: Slow or freeze changes as the error budget is spent
```
