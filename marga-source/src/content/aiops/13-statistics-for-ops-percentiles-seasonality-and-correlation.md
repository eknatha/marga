---
title: Statistics for ops: percentiles, seasonality and correlation
minutes: 14
summary: The small set of statistics every AIOps tool relies on: why averages mislead, how percentiles and distributions behave, what seasonality is, and why correlation is not cause.
---

Every AIOps feature, from anomaly detection to root-cause hints, is statistics wearing an operations badge. If you understand five ideas, you can judge any tool's output and catch it when it is wrong.

## What you will learn

- Why the average hides the users who suffer most
- How to read percentiles and what happens when you average them
- What seasonality, trend and noise are
- Why correlation between two graphs is weak evidence of cause
- How sample size and cardinality change what you can conclude

## Averages hide the tail

Latency is not bell-shaped. Most requests are fast and a few are very slow, so the distribution has a long right tail. The mean is pulled up by the tail but still describes nobody: half the users are faster, and the slowest are far worse. Use percentiles. The median (p50) is the typical request. The p95 and p99 show what the unlucky users see, and a system with many calls per page makes the tail common, because a page that makes 20 calls hits the p95 of at least one of them most of the time.

## Percentiles do not add up

You cannot average percentiles. If one server reports a p99 of 200 ms and another 800 ms, the fleet p99 is not 500 ms. To combine them you need the raw values or a histogram with shared buckets, then compute the percentile on the merged data. This is why Prometheus histograms and `histogram_quantile` matter, and why a dashboard that averages per-host p99 values is quietly wrong.

## Seasonality, trend and noise

A metric is usually three things added together. A **trend** is the slow drift, such as steady growth. **Seasonality** is the repeating pattern: daily peaks, weekday against weekend, month-end batch jobs. **Noise** is what is left. Anomaly detection works by removing the first two and asking whether the remainder is unusual. A detector that ignores seasonality pages you every Monday morning.

## Variance and robust measures

The standard deviation is itself dragged around by outliers, so one huge spike widens the band and hides the next spike. Robust measures such as the median and the median absolute deviation (MAD) are far less affected. When your data has spikes, which operations data nearly always does, prefer them.

## Correlation is not cause

Two lines that rise together might share a cause, one might cause the other, or the match might be chance. With thousands of metrics, some pairs will line up by luck. Treat correlation as a way to choose where to look, not as a conclusion. Time order helps: a cause comes before its effect. Better still, a change you made (a deploy, a flag) is evidence you can check by reversing it.

## Samples, cardinality and base rates

A rate computed from 10 requests is unstable. Flagging a 50 percent error rate on a service that served 4 requests is noise. Set a minimum volume before you alert. Also keep the base rate in mind: if real incidents are rare, even a detector that is 99 percent accurate produces mostly false alarms.

```promql
# p99 latency across the whole fleet, from shared histogram buckets
histogram_quantile(
  0.99,
  sum by (le) (rate(http_request_duration_seconds_bucket{service="checkout"}[5m]))
)
```

This merges the buckets from every pod first and then computes the percentile, which is the correct order. Averaging per-pod p99 values would not be.

```diagram
title: Splitting a metric into parts a detector can reason about
node: raw | Raw metric | 0 | 1 | Requests per second as measured. | Judging it as a single line hides structure. | store
node: trend | Trend | 1 | 0 | The slow drift, such as growth over weeks. | Mistaken for an anomaly when it is just growth. | process
node: season | Seasonality | 1 | 1 | Daily and weekly repeating patterns. | Ignored, so every busy hour pages someone. | process
node: noise | Remainder | 1 | 2 | What is left after removing trend and seasonality. | Spikes inflate the spread if you use the standard deviation. | process
node: det | Detector | 2 | 1 | Flags remainders that are unusually large. | A tiny sample makes the rate meaningless. | service
node: act | Alert or hint | 3 | 1 | A page, a ticket or a hint to an engineer. | Treated as proof of cause rather than a lead. | external
edge: raw | trend
edge: raw | season
edge: raw | noise
edge: trend | det
edge: season | det
edge: noise | det
edge: det | act
```

## Incident: The p99 that was an average

> **Incident:** A latency dashboard showed a healthy p99 of 320 ms while support received complaints about slow checkouts.

```console
$ promtool query instant http://prom:9090 'avg(p99_latency_ms{service="checkout"})'
{} => 320
$ promtool query instant http://prom:9090 'max(p99_latency_ms{service="checkout"})'
{} => 2900
(this is a simulated illustration, not a real incident)
```

The panel averaged the p99 of 12 pods. One pod had a bad disk and a p99 of 2.9 seconds, and eleven healthy pods diluted it. The team changed the panel to a merged-histogram percentile plus a per-pod maximum, and the slow pod showed at once.

## Common mistakes

- Averaging percentiles across hosts
- Using the mean for latency
- Reading a correlation as a cause
- Alerting on rates from tiny samples
- Using standard deviation on spiky data

```quiz
Q: Why is the mean a poor summary of latency?
+ The distribution has a long tail that the mean blurs
- Latency is always normally distributed :: It is not.
- Means cannot be computed on time series :: They can, but mislead.
- Percentiles are slower to compute :: Not the reason.
> A few very slow requests pull the mean up while most users are faster, so it describes nobody.

Q: How do you get a correct fleet-wide p99?
+ Merge histogram buckets and compute the percentile
- Average the per-host p99 values :: Percentiles do not average.
- Take the largest p50 :: Wrong statistic.
- Use the mean of p95 and p99 :: Meaningless.
> Percentiles must be computed on the combined data.

Q: What is seasonality?
+ A repeating pattern such as daily or weekly peaks
- A random spike :: That is noise.
- A permanent level shift :: That is a change point.
- Slow steady growth :: That is a trend.
> Detectors compare a value with the same point in the cycle.

Q: Two graphs rise together. What can you conclude?
+ They are worth investigating, but cause is unproven
- One causes the other :: Not shown.
- Both are broken :: No evidence.
- The graphs are wrong :: No evidence.
> Correlation points where to look. Time order and a reversible change give stronger evidence.
```

```cards
Percentile :: The value below which a given share of observations fall, such as p99
Seasonality :: A pattern that repeats at a fixed period, such as daily
MAD :: Median absolute deviation, a spread measure that outliers barely move
Base rate :: How common the real event is, which decides how many alerts are false
Cardinality :: The number of distinct label combinations a metric has
```
