---
title: Forecasting capacity and saturation
minutes: 12
summary: Forecast disk, memory and traffic growth with simple trend and seasonality models and alert before you run out.
---

Capacity incidents are predictable because resources grow in patterns. A little forecasting turns surprises into planned work, and you do not need machine learning for the first big wins.

## What you will learn

- Time to full as a better alert than percent used
- Trend and seasonality in operational metrics
- Forecasting traffic and events you know about
- Measuring forecast error and avoiding false confidence

## Time to full

```promql
# will this disk fill within 7 days, based on the last 6 hours of growth?
predict_linear(node_filesystem_avail_bytes{mountpoint="/data"}[6h], 7 * 24 * 3600) < 0
```

Alerting on `> 85 percent` fires for slow, harmless usage and misses fast growth. Alerting on **time to full** adapts to the actual rate.

## Trend and seasonality

Most traffic has daily and weekly cycles. A simple approach is to compare with the same hour last week and to fit a trend on the weekly average.

```python
import numpy as np
weeks = np.array([410, 428, 445, 470, 492, 515])      # weekly peak requests/s
slope, intercept = np.polyfit(range(len(weeks)), weeks, 1)
print("next 8 weeks:", [round(slope * (len(weeks) + i) + intercept) for i in range(1, 9)])
```

## Known events

Add launches, campaigns and holidays as separate adjustments rather than letting the model treat them as noise. Ask product teams for upcoming events each quarter.

## Check the forecast

Record each forecast and compare with what happened. If error is large, widen the safety margin or use a different method. Show a range, not one number, and review the main forecasts with the owners. Plan lead times: ordering hardware or raising a cloud quota can take longer than the forecast horizon.

## Incident: Seventy percent and nine days left

> **Incident:** A disk looked healthy but was growing quickly.

```console
/data  70% used  (1.4 TB free)
growth: 38 GB/day over the last 6h
predicted full in 9.1 days
```

A fixed percentage threshold said everything was fine. The forecast alert warned a week ahead, and the team added retention for a runaway log table before the weekend.

## Common mistakes

- Alerting only on percent used
- Ignoring seasonality and known events
- Forecasts with no error tracking
- Forecast horizons shorter than procurement lead time

```quiz
Q: Why alert on time to full?
+ It adapts to the growth rate
- It is always shorter :: No.
- It hides trends :: No.
- It avoids metrics :: No.
> Rate matters more than level.

Q: What does predict_linear do?
+ Extrapolates a trend
- Deletes data :: No.
- Compresses disks :: No.
- Renames series :: No.
> It fits a line. The lesson section above explains why.

Q: How treat a planned launch?
+ Add it as a known adjustment
- Ignore it :: No.
- Treat as noise :: No.
- Disable alerts :: No.
> Known events change demand.

Q: What check keeps forecasts honest?
+ Compare with actuals
- Trust the model :: No.
- Remove history :: No.
- Hide error :: No.
> Measure forecast error.
```

```cards
Time to full :: Predicted time until a resource is exhausted
Seasonality :: Repeating patterns by hour, day or week
Saturation :: How full a resource is
Lead time :: Time needed to add capacity
```
