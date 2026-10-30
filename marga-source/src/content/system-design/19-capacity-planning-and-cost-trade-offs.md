---
title: Capacity planning and cost trade-offs
minutes: 14
summary: Plan headroom from measurements, treat cost as a design input, and know which savings quietly spend reliability.
---

Capacity and cost are two views of one decision: how much to run, and how much margin to carry. Too little and a launch or a failure becomes an outage. Too much and the bill hides the problem. This lesson gives a working method to plan capacity from measured numbers and to make cost a visible trade-off in the design.

## What you will learn

- Plan capacity from load tests, peak factors and redundancy rules
- Account for N+1, zone loss and the cold-start problem
- Spot limits that are not CPU: threads, connections, quotas and rate limits
- Make cost trade-offs explicit and avoid hidden reliability cuts

## Measure, then plan

Capacity planning starts with measured throughput per unit at the SLO: load test one instance (or one cell) until latency or errors cross your target, and record the requests per second it handles at, say, 60 percent of that point. Then take the forecast peak (average times a peak factor, plus known events such as launches, sales and year-end), and divide. Add redundancy: N+1 so one instance can fail, and zone loss so the remaining zones carry the load. With three zones, losing one means the other two must carry 100 percent, so each can run at most about 66 percent of its capacity before the loss.

## Limits that are not CPU

Systems hit other ceilings first: thread counts, file descriptors, database connections, network packets per second, load balancer limits, API rate limits and cloud quotas, connection tracking tables, DNS query rates. Slack's outage on 4 January 2021 followed a surge that overloaded an AWS Transit Gateway; AWS Kinesis on 25 November 2020 failed when a small capacity addition pushed servers over an operating system thread limit; Toyota's plants stopped in August 2023 after a disk space error. List every limit on the request path and watch the distance to each. See the case files.

## Headroom and autoscaling

Autoscaling reacts in minutes; a spike arrives in seconds. New instances start cold (empty caches, no warmed connections, long image pulls). Keep headroom for the time it takes to scale, scale on leading signals (queue age, request rate) instead of CPU alone, set sensible minimums, and use limits and load shedding to hold the line meanwhile. Test scale-up under load, not only on paper. When Pokemon GO launched in 2016, traffic reached 50 times the initial target and ten times the worst case estimate; scaling worked because the design could add capacity horizontally and the provider could supply it, which is not something to assume of every dependency.

## Forecasting

Use growth trends and business events, and review monthly. Record the assumptions and compare forecast with actual to improve them. Keep a list of lead times: quota increases, hardware, committed spend, procurement. A forecast that is right but needs a six-week lead time is already late.

## Cost as a design input

Cost per request or per customer is a number to estimate in the design, as you estimate latency. The big levers are: right-sizing, using committed or discounted capacity for the steady base and on-demand for the peak, storage tiering and lifecycle rules, data transfer (cross-zone and cross-region traffic often costs more than compute), and retention of logs and metrics. Tag resources by team and service so the bill can be read.

## Savings that spend reliability

Some savings quietly cut resilience: one zone instead of three, no spare capacity, shorter retention that removes your ability to investigate, dropping a standby, removing the second DNS provider, skipping restore tests. These are legitimate choices only when stated: write the saving and the risk it takes, and have the owner of the SLO agree. A cheaper design that misses the SLO is not cheaper.

## Cost spikes are incidents too

A runaway job, a retry storm, a crypto-mining intrusion or an unbounded log can multiply the bill in hours. Set budgets and anomaly alerts, quotas per team, and limits on autoscaling maximums. Tesla's 2017 case, where attackers ran mining software in a cloud account, is a cost incident that began as a security one.

```predict
Q: Three zones, each running at 80 percent of capacity. One zone is lost. What happens to the other two, and what should the design have done?
???
They need to carry 120 percent of one zone's share each (3 zones at 80 percent is 240 percent total, spread over two zones is 120 percent each), so they overload. Run each zone at about 60 to 66 percent, or shed low priority load deliberately.
> Redundancy is only real if the survivors have the capacity.
```

## How it fails

A forecast made from average, not peak. A capacity test on a single component while the database is the limit. Autoscaling max set below the real need. A cost cut that removed the margin. A quota hit during a launch.

## Incident: The limit nobody listed

> **Incident:** A small capacity addition pushed every server over an operating system limit and the service failed for hours.

```console
$ cat /proc/sys/kernel/threads-max
62000
$ ps -eLf | wc -l
62113
```

The console output is a simulated illustration. In the real AWS Kinesis outage on 25 November 2020 each front-end server kept a thread for every other server, so adding servers pushed each one past the operating system's thread limit. The design response is a list of every limit on the path with an alert on the distance to each, and capacity changes that are tested and staged.

## Interview question

"How do you size a service for a launch?" Forecast peak with a margin, load test per unit at the SLO, add N+1 and zone-loss headroom, list non-CPU limits, plan scale-up time and cold start, and agree what is shed when demand exceeds the plan.

## Common mistakes

- Planning from averages
- Watching CPU only
- Running every zone near its limit
- Cost cuts with no recorded reliability trade

```quiz
Q: With three zones, why run each below about 66 percent?
+ So two zones can carry the load if one fails
- To save money :: It spends more.
- Because CPUs throttle :: Not the reason.
- To reduce latency only :: Not the reason.
> Correct: So two zones can carry the load if one fails. Re-read the matching lesson section for the full reasoning.

Q: Which of these is a non-CPU limit?
+ Thread count, connection tracking or an API quota
- Disk colour :: Not a thing.
- The number of dashboards :: Not a capacity limit.
- The team size :: Not a system limit.
> Correct: Thread count, connection tracking or an API quota. Re-read the matching lesson section for the full reasoning.

Q: What should be written down for a cost saving that reduces redundancy?
+ The saving, the risk it takes and who accepted it
- Only the saving :: Hides the trade.
- Nothing, it is internal :: The trade must be visible.
- Only the vendor name :: Not relevant.
> Correct: The saving, the risk it takes and who accepted it. Re-read the matching lesson section for the full reasoning.

Q: Why scale on leading signals such as queue age?
+ CPU rises after the problem has begun and new capacity starts cold
- It uses less memory :: Not the reason.
- It avoids all limits :: It does not.
- It removes headroom :: Headroom is still needed.
> Correct: CPU rises after the problem has begun and new capacity starts cold. Re-read the matching lesson section for the full reasoning.
```

```cards
headroom :: spare capacity kept for spikes and failures
N+1 :: one spare unit beyond need
zone-loss rule :: survivors must carry the lost zone
cold start :: new instances with empty caches
right-sizing :: matching resources to measured use
cost per request :: spend divided by requests served
```
