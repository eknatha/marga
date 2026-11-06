---
title: Progressive delivery with Argo Rollouts
minutes: 13
summary: Release gradually with Argo Rollouts canary and blue-green strategies, automated analysis and quick aborts when metrics go bad.
---

A rolling update checks readiness, not user experience. Progressive delivery adds real traffic shifting and metric analysis, so you can release often with less fear.

## What you will learn

- Canary and blue-green strategies
- Defining steps, weights and pauses
- Automated analysis against metrics
- Aborting and promoting

## A canary rollout

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: web
spec:
  replicas: 6
  selector:
    matchLabels: {app: web}
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {duration: 5m}
        - analysis:
            templates:
              - templateName: error-rate
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 100
  template:
    metadata:
      labels: {app: web}
    spec:
      containers:
        - name: web
          image: registry.example.com/shop/web:1.9.0
```

The canary receives a small share, then more if checks pass. A traffic router such as an ingress controller or mesh gives accurate percentages, otherwise weights follow pod counts.

## Analysis

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: error-rate
spec:
  metrics:
    - name: error-rate
      interval: 1m
      count: 5
      failureLimit: 1
      successCondition: result[0] < 0.02
      provider:
        prometheus:
          address: http://prometheus.monitoring:9090
          query: sum(rate(http_requests_total{app="web",code=~"5.."}[2m])) / sum(rate(http_requests_total{app="web"}[2m]))
```

If the metric breaches the condition, the rollout **aborts** and traffic returns to the stable version.

## Operate

```bash
kubectl argo rollouts get rollout web --watch
kubectl argo rollouts promote web
kubectl argo rollouts abort web
```

**Blue-green** keeps the full old version running and switches all traffic at once after checks, which uses double resources but allows instant rollback. Use Argo CD to sync the Rollout from Git, and keep database changes backward compatible, because traffic may run both versions.

## Incident: The canary that stopped itself

> **Incident:** A release with a bug was aborted automatically at 10 percent.

```console
step 3/6 analysis: error-rate = 0.061
successCondition result[0] < 0.02 failed
Rollout aborted: canary scaled to 0, stable at 100%
```

A change introduced a bug that affected one payment path. The analysis caught the error rate within five minutes, and only a tenth of traffic was affected. The team fixed the bug, added a test and kept the same analysis for every release.

## Common mistakes

- Canary with no automated analysis
- Weights that follow pod counts without a traffic router
- Database changes that break the old version
- Pause durations too short to see problems

```quiz
Q: What does Argo Rollouts replace?
+ The Deployment object
- The Service :: No.
- The Namespace :: No.
- The Node :: No.
> A Rollout defines the strategy.

Q: What does analysis do?
+ Checks metrics to decide to continue or abort
- Builds images :: No.
- Creates volumes :: No.
- Edits DNS :: No.
> It automates go and no-go.

Q: What is blue-green?
+ Switch traffic between two full versions
- Gradually shift weights :: No.
- Delete the old pods first :: No.
- Use one pod :: No.
> Instant switch and rollback.

Q: Why keep schema changes compatible?
+ Both versions may run at once
- To save disk :: No.
- To avoid backups :: No.
- To hide errors :: No.
> Rollback needs it. The lesson section above explains why.
```

```cards
Canary :: Release to a small share of traffic first
Blue-green :: Two full environments with a traffic switch
AnalysisTemplate :: Metric checks that decide a rollout
Abort :: Stop the rollout and return to stable
```
