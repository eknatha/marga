---
title: Multivariate and service-level anomalies
minutes: 14
summary: Look at several signals together, from error rate and latency to saturation across a fleet, using peer comparison, ratios and simple multivariate scores, while keeping results explainable.
---

One metric at a time misses problems that only show in combination, and it floods you when a hundred hosts each have their own graph. Moving up a level, to a service or a fleet, gives fewer and more meaningful signals.

## What you will learn

- Compare an instance with its peers instead of with its own history
- Combine signals into service-level health with ratios and the golden signals
- Use an isolation forest on a small set of features
- Keep multivariate results explainable

## Peers beat history for fleets

If 40 identical pods serve the same traffic, any pod that differs from the other 39 is suspicious, whatever its own history says. Peer comparison needs no training and survives deploys and traffic changes that would break a per-pod baseline. Compute the median and MAD across pods at each moment and flag the ones far from it.

## Ratios and rates

A raw count rises with traffic. Ratios cancel it out: errors divided by requests, cache misses divided by lookups, retries divided by calls. A ratio that jumps while traffic is flat or falling is a stronger signal than any count.

## Golden signals as one view

For each service, combine latency, traffic, errors and saturation. A service is healthy when all four are in range. The pattern matters: rising latency with flat traffic and rising saturation suggests a resource limit, while rising errors with normal latency suggests a failing dependency or bad deploy. Writing these patterns as rules gives you explainable hints without any model.

## Isolation forest

An isolation forest builds random decision trees and measures how few splits are needed to isolate a point. Unusual points need fewer. It works on several features at once, needs no labels and trains quickly. Use a handful of well-chosen features per service, such as error ratio, p95 latency, CPU and queue depth, scaled to comparable ranges.

```python
import statistics as st

def peer_outliers(values, k=4.0):
    """values: {instance: metric}. Flag instances far from the fleet median."""
    med = st.median(values.values())
    mad = st.median([abs(v - med) for v in values.values()]) or 1e-9
    return {n: round(0.6745 * (v - med) / mad, 1)
            for n, v in values.items()
            if abs(0.6745 * (v - med) / mad) > k}

p99 = {f"pod-{i}": 210 + (i % 5) * 6 for i in range(1, 12)}
p99["pod-12"] = 1480
print(peer_outliers(p99))
```

Only `pod-12` is flagged, with a high score, while the normal pods vary within a narrow band. The same function works for any per-instance metric.

## Keeping it explainable

A score of 0.91 tells a responder nothing. Report which features contributed most and by how much compared with the peers: "pod-12: p99 latency 7 times the fleet median, error ratio normal, CPU normal". If you use a model, pair it with a plain-language summary and the underlying graphs. When people cannot see why a flag was raised, they stop trusting it.

## Choosing features carefully

Too many features, or features that always move together, give noisy scores. Pick signals that describe different failure modes and check them against past incidents. Remove any feature that never mattered.

```diagram
title: From per-instance noise to a service-level signal
node: inst | Instance metrics | 0 | 1 | Hundreds of per-pod and per-host series. | Alerting on each one separately. | store
node: peer | Peer comparison | 1 | 0 | Compare each instance with the fleet median. | Peers that are not truly identical. | process
node: ratio | Ratios | 1 | 2 | Errors per request, retries per call. | Dividing by tiny traffic. | process
node: gold | Golden signals | 2 | 1 | Latency, traffic, errors, saturation per service. | A missing signal hides a failure mode. | observe
node: forest | Isolation forest | 3 | 0 | Scores unusual feature combinations. | Features that always move together. | service
node: why | Explanation | 3 | 2 | Which features and how far from normal. | A bare score no one can check. | external
edge: inst | peer
edge: inst | ratio
edge: peer | gold
edge: ratio | gold
edge: gold | forest
edge: gold | why
edge: forest | why
```

## Incident: One bad pod in twelve

> **Incident:** Overall latency looked fine, yet one customer in twelve saw slow responses for two days.

```console
$ peercheck --service api --metric p99_ms
fleet median: 222  MAD: 6
outliers (modified z > 4): pod-12 (1480 ms, z=141)
(this is a simulated illustration, not a real incident)
```

The service average hid a single pod with a failing network interface. A per-pod baseline had never fired because the pod's history was always the bad one after a recent restart. Peer comparison flagged it at once, and the pod was replaced.

## Common mistakes

- Alerting on each instance's own history in a fleet
- Using raw counts instead of ratios
- Feeding many correlated features to a model
- Reporting a score without the contributing features
- Treating peers as identical when they are not

```quiz
Q: Why compare an instance with its peers?
+ It needs no history and survives deploys and traffic changes
- Peers are always correct :: A peer can be bad too.
- It uses more storage :: Not the reason.
- It replaces SLOs :: Different tool.
> Identical instances should behave alike at the same moment.

Q: Why prefer ratios to counts?
+ They cancel the effect of traffic volume
- They are always larger :: Not the reason.
- They need no data :: They need two series.
- They hide errors :: They expose them.
> A jump in a ratio with flat traffic is a strong signal.

Q: What is an isolation forest good for?
+ Finding unusual combinations of several features without labels
- Explaining root cause :: It scores only.
- Measuring percentiles :: Unrelated.
- Replacing monitoring :: It adds to it.
> Unusual points are isolated with few random splits.

Q: What should an explainable multivariate result show?
+ Which features differ and by how much from normal
- Only a score :: Not checkable.
- The model name :: Not useful.
- A random sample :: Not an explanation.
> People trust flags they can check.
```

```cards
Peer comparison :: Judging an instance against identical instances right now
Ratio metric :: One count divided by another so traffic cancels out
Golden signals :: Latency, traffic, errors and saturation
Isolation forest :: A model that scores points by how easily they are isolated
Feature :: One measured input to a model
```
