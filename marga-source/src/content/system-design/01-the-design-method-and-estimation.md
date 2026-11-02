---
title: The design method and back-of-envelope estimation
minutes: 14
summary: A repeatable order for any design question: clarify, estimate, sketch, deep-dive, break it, then state the trade-offs.
---

System design is not drawing boxes. It is choosing which failure you can afford, and showing your reasoning. Strong designers follow the same order every time, so they never skip the step that would have exposed the flaw. This lesson gives that order and the arithmetic you need to size a system before you draw it.

## What you will learn

- Follow six steps: clarify, estimate, sketch, deep-dive, failure modes, trade-offs
- Turn users and behaviour into requests per second, storage and bandwidth
- Pick the numbers that decide the design, and ignore the rest
- Write down assumptions so a reviewer can challenge them

## The six steps

1. **Clarify.** Who uses it, what must never be wrong, what may be slow, and what is the SLO? A design for a payment ledger and a design for a like counter are different even if the diagrams match.
2. **Estimate.** Requests per second, data size, growth, read to write ratio.
3. **Sketch.** The smallest design that meets the numbers: clients, entry point, service, store.
4. **Deep-dive.** Pick the one or two parts that carry the risk (the data store, the queue) and design them properly.
5. **Failure modes.** For every box ask what happens when it is slow, down, wrong or overloaded.
6. **Trade-offs.** Say what you gave up. Every design gives something up; naming it is the skill.

## Estimation you can do in your head

Round hard. A day is about 100,000 seconds (86,400). So 1 million requests per day is about 10 per second. 100 million per day is about 1,000 per second.

| Quantity | Rule of thumb |
| --- | --- |
| Seconds per day | 86,400, call it 10^5 |
| Peak to average | 2x to 10x; use 3x unless you know better |
| One modern server | thousands of simple requests per second, hundreds for heavy ones |
| Memory read | around 100 nanoseconds |
| SSD random read | around 100 microseconds |
| Same-region network round trip | around 0.5 to 1 millisecond |
| Cross-continent round trip | 100 to 200 milliseconds |

Worked example: a service for 20 million daily users, each making 15 requests a day. That is 300 million requests a day, about 3,500 per second on average and about 10,000 per second at a 3x peak. Each response is 5 KB, so peak egress is about 50 MB per second, around 400 Mbit per second. Storage: if each user writes 1 KB a day, that is 20 GB a day, about 7 TB a year before replication. Three copies makes about 22 TB.

Those few lines already decide things: 10,000 per second needs several instances behind a balancer, not one; 22 TB a year does not fit one database node; the read to write ratio decides whether a cache pays.

## Which numbers decide the design

Not every figure matters. Look for the number that crosses a threshold: one node's capacity, one network link, one partition's write limit. The design changes where a limit is crossed. If peak is 10,000 per second and one database handles 20,000 writes per second, you do not need sharding yet. Say so, and note at what growth you will.

## Write assumptions down

"Assumed 3x peak, 5 KB responses, 99.9 percent of reads can be 60 seconds stale." Each assumption is a place where the design can be wrong. Reviewers can then attack the assumption instead of guessing at it. Several real outages began as an assumption nobody wrote down. Pokemon GO launched in 2016 to 50 times the planned traffic and ten times the worst case estimate; the lesson is not that estimates fail, but that the design needs headroom and a way to scale when they do.

```predict
Q: A service gets 50 million requests per day. Roughly how many per second on average, and what would you plan for at peak?
???
About 500 per second on average (50 million divided by roughly 100,000 seconds); plan for around 1,500 per second at a 3x peak, then check that against the capacity of each tier.
> Round to one significant figure. You are sizing, not billing.
```

## How it fails

Designs fail at the step skipped. Skip clarify and you build the wrong thing. Skip estimate and you build for the wrong size, either one node that melts or a sharded cluster nobody needs. Skip failure modes and the first outage writes them for you.

## Incident: The launch that was fifty times the plan

> **Incident:** A game launched worldwide and traffic reached 50 times the initial target within days.

```console
$ kubectl top nodes | sort -k3 -nr | head -3
gke-game-pool-7   7890m   98%   26Gi   91%
gke-game-pool-2   7810m   97%   25Gi   90%
gke-game-pool-9   7760m   97%   25Gi   88%
```

The output above is a simulated illustration. In the real launch, Niantic and Google Cloud added tens of thousands of cores to the Kubernetes backend during the first days. What saved them was a design that could scale horizontally and a vendor who could provide capacity; the estimate itself was wrong by a wide margin. Read the case file for the sourced timeline.

## Interview question

"Design a URL shortener for 100 million new links a month." Start by asking about read traffic, link lifetime and custom aliases. Estimate: 100 million a month is about 40 writes per second; reads are perhaps 100 times that, 4,000 per second, so caching matters far more than the write path.

## Common mistakes

- Drawing before asking what the SLO is
- Precise arithmetic on guessed inputs (use round numbers)
- Designing for the average instead of the peak
- Never saying what the design gives up

```quiz
Q: About how many seconds are in a day, for estimation?
+ About 100,000 (86,400)
- About 10,000 :: That is under three hours.
- About 1,000,000 :: That is nearly two weeks.
- About 3,600 :: That is one hour.
> Use 10^5 and divide.

Q: 100 million requests per day is roughly how many per second on average?
+ About 1,000
- About 100 :: Too low by ten.
- About 10,000 :: Too high by ten.
- About 100,000 :: Far too high.
> 10^8 divided by 10^5.

Q: What do you do after the sketch and before listing trade-offs?
+ Deep-dive the risky parts, then walk the failure modes
- Add more boxes :: More boxes add more failure points.
- Rewrite the requirements :: Requirements come first, not last.
- Choose a database brand :: A brand is not a design.
> Correct: Deep-dive the risky parts, then walk the failure modes. Re-read the matching lesson section for the full reasoning.

Q: Why write assumptions down?
+ So reviewers can challenge the exact input that could be wrong
- To lengthen the document :: Length is not the aim.
- To avoid estimating :: Estimates are still needed.
- Because a template requires it :: The reason is review.
> Correct: So reviewers can challenge the exact input that could be wrong. Re-read the matching lesson section for the full reasoning.
```

```cards
clarify :: ask what must never be wrong and the SLO
estimate :: requests per second, storage, bandwidth
peak factor :: plan for 3x average unless known
deep-dive :: design the risky part properly
failure modes :: slow, down, wrong, overloaded
trade-off :: what the design gives up
```
