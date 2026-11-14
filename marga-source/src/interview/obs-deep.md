## How do you avoid wrong rate results?
level: junior
Use rate only on counters, give it a range of at least four scrape intervals, and aggregate after taking the rate, not before. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## When do you use recording rules?
level: mid
For expensive queries used by many dashboards or alerts, such as sums by service. They cut load and keep alert expressions simple and fast. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you scale Prometheus?
level: mid
Shard by function, use remote write or Thanos or Mimir for long term storage and global query, and control cardinality before adding hardware. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## Explain multiwindow burn rate alerts.
level: senior
Page when the budget burns fast over a long and a short window together, for example 14.4 over one hour and five minutes, and ticket on slower burns. It is precise and resets quickly.

## How do you keep logs affordable?
level: mid
Use few stable labels, sample or drop noisy debug logs, set retention per stream and store in object storage with compression. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you manage observability as code?
level: mid
Keep dashboards, alert rules and collectors in version control, provision them automatically, test rules with promtool and review changes like code. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
