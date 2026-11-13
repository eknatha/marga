---
title: Hands-on anomaly detection: z-score, MAD and EWMA
minutes: 16
summary: Build three small detectors in Python, see where each one fails on spiky and seasonal data, and learn how to pick one by testing it against past incidents.
---

You do not need a platform to detect anomalies. Three short functions cover most useful cases, and writing them once teaches you what commercial tools are doing under the hood.

## What you will learn

- Write a z-score, a MAD and an EWMA detector
- See how a spike corrupts a z-score and why MAD resists it
- Add seasonality by comparing with the same hour on earlier days
- Replay past incidents against a detector before trusting it

## The z-score

The z-score says how many standard deviations a point is from the mean of a window. A value above 3 is unusual if the data is roughly bell-shaped. It is quick and easy to explain, but both the mean and the standard deviation are pulled by outliers, so a big spike inside the window makes the detector deaf to the next one.

## MAD, the robust version

Replace the mean with the median and the standard deviation with the median absolute deviation. A single extreme point barely moves either. The "modified z-score" scales the result so that 3.5 is a common cut-off.

## EWMA, a detector with memory

An exponentially weighted moving average gives recent points more weight. It reacts to a slow drift that a fixed window would miss, and it is cheap to update one point at a time, which suits streaming. The smoothing factor decides how fast it forgets.

```python
import statistics as st

def zscore(window, x):
    mu = st.fmean(window)
    sd = st.pstdev(window) or 1e-9
    return (x - mu) / sd

def modified_z(window, x):
    med = st.median(window)
    mad = st.median([abs(v - med) for v in window]) or 1e-9
    return 0.6745 * (x - med) / mad

def ewma_flags(series, alpha=0.3, k=3.0):
    mean, var, flags = series[0], 0.0, []
    for x in series[1:]:
        diff = x - mean
        flags.append(abs(diff) > k * (var ** 0.5) and var > 0)
        mean += alpha * diff
        var = (1 - alpha) * (var + alpha * diff * diff)
    return flags

cpu = [41, 43, 40, 42, 44, 41, 95, 42, 43, 41, 40, 88]
print(round(zscore(cpu[:-1], cpu[-1]), 1), round(modified_z(cpu[:-1], cpu[-1]), 1))
```

The 95 earlier in the window inflates the standard deviation, so the z-score for the final 88 comes out at about 2.7 and stays below the usual limit of 3. The modified z-score for the same point is about 31. That difference is the whole argument for robust statistics on spiky data.

## Adding seasonality

For traffic-like metrics, compare a point with the values at the same time on the previous days. Build the baseline from, say, the same hour on the last 7 days, then apply MAD to that small set. This removes most daily-cycle false alarms without a model.

## Test before you trust

Collect a few weeks of a metric and a list of real incidents with start times. Run each detector over the history and count three things: incidents caught, how early, and false alarms per week. A detector that catches everything but fires 40 times a week will be ignored. Tune the threshold and the minimum duration until the false alarms are tolerable, then keep the replay as a regression test.

```diagram
title: Choosing and testing a detector
node: data | Metric history | 0 | 1 | Weeks of the series plus a list of real incident times. | Too little history to see the weekly cycle. | store
node: z | Z-score | 1 | 0 | Mean and standard deviation of a window. | One spike widens the band and hides the next. | process
node: mad | MAD | 1 | 1 | Median based, resists outliers. | Scale can be zero on flat data. | process
node: ew | EWMA | 1 | 2 | Recent points weigh more, good for drift. | Slow smoothing hides a sudden jump. | process
node: replay | Replay on history | 2 | 1 | Score each detector against known incidents. | Tuning on the same incidents you test on. | service
node: pick | Chosen detector | 3 | 1 | The simplest one that meets recall and false alarm goals. | No owner, so it is never retuned. | observe
edge: data | z
edge: data | mad
edge: data | ew
edge: z | replay
edge: mad | replay
edge: ew | replay
edge: replay | pick
```

## Incident: The detector that went deaf

> **Incident:** A z-score detector on error rate stayed quiet through a real outage that began right after a smaller spike.

```console
$ python3 replay.py --metric errors --detector zscore --incident 2026-10-02T09:10
incident start: 09:10  first alert: none
window stddev at 09:10: 18.4 (normally 2.1)
(this is a simulated illustration, not a real incident)
```

A short spike at 09:02 had inflated the standard deviation almost ninefold, so the real outage looked normal. Switching to MAD with a 5 minute minimum duration caught the outage at 09:12, and the replay was added to the test suite.

## Common mistakes

- Using a z-score on spiky data
- Choosing a threshold by feel and never replaying history
- Tuning and testing on the same incidents
- Ignoring seasonality on traffic metrics
- Alerting on one point instead of a sustained change

```quiz
Q: Why does MAD resist outliers better than a standard deviation?
+ It is built on medians, which a single extreme value barely moves
- It ignores all large values :: It does not discard data.
- It uses a larger window :: Window size is separate.
- It needs less data :: Not the reason.
> The median changes little when one point is extreme, while the mean and standard deviation shift.

Q: What is EWMA good at?
+ Reacting to slow drift with cheap streaming updates
- Detecting seasonality automatically :: It does not model cycles.
- Removing noise entirely :: It only smooths.
- Finding root cause :: It detects change only.
> Recent points carry more weight, so a gradual move shows up.

Q: How do you know a detector is good enough?
+ Replay it on past incidents and count catches, lead time and false alarms
- Check that it uses a popular algorithm :: Popularity is not evidence.
- Run it once on live traffic :: No baseline to judge.
- Read its documentation :: Does not measure it.
> A replay shows the trade-off between missing incidents and waking people.

Q: Why test on incidents you did not tune on?
+ Tuning on the test set overstates how well it will do
- It is faster :: Not the reason.
- It uses less memory :: Not the reason.
- Vendors require it :: Not a rule.
> Keep some incidents aside as an honest check.
```

```cards
Z-score :: Distance from the window mean in standard deviations
Modified z-score :: A z-score built on the median and MAD
EWMA :: A moving average that weights recent points more
Replay test :: Running a detector over past data with known incidents
Minimum duration :: How long a condition must hold before it alerts
```
