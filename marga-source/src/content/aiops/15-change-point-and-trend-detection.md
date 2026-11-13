---
title: Change-point and trend detection
minutes: 13
summary: Find the moment a metric's behaviour shifted and tell a lasting level change from a spike, using CUSUM and simple trend tests that explain what happened and when.
---

A spike comes and goes. A change point is different: after it, the metric lives at a new level, with a new slope or a new spread. A memory leak, a cache that stopped working and a slower dependency all show up this way. Telling the two apart, and finding when the shift began, is one of the most useful things an operations model can do.

## What you will learn

- The difference between a spike, a level shift and a trend
- How CUSUM accumulates small deviations into a clear signal
- How to find the start time of a shift for correlation with changes
- How to detect a slow leak before it becomes an outage

## Spike, shift and trend

A spike is a short excursion that returns to normal. A level shift is a step: latency moves from 120 ms to 180 ms and stays there. A trend is a steady slope, such as memory growing 40 MB an hour. Each needs a different response. Spikes are often noise. Shifts point at a change. Trends give you time to act before a limit is reached.

## CUSUM

The cumulative sum method adds up how far each point is above a target, minus a small allowance. Normal noise cancels out and the sum stays near zero. A persistent small shift keeps adding in the same direction, and the sum climbs until it crosses a threshold. It detects shifts much smaller than a per-point threshold would, and it keeps sensitivity high without firing on single spikes.

```python
def cusum(series, target, slack, limit):
    pos = neg = 0.0
    start = None
    for i, x in enumerate(series):
        pos = max(0.0, pos + (x - target - slack))
        neg = max(0.0, neg + (target - x - slack))
        if pos == 0.0 and neg == 0.0:
            start = None
        elif start is None:
            start = i
        if pos > limit or neg > limit:
            return i, start
    return None, None

latency = [120] * 30 + [135] * 20
alarm_at, began_at = cusum(latency, target=120, slack=3, limit=60)
print(alarm_at, began_at)
```

The detector alarms a few points after the step and also reports where the accumulation began, which is the best estimate of when the change happened. That start time is what you compare with your deploy log.

## Estimating when it began

Knowing the change started at 14:03 turns a vague complaint into a question you can answer: what changed at 14:03? Report the estimated start rather than only the alarm time, because the alarm always lags. Allow a margin of a few minutes on either side when you search the change log.

## Trends and time to limit

For a leak, fit a line to the recent window and extrapolate to the limit. If memory grows 40 MB an hour and 3.2 GB remain, you have about 80 hours. A robust fit such as the Theil-Sen slope, which takes the median of pairwise slopes, resists outliers. Alert on a short time to limit, not on the level itself, so people are told when the problem matters.

## Pitfalls

Seasonality looks like a repeating shift, so remove it first. Restarts reset leaks and hide the trend, so detect over a window that spans them or look at growth between restarts. Missing data can look like a step down, so treat gaps explicitly.

```diagram
title: From a metric to a change time
node: m | Metric stream | 0 | 1 | A latency or memory series. | Gaps and restarts look like shifts. | store
node: clean | Remove seasonality | 1 | 1 | Subtract the daily and weekly pattern. | A repeating pattern is mistaken for repeated shifts. | process
node: cusum | CUSUM | 2 | 0 | Accumulates small deviations to detect a lasting shift. | Slack set too low fires on noise. | process
node: trend | Trend fit | 2 | 2 | A robust slope and a time to limit. | A restart resets the slope and hides a leak. | process
node: when | Estimated start | 3 | 1 | The time the change began, not when the alarm fired. | Searching the change log only at alarm time. | observe
edge: m | clean
edge: clean | cusum
edge: clean | trend
edge: cusum | when
edge: trend | when
```

## Incident: A leak the dashboards forgave

> **Incident:** An API service was restarted by the platform every few days and nobody asked why, until a restart failed during a busy period.

```console
$ memtrend --service api --window 72h
slope: +38 MB/hour (Theil-Sen)
limit: 4096 MB  current: 1180 MB
time to limit: about 76 hours
(this is a simulated illustration, not a real incident)
```

The memory graph looked bounded because restarts kept resetting it. A trend fit over the span between restarts showed the steady climb, and a heap profile found a cache that never evicted entries. The team fixed the cache and alerted on time to limit instead of the raw level.

## Common mistakes

- Treating every spike as a change
- Reporting the alarm time instead of the estimated start
- Fitting a trend across restarts
- Leaving seasonality in the data
- Alerting on level instead of time to limit

```quiz
Q: What separates a change point from a spike?
+ After a change point the metric stays at a new level or slope
- It is larger :: Size is not the difference.
- It happens at night :: Time of day is irrelevant.
- It is always an error :: Not always.
> A spike returns to normal. A shift does not.

Q: Why is CUSUM good at small shifts?
+ It accumulates small deviations until they add up to a signal
- It ignores noise completely :: It still sees noise but cancels it.
- It uses a very large window :: Not the mechanism.
- It predicts the cause :: It detects only.
> Persistent small deviations keep adding in one direction.

Q: Why report the estimated start of a shift?
+ It lets you search the change log around the real time
- It makes the alert louder :: Not the purpose.
- It replaces the alarm :: Both are useful.
- It reduces storage :: Unrelated.
> The alarm lags the change, so the start time points at what changed.

Q: How should a slow memory leak be alerted?
+ On projected time to the limit
- On any value above 50 percent :: Level alone is not urgent.
- On every restart :: Too noisy.
- On the first spike :: Not a trend.
> A short time to limit tells people when action is needed.
```

```cards
Change point :: A time after which a metric behaves differently
CUSUM :: A cumulative sum method that detects small lasting shifts
Trend :: A steady slope in a metric over time
Time to limit :: Projected time before a metric reaches a capacity or quota
Theil-Sen slope :: A robust slope taken as the median of pairwise slopes
```
