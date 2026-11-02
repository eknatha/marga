---
title: Anomaly detection on metrics
minutes: 14
summary: Learn simple baselines, seasonality and thresholds before reaching for complex models, and how to keep false alarms low.
---

Fixed thresholds fail when normal changes by the hour: a CPU of 70 percent is fine at noon and alarming at 4am. Anomaly detection learns what normal looks like and flags departures. The simplest methods work better than most people expect, and they are easy to explain, which matters when a human must trust the alert at night.

## What you will learn

- Compare static thresholds with learned baselines
- Explain seasonality and why it matters
- Apply a rolling mean and standard deviation, and a seasonal baseline
- Reduce false alarms with duration, smoothing and context

## Why static thresholds struggle

A single limit ignores daily and weekly rhythm. Set it low and it fires every busy hour. Set it high and it misses a quiet-hour fault. Teams then keep adjusting it, or give up and ignore it. A learned baseline moves with the pattern.

## Rolling baselines

Compute the average and spread of a metric over a recent window, then flag values many spreads away. This z-score approach is cheap and easy to explain. It copes poorly with strong daily patterns, because last hour is not a good guide to this hour.

## Seasonality

Compare the metric with the same time on previous days or weeks. A Monday 9am value is judged against other Monday 9am values. This single idea removes most false alarms for traffic-like metrics. Add known events, such as launches and holidays, as context.

## Cut false alarms

Require the anomaly to last for several minutes, smooth spikes with a median, set a minimum size so tiny absolute changes are ignored, and alert on symptoms users feel, not every internal metric. Review each alert after the fact: fix the rule or delete it.

## When to use models

If simple seasonal baselines are not enough, forecasting models or isolation forests can help with many series at once. Start simple, compare the complex approach on past incidents, and keep it only if it finds real problems earlier without adding noise.

## A seasonal baseline in PromQL

```promql
# Requests per second now, compared with the same time last week
(
  sum(rate(http_requests_total{job="checkout"}[5m]))
  /
  sum(rate(http_requests_total{job="checkout"}[5m] offset 1w))
)
# Alert when traffic falls below 60 percent of last week for 10 minutes
# (sum(rate(http_requests_total{job="checkout"}[5m]))
#   / sum(rate(http_requests_total{job="checkout"}[5m] offset 1w))) < 0.6
```

Comparing with the same time last week removes the daily pattern. Pair it with a minimum traffic floor so a quiet hour does not create false alarms.

## How it fails

A model is trained on an unusual period. A launch or holiday looks like an attack. Alerts fire on tiny changes in low-traffic services. Nobody reviews the detector, so false alarms pile up until it is ignored.

## Incident: The Monday that looked like an outage

> **Incident:** A detector compared each hour with the previous hour. Every Monday morning, when traffic rose sharply, it raised a high-severity alert. On-call engineers learned to ignore Monday alerts, and one Monday a real fault was missed.

```console
$ detector explain --alert 4412
metric: checkout_requests  value: 1840/s
compared with: previous hour mean 620/s (z = 6.2)
seasonal expectation (same hour, last 4 Mondays): 1790/s (z = 0.3)
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Comparing with the same hour on previous Mondays would have shown normal behaviour. Showing both comparisons also made the alert explainable.

## Interview question

"How would you alert on traffic anomalies?" Compare with a seasonal baseline from the same time on earlier weeks, require the shift to last, ignore tiny absolute values, and review false alarms until the rule is quiet.

## Common mistakes

- Comparing with the previous hour only
- Alerting on a single data point
- Ignoring holidays and launches
- Never reviewing past alerts

```quiz
Q: Why do static thresholds often fail?
+ Normal values change with time of day and week
- Metrics never change :: They do change.
- Thresholds are too accurate :: They are not.
- Servers ignore limits :: Unrelated.
> Correct: Normal values change with time of day and week. Re-read the matching lesson section for the full reasoning.

Q: What does a seasonal baseline compare with?
+ The same time on earlier days or weeks
- A random value :: Not a baseline.
- The previous second :: Misses patterns.
- The server name :: Irrelevant.
> Correct: The same time on earlier days or weeks. Re-read the matching lesson section for the full reasoning.

Q: Which reduces false alarms?
+ Requiring the anomaly to last for several minutes
- Alerting on one sample :: Noisy.
- Lowering every threshold :: Creates more alarms.
- Deleting dashboards :: Does not help.
> Correct: Requiring the anomaly to last for several minutes. Re-read the matching lesson section for the full reasoning.

Q: What should you try before complex models?
+ Simple rolling and seasonal baselines
- Deep learning only :: Often unnecessary.
- No baseline at all :: Leaves you with thresholds.
- Random sampling :: Not a method.
> Correct: Simple rolling and seasonal baselines. Re-read the matching lesson section for the full reasoning.
```

```cards
seasonality :: regular patterns by hour, day or week
z-score :: distance from the average in units of spread
baseline :: what normal looks like for a metric
alert duration :: how long a condition must hold before alerting
```
